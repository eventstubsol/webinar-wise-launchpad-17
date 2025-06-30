const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./zoomService');

// Create Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Simplified sync service that maps Zoom API data directly to database
 * No complex transformations - just store what Zoom gives us
 */
async function syncWebinars({ connection, credentials, syncLogId, syncType, onProgress }) {
  console.log('\n=== START SYNC WEBINARS ===');
  console.log('Sync Log ID:', syncLogId);
  console.log('Connection ID:', connection.id);
  console.log('Connection Type:', connection.connection_type);
  console.log('Credentials Account ID:', credentials?.account_id);
  
  const results = {
    totalWebinars: 0,
    processedWebinars: 0,
    errors: []
  };

  try {
    // Update progress
    if (onProgress) {
      await onProgress(20, 'Fetching webinars from Zoom API...');
    }

    // Get access token (refresh if needed)
    let accessToken = connection.access_token;
    const tokenExpiresAt = new Date(connection.token_expires_at);
    
    console.log('Token expires at:', tokenExpiresAt);
    console.log('Current time:', new Date());
    
    if (tokenExpiresAt <= new Date()) {
      console.log('Token expired, refreshing...');
      console.log('Using credentials:', {
        client_id: credentials.client_id?.substring(0, 10) + '...',
        account_id: credentials.account_id
      });
      
      const tokenData = await zoomService.getServerToServerToken(
        credentials.client_id,
        credentials.client_secret,
        credentials.account_id
      );
      
      console.log('Token refresh successful, new expiry:', new Date(Date.now() + (tokenData.expires_in * 1000)));
      
      accessToken = tokenData.access_token;
      
      // Update connection with new token
      await supabase
        .from('zoom_connections')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
        })
        .eq('id', connection.id);
    } else {
      console.log('Token still valid, using existing token');
    }

    // Fetch webinars from Zoom
    console.log('\n=== FETCHING USERS FROM ZOOM ===');
    
    // First, get all users in the account
    console.log('Calling zoomService.getUsers with params:', {
      page_size: 300,
      status: 'active'
    });
    
    let usersResponse;
    try {
      usersResponse = await zoomService.getUsers(accessToken, {
        page_size: 300,
        status: 'active'
      });
      console.log('Users API Response:', {
        total_records: usersResponse.total_records,
        page_count: usersResponse.page_count,
        page_number: usersResponse.page_number,
        users_count: usersResponse.users?.length || 0
      });
    } catch (error) {
      console.error('ERROR getting users:', {
        message: error.message,
        response_status: error.response?.status,
        response_data: error.response?.data,
        stack: error.stack
      });
      
      // If it's a 400 error, try to understand why
      if (error.response?.status === 400) {
        console.error('400 Error Details:', {
          code: error.response?.data?.code,
          message: error.response?.data?.message,
          errors: error.response?.data?.errors
        });
      }
      
      throw error;
    }
    
    const users = usersResponse.users || [];
    console.log(`Found ${users.length} users in the account`);
    
    // Log first few users for debugging
    if (users.length > 0) {
      console.log('First 3 users:');
      users.slice(0, 3).forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id}, Type: ${user.type})`);
      });
    }
    
    // Get all webinar types
    const webinarTypes = ['scheduled', 'past'];
    const allWebinars = [];
    
    // For each user, fetch their webinars
    for (const user of users) {
      console.log(`\n=== Fetching webinars for user: ${user.email} (${user.id}) ===`);
      
      for (const type of webinarTypes) {
        try {
          console.log(`  Attempting to fetch ${type} webinars...`);
          const response = await zoomService.getUserWebinars(user.id, accessToken, {
            page_size: 100,
            type: type
          });
          
          console.log(`  Response for ${type} webinars:`, {
            total_records: response.total_records,
            webinars_count: response.webinars?.length || 0
          });
          
          if (response.webinars && response.webinars.length > 0) {
            // Add user info to each webinar for reference
            const webinarsWithUser = response.webinars.map(w => ({
              ...w,
              host_email: user.email // Ensure we have host email
            }));
            allWebinars.push(...webinarsWithUser);
            console.log(`  ✅ Found ${response.webinars.length} ${type} webinars for ${user.email}`);
          }
        } catch (error) {
          console.error(`  ❌ Error fetching ${type} webinars for user ${user.email}:`, {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
          });
          
          // If 400 error, log more details
          if (error.response?.status === 400) {
            console.error('  400 Error Details:', {
              code: error.response?.data?.code,
              message: error.response?.data?.message,
              user_type: user.type,
              user_status: user.status
            });
          }
        }
      }
    }
    
    results.totalWebinars = allWebinars.length;
    console.log(`\n=== Total webinars found: ${results.totalWebinars} ===`);

    if (onProgress) {
      await onProgress(40, `Found ${allWebinars.length} webinars, syncing to database...`);
    }

    // Process each webinar
    for (let i = 0; i < allWebinars.length; i++) {
      const webinar = allWebinars[i];
      
      try {
        console.log(`\nProcessing webinar ${i+1}/${allWebinars.length}: ${webinar.topic} (ID: ${webinar.id})`);
        
        // Fetch complete webinar details from the detail endpoint
        // The list endpoint doesn't return all fields we need
        let fullWebinarData = webinar;
        try {
          console.log(`  Fetching full details for webinar ${webinar.id}...`);
          fullWebinarData = await zoomService.getWebinar(webinar.id, accessToken);
          console.log(`  ✅ Got full details for webinar ${webinar.id}`);
          
          // Add a small delay to respect rate limits (Zoom allows 10 requests per second)
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (detailError) {
          console.error(`  ❌ Failed to get full details for webinar ${webinar.id}:`, {
            message: detailError.message,
            status: detailError.response?.status
          });
          // Continue with limited data from list endpoint
        }
        
        // Map Zoom data directly to our schema - no complex transformations
        const webinarData = {
          connection_id: connection.id,
          zoom_webinar_id: String(fullWebinarData.id),
          uuid: fullWebinarData.uuid || null,
          host_id: String(fullWebinarData.host_id || ''),
          host_email: fullWebinarData.host_email || '',
          topic: fullWebinarData.topic || 'Untitled Webinar',
          type: fullWebinarData.type || 5,
          start_time: fullWebinarData.start_time ? new Date(fullWebinarData.start_time).toISOString() : new Date().toISOString(),
          duration: parseInt(fullWebinarData.duration || '60', 10),
          timezone: fullWebinarData.timezone || 'UTC',
          agenda: fullWebinarData.agenda || null,
          created_at: fullWebinarData.created_at ? new Date(fullWebinarData.created_at).toISOString() : new Date().toISOString(),
          start_url: fullWebinarData.start_url || null,
          join_url: fullWebinarData.join_url || '',
          registration_url: fullWebinarData.registration_url || null,
          password: fullWebinarData.password || null,
          h323_password: fullWebinarData.h323_password || null,
          pstn_password: fullWebinarData.pstn_password || null,
          encrypted_password: fullWebinarData.encrypted_password || null,
          status: mapWebinarStatus(fullWebinarData.status),
          settings: fullWebinarData.settings || {},
          recurrence: fullWebinarData.recurrence || null,
          occurrences: fullWebinarData.occurrences || null,
          tracking_fields: fullWebinarData.tracking_fields || [],
          registrants_count: fullWebinarData.registrants_count || 0,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('  Upserting webinar to database...');
        
        // Upsert webinar (insert or update)
        const { data: upsertedWebinar, error: upsertError } = await supabase
          .from('zoom_webinars')
          .upsert(webinarData, {
            onConflict: 'connection_id,zoom_webinar_id'
          })
          .select('id')
          .single();
          
        if (upsertError) {
          console.error('  ❌ Database upsert error:', upsertError);
          throw upsertError;
        }
        
        console.log('  ✅ Webinar upserted successfully');
        
        const webinarDbId = upsertedWebinar.id;
        
        // Initialize metrics record if it doesn't exist
        await supabase
          .from('webinar_metrics')
          .upsert({
            webinar_id: webinarDbId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'webinar_id'
          });
        
        results.processedWebinars++;

        // Update progress
        const progress = 40 + Math.floor((i + 1) / allWebinars.length * 40);
        if (onProgress) {
          await onProgress(progress, `Processed ${i + 1} of ${allWebinars.length} webinars`);
        }

        // For past/ended webinars, sync participants
        if (webinar.status === 'ended' || new Date(webinar.start_time) < new Date()) {
          try {
            await syncWebinarParticipants(webinar, webinarDbId, accessToken);
          } catch (participantError) {
            console.error(`  ❌ Failed to sync participants for webinar ${webinar.id}:`, participantError.message);
            results.errors.push({
              webinar_id: webinar.id,
              error: `Participant sync failed: ${participantError.message}`,
              type: 'participant_sync'
            });
          }
        }

      } catch (error) {
        console.error(`❌ Error processing webinar ${webinar.id}:`, error);
        results.errors.push({
          webinar_id: webinar.id,
          error: error.message,
          details: error.details || error.hint || ''
        });
      }
    }

    // Update connection last sync time
    console.log('\nUpdating connection last sync time...');
    await supabase
      .from('zoom_connections')
      .update({
        last_sync_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    if (onProgress) {
      await onProgress(90, 'Finalizing sync...');
    }

    console.log('\n=== SYNC COMPLETED SUCCESSFULLY ===');
    console.log('Results:', results);
    return results;

  } catch (error) {
    console.error('\n=== SYNC FAILED ===');
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      response_status: error.response?.status,
      response_data: error.response?.data
    });
    throw error;
  }
}

/**
 * Map Zoom status to our database enum
 */
function mapWebinarStatus(zoomStatus) {
  const statusMap = {
    'waiting': 'waiting',
    'started': 'started',
    'ended': 'ended',
    'scheduled': 'scheduled',
    'upcoming': 'upcoming',
    'finished': 'finished'
  };
  
  return statusMap[zoomStatus] || 'scheduled';
}

/**
 * Sync participants for a webinar
 */
async function syncWebinarParticipants(webinar, webinarDbId, accessToken) {
  console.log(`  Syncing participants for webinar: ${webinar.topic}`);
  
  try {
    // Update sync status
    await supabase
      .from('webinar_metrics')
      .update({ 
        participant_sync_status: 'syncing',
        participant_sync_attempted_at: new Date().toISOString()
      })
      .eq('webinar_id', webinarDbId);
    
    // Try report endpoint first (has more data)
    let allParticipants = [];
    let useReportEndpoint = true;
    
    try {
      // Get participants from report endpoint
      let nextPageToken = '';
      do {
        const response = await zoomService.getWebinarParticipantsReport(
          webinar.id,
          accessToken,
          {
            page_size: 300,
            next_page_token: nextPageToken
          }
        );
        
        allParticipants = allParticipants.concat(response.participants || []);
        nextPageToken = response.next_page_token || '';
        
        // Small delay between requests
        if (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } while (nextPageToken);
      
      console.log(`    ✅ Got ${allParticipants.length} participants from report endpoint`);
      
    } catch (reportError) {
      console.log('    Report endpoint failed, falling back to basic participants endpoint');
      useReportEndpoint = false;
      allParticipants = [];
    }
    
    // Fallback to basic endpoint if report fails
    if (!useReportEndpoint) {
      let pageNumber = 1;
      let hasMore = true;
      
      while (hasMore) {
        try {
          const response = await zoomService.getWebinarParticipants(
            webinar.id,
            accessToken,
            {
              page_size: 300,
              page_number: pageNumber
            }
          );
          
          allParticipants = allParticipants.concat(response.participants || []);
          hasMore = response.page_count > pageNumber;
          pageNumber++;
          
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`    Error fetching page ${pageNumber}:`, error.message);
          hasMore = false;
        }
      }
      
      console.log(`    ✅ Got ${allParticipants.length} participants from basic endpoint`);
    }
    
    console.log(`    Total participant records: ${allParticipants.length}`);
    
    // Calculate unique attendees (excluding panelists/hosts)
    const uniqueEmails = new Set();
    let actualAttendeeCount = 0;
    
    // Process participants
    const batchSize = 100;
    for (let i = 0; i < allParticipants.length; i += batchSize) {
      const batch = allParticipants.slice(i, i + batchSize);
      const participantRecords = [];
      
      for (const participant of batch) {
        // Check if this is a panelist/host
        const email = (participant.email || '').toLowerCase();
        const isPanelist = 
          email.includes('allianthealth.org') ||
          email.includes('eventsibles.com') ||
          participant.role === 'panelist' ||
          participant.role === 'host';
        
        // Count unique attendees (not panelists)
        if (!isPanelist && participant.email) {
          uniqueEmails.add(email);
          actualAttendeeCount++;
        }
        
        // Create participant record
        const participantData = {
          webinar_id: webinarDbId,
          participant_uuid: participant.participant_user_id || participant.user_id || participant.id || '',
          participant_id: participant.id || participant.registrant_id || '',
          participant_email: participant.email || null,
          participant_name: participant.name || participant.display_name || '',
          participant_user_id: participant.user_id || null,
          
          // Legacy columns
          name: participant.name || participant.display_name || '',
          email: participant.email || null,
          user_id: participant.user_id || null,
          registrant_id: participant.registrant_id || null,
          
          // Time data
          join_time: participant.join_time || null,
          leave_time: participant.leave_time || null,
          duration: participant.duration || 0,
          
          status: participant.status || 'joined',
          failover: participant.failover || false,
          
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        participantRecords.push(participantData);
      }
      
      // Batch upsert
      if (participantRecords.length > 0) {
        const { error } = await supabase
          .from('zoom_participants')
          .upsert(participantRecords, {
            onConflict: 'webinar_id,participant_uuid'
          });
        
        if (error) {
          console.error('    ❌ Error upserting participants:', error);
          throw error;
        }
      }
    }
    
    // Update metrics
    const uniqueAttendees = uniqueEmails.size;
    const totalAbsentees = Math.max(0, (webinar.registrants_count || 0) - uniqueAttendees);
    
    await supabase
      .from('webinar_metrics')
      .update({
        total_attendees: uniqueAttendees,
        unique_attendees: uniqueAttendees,
        total_absentees: totalAbsentees,
        actual_participant_count: allParticipants.length,
        participant_sync_status: 'completed',
        participant_sync_completed_at: new Date().toISOString(),
        participant_sync_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('webinar_id', webinarDbId);
    
    console.log(`    ✅ Synced ${allParticipants.length} participants (${uniqueAttendees} unique attendees)`);
    
  } catch (error) {
    console.error(`    ❌ Error syncing participants:`, error.message);
    
    // Update sync status as failed
    await supabase
      .from('webinar_metrics')
      .update({ 
        participant_sync_status: 'failed',
        participant_sync_error: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('webinar_id', webinarDbId);
      
    throw error;
  }
}

module.exports = {
  syncWebinars
};