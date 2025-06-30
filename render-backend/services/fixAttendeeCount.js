const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUniqueAttendees() {
  console.log('=== FIXING UNIQUE ATTENDEE COUNTS ===');
  
  try {
    // First, let's analyze the current situation
    const { data: analysis, error: analysisError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          COUNT(*) as total_webinars,
          COUNT(CASE WHEN total_attendees > 0 THEN 1 END) as webinars_with_attendees,
          COUNT(CASE WHEN total_registrants > 100 AND total_attendees < 10 THEN 1 END) as suspicious_webinars
        FROM zoom_webinars
        WHERE status = 'ended';
      `
    });

    if (!analysisError && analysis?.[0]) {
      console.log('Current state:', analysis[0]);
    }

    // Update all webinars with the correct unique attendee count
    console.log('Updating attendee counts...');
    
    const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        WITH unique_attendee_counts AS (
          SELECT 
            w.id as webinar_id,
            COUNT(DISTINCT COALESCE(p.email, p.participant_id, p.participant_user_id)) as unique_attendees,
            COUNT(*) as total_sessions
          FROM zoom_webinars w
          LEFT JOIN zoom_participants p ON p.webinar_id = w.id
          WHERE w.status = 'ended'
          GROUP BY w.id
        )
        UPDATE zoom_webinars w
        SET 
          total_attendees = COALESCE(uac.unique_attendees, 0),
          unique_participant_count = COALESCE(uac.unique_attendees, 0),
          actual_participant_count = COALESCE(uac.total_sessions, 0),
          total_absentees = GREATEST(0, w.total_registrants - COALESCE(uac.unique_attendees, 0)),
          updated_at = NOW()
        FROM unique_attendee_counts uac
        WHERE w.id = uac.webinar_id
          AND w.status = 'ended'
        RETURNING w.id, w.topic, w.total_attendees, w.unique_participant_count, w.total_registrants, w.total_absentees;
      `
    });

    if (updateError) {
      throw new Error(`Failed to update attendee counts: ${updateError.message}`);
    }

    const updatedCount = updateResult?.length || 0;
    console.log(`Updated ${updatedCount} webinars with correct unique attendee counts`);

    // Get some examples of the fixes
    const { data: examples, error: examplesError } = await supabase
      .from('zoom_webinars')
      .select('zoom_webinar_id, topic, total_attendees, unique_participant_count, total_registrants, total_absentees')
      .eq('status', 'ended')
      .gt('total_attendees', 0)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!examplesError && examples) {
      console.log('\nExample updates:');
      examples.forEach(w => {
        console.log(`- ${w.topic}: ${w.total_attendees} unique attendees (${w.total_registrants} registrants, ${w.total_absentees} absentees)`);
      });
    }

    return {
      success: true,
      updatedCount,
      examples
    };

  } catch (error) {
    console.error('Error fixing unique attendees:', error);
    throw error;
  }
}

// Function to resync webinars with proper attendee counting
async function resyncWebinarAttendees(webinarId, connectionId) {
  console.log(`\n=== RESYNCING WEBINAR ${webinarId} ===`);
  
  try {
    // Get webinar details
    const { data: webinar, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('zoom_webinar_id', webinarId)
      .eq('connection_id', connectionId)
      .single();

    if (webinarError || !webinar) {
      throw new Error(`Webinar not found: ${webinarId}`);
    }

    console.log(`Found webinar: ${webinar.topic}`);
    console.log(`Current attendees: ${webinar.total_attendees}, Registrants: ${webinar.total_registrants}`);

    // Get connection and credentials
    const { data: connection, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    const { data: credentials, error: credError } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', connection.user_id)
      .eq('is_active', true)
      .single();

    if (credError || !credentials) {
      throw new Error('Active credentials not found');
    }

    // Get access token
    const zoomService = require('./zoomService');
    let accessToken = connection.access_token;
    
    // Check if token needs refresh
    const tokenExpiresAt = new Date(connection.token_expires_at);
    if (tokenExpiresAt <= new Date()) {
      console.log('Token expired, refreshing...');
      const tokenData = await zoomService.getServerToServerToken(
        credentials.client_id,
        credentials.client_secret,
        credentials.account_id
      );
      accessToken = tokenData.access_token;
    }

    // Try to fetch participants using report API
    console.log('Fetching participants from Zoom Report API...');
    let allParticipants = [];
    let nextPageToken = '';
    let pageCount = 0;
    let useReportApi = true;

    try {
      do {
        const response = await zoomService.getWebinarParticipantsReport(
          webinar.zoom_webinar_id,
          accessToken,
          {
            page_size: 300,
            next_page_token: nextPageToken
          }
        );
        
        const participants = response.participants || [];
        allParticipants = allParticipants.concat(participants);
        nextPageToken = response.next_page_token || '';
        pageCount++;
        
        console.log(`Page ${pageCount}: Found ${participants.length} participants (Total so far: ${allParticipants.length})`);
        
        if (pageCount > 50) break; // Safety limit
      } while (nextPageToken);
      
    } catch (reportError) {
      console.log('Report API failed, trying basic participants endpoint...');
      useReportApi = false;
      
      // Fall back to basic endpoint
      try {
        let pageNumber = 1;
        let hasMore = true;
        
        while (hasMore && pageNumber <= 50) {
          const response = await zoomService.getWebinarParticipants(
            webinar.zoom_webinar_id,
            accessToken,
            {
              page_size: 300,
              page_number: pageNumber
            }
          );
          
          const participants = response.participants || [];
          allParticipants = allParticipants.concat(participants);
          hasMore = response.page_count > pageNumber;
          pageNumber++;
        }
      } catch (basicError) {
        console.error('Both endpoints failed:', basicError.message);
        throw basicError;
      }
    }

    console.log(`\nTotal participant sessions fetched: ${allParticipants.length}`);
    console.log(`Using ${useReportApi ? 'Report API' : 'Basic API'} data`);

    // Calculate unique attendees
    const uniqueParticipants = new Map();
    const participantsByType = {
      attendees: 0,
      panelists: 0
    };

    allParticipants.forEach((p) => {
      // Identify panelists/hosts
      const email = (p.email || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const isPanelist = 
        email.includes('allianthealth.org') ||
        email.includes('eventsibles.com') ||
        name.includes('coe-nf') ||
        name.includes('center of excellence') ||
        p.role === 'panelist' ||
        p.role === 'host';

      // Use email as primary identifier
      const identifier = p.email || p.user_id || p.id || `participant_${uniqueParticipants.size}`;
      
      if (!uniqueParticipants.has(identifier)) {
        uniqueParticipants.set(identifier, {
          ...p,
          is_panelist: isPanelist,
          totalDuration: p.duration || 0,
          sessionCount: 1
        });
        
        if (isPanelist) {
          participantsByType.panelists++;
        } else {
          participantsByType.attendees++;
        }
      } else {
        const existing = uniqueParticipants.get(identifier);
        existing.totalDuration += (p.duration || 0);
        existing.sessionCount++;
      }
    });

    const uniqueAttendees = participantsByType.attendees;
    const uniqueTotal = uniqueParticipants.size;

    console.log(`\nUnique participants: ${uniqueTotal}`);
    console.log(`- Attendees: ${uniqueAttendees}`);
    console.log(`- Panelists: ${participantsByType.panelists}`);

    // Clear existing participants
    await supabase
      .from('zoom_participants')
      .delete()
      .eq('webinar_id', webinar.id);

    // Save unique participants
    const participantRecords = Array.from(uniqueParticipants.values()).map(p => ({
      webinar_id: webinar.id,
      participant_id: p.id || p.participant_id,
      participant_uuid: p.participant_user_id || p.user_id || p.id,
      name: p.name,
      email: p.email,
      join_time: p.join_time,
      leave_time: p.leave_time,
      duration: p.totalDuration || p.duration,
      user_id: p.user_id,
      registrant_id: p.registrant_id,
      participant_user_id: p.participant_user_id,
      session_count: p.sessionCount || 1,
      total_duration: p.totalDuration || p.duration,
      is_aggregated: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    if (participantRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('zoom_participants')
        .insert(participantRecords);

      if (insertError) {
        console.error('Error inserting participants:', insertError);
        throw insertError;
      }
    }

    // Update webinar with correct counts
    const updateData = {
      total_attendees: uniqueAttendees, // Only actual attendees, not panelists
      unique_participant_count: uniqueAttendees,
      actual_participant_count: allParticipants.length,
      total_absentees: Math.max(0, webinar.total_registrants - uniqueAttendees),
      participant_sync_status: 'synced',
      participant_sync_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update(updateData)
      .eq('id', webinar.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`\nWebinar updated successfully:`);
    console.log(`- Total attendees: ${updateData.total_attendees} (was ${webinar.total_attendees})`);
    console.log(`- Total absentees: ${updateData.total_absentees}`);
    console.log(`- Total sessions: ${updateData.actual_participant_count}`);

    return {
      success: true,
      webinarId: webinar.zoom_webinar_id,
      topic: webinar.topic,
      oldAttendees: webinar.total_attendees,
      newAttendees: updateData.total_attendees,
      totalSessions: updateData.actual_participant_count,
      uniqueParticipants: uniqueTotal,
      registrants: webinar.total_registrants,
      absentees: updateData.total_absentees
    };

  } catch (error) {
    console.error('Error resyncing webinar:', error);
    throw error;
  }
}

// Export functions
module.exports = {
  fixUniqueAttendees,
  resyncWebinarAttendees
};
