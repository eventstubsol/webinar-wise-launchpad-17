const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUniqueAttendees() {
  console.log('=== FIXING UNIQUE ATTENDEE COUNTS ===');
  
  try {
    // First, let's get all ended webinars
    const { data: webinars, error: fetchError } = await supabase
      .from('zoom_webinars')
      .select('id, zoom_webinar_id, topic, total_registrants, total_attendees, status')
      .eq('status', 'ended');

    if (fetchError) {
      throw new Error(`Failed to fetch webinars: ${fetchError.message}`);
    }

    console.log(`Found ${webinars.length} ended webinars to process`);

    let updatedCount = 0;
    const updates = [];

    // Process each webinar
    for (const webinar of webinars) {
      // Get participant count for this webinar
      const { data: participants, error: participantError } = await supabase
        .from('zoom_participants')
        .select('email, participant_id, participant_user_id, participant_email')
        .eq('webinar_id', webinar.id);

      if (participantError) {
        console.error(`Error fetching participants for webinar ${webinar.id}:`, participantError);
        continue;
      }

      // Count unique participants
      const uniqueParticipants = new Map();
      
      participants.forEach(p => {
        // Use email as primary identifier, fallback to IDs
        const identifier = p.email || p.participant_email || p.participant_id || p.participant_user_id;
        if (identifier) {
          uniqueParticipants.set(identifier, true);
        }
      });

      const uniqueCount = uniqueParticipants.size;
      const newAbsenteeCount = Math.max(0, webinar.total_registrants - uniqueCount);

      // Only update if the count is different
      if (webinar.total_attendees !== uniqueCount) {
        const { error: updateError } = await supabase
          .from('zoom_webinars')
          .update({
            total_attendees: uniqueCount,
            unique_participant_count: uniqueCount,
            actual_participant_count: participants.length,
            total_absentees: newAbsenteeCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', webinar.id);

        if (updateError) {
          console.error(`Error updating webinar ${webinar.id}:`, updateError);
        } else {
          updatedCount++;
          updates.push({
            zoom_webinar_id: webinar.zoom_webinar_id,
            topic: webinar.topic,
            old_attendees: webinar.total_attendees,
            new_attendees: uniqueCount,
            total_sessions: participants.length,
            registrants: webinar.total_registrants,
            absentees: newAbsenteeCount
          });
        }
      }
    }

    console.log(`Updated ${updatedCount} webinars with correct unique attendee counts`);

    // Show some examples
    if (updates.length > 0) {
      console.log('\nExample updates:');
      updates.slice(0, 10).forEach(u => {
        console.log(`- ${u.topic.substring(0, 50)}...`);
        console.log(`  Old: ${u.old_attendees} attendees → New: ${u.new_attendees} unique attendees (${u.total_sessions} total sessions)`);
        console.log(`  Registrants: ${u.registrants}, Absentees: ${u.absentees}`);
      });
    }

    return {
      success: true,
      updatedCount,
      examples: updates.slice(0, 10)
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
