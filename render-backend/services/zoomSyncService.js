const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./zoomService');

// Create Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncWebinars({ connection, credentials, syncLogId, syncType, onProgress }) {
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
    
    if (tokenExpiresAt <= new Date()) {
      console.log('Token expired, refreshing...');
      const tokenData = await zoomService.getServerToServerToken(
        credentials.client_id,
        credentials.client_secret,
        credentials.account_id
      );
      
      accessToken = tokenData.access_token;
      
      // Update connection with new token
      await supabase
        .from('zoom_connections')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
        })
        .eq('id', connection.id);
    }

    // Fetch both scheduled and past webinars
    console.log('Fetching webinars from Zoom...');
    
    // Fetch scheduled webinars
    const scheduledResponse = await zoomService.getWebinars(accessToken, {
      page_size: 100,
      type: 'scheduled'
    });
    
    const webinars = scheduledResponse.webinars || [];
    results.totalWebinars = webinars.length;

    if (onProgress) {
      await onProgress(40, `Found ${webinars.length} webinars, processing...`);
    }

    // Process each webinar
    for (let i = 0; i < webinars.length; i++) {
      const webinar = webinars[i];
      
      try {
        console.log(`Processing webinar: ${webinar.topic}`);
        
        // Check if webinar already exists
        const { data: existingWebinar } = await supabase
          .from('zoom_webinars')
          .select('id')
          .eq('webinar_id', webinar.id)
          .eq('connection_id', connection.id)
          .single();

        const webinarData = {
          connection_id: connection.id,
          webinar_id: webinar.id,
          webinar_uuid: webinar.uuid || webinar.id,
          topic: webinar.topic,
          start_time: webinar.start_time,
          duration: webinar.duration,
          timezone: webinar.timezone,
          agenda: webinar.agenda,
          host_email: webinar.host_email,
          type: webinar.type,
          registration_url: webinar.registration_url,
          status: webinar.status || 'scheduled',
          join_url: webinar.join_url,
          total_registrants: 0,
          total_attendees: 0,
          raw_data: webinar,
          updated_at: new Date().toISOString()
        };

        let webinarDbId;
        if (existingWebinar) {
          webinarDbId = existingWebinar.id;
          await supabase
            .from('zoom_webinars')
            .update(webinarData)
            .eq('id', existingWebinar.id);
        } else {
          webinarData.created_at = new Date().toISOString();
          const { data: newWebinar } = await supabase
            .from('zoom_webinars')
            .insert(webinarData)
            .select('id')
            .single();
          webinarDbId = newWebinar.id;
        }

        results.processedWebinars++;

        // Update progress
        const progress = 40 + Math.floor((i + 1) / webinars.length * 40);
        if (onProgress) {
          await onProgress(progress, `Processed ${i + 1} of ${webinars.length} webinars`);
        }

        // Fetch participants for past webinars
        if (webinar.status === 'completed' || new Date(webinar.start_time) < new Date()) {
          console.log(`Fetching participants for webinar: ${webinar.topic}`);
          
          try {
            // Try to use the report endpoint first for more detailed data
            let allParticipants = [];
            let useReportEndpoint = true;
            let nextPageToken = '';
            let pageNumber = 1;
            
            // First try the report endpoint which has more data
            try {
              const reportResponse = await zoomService.getWebinarParticipantsReport(
                webinar.id,
                accessToken,
                {
                  page_size: 300,
                  next_page_token: nextPageToken
                }
              );
              
              allParticipants = reportResponse.participants || [];
              nextPageToken = reportResponse.next_page_token || '';
              
              // Continue pagination for report endpoint
              while (nextPageToken) {
                const nextResponse = await zoomService.getWebinarParticipantsReport(
                  webinar.id,
                  accessToken,
                  {
                    page_size: 300,
                    next_page_token: nextPageToken
                  }
                );
                allParticipants = allParticipants.concat(nextResponse.participants || []);
                nextPageToken = nextResponse.next_page_token || '';
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            } catch (reportError) {
              console.log('Report endpoint failed, falling back to basic participants endpoint');
              useReportEndpoint = false;
            }
            
            // Fall back to basic endpoint if report fails
            if (!useReportEndpoint) {
              let hasMore = true;
              pageNumber = 1;
              
              while (hasMore) {
                try {
                  const participantsResponse = await zoomService.getWebinarParticipants(
                    webinar.id,
                    accessToken,
                    {
                      page_size: 300,
                      page_number: pageNumber
                    }
                  );
                  
                  const participants = participantsResponse.participants || [];
                  allParticipants = allParticipants.concat(participants);
                  
                  // Check if there are more pages
                  hasMore = participantsResponse.page_count > pageNumber;
                  pageNumber++;
                  
                  // Small delay to respect rate limits
                  if (hasMore) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                } catch (paginationError) {
                  console.error(`Error fetching page ${pageNumber}:`, paginationError);
                  hasMore = false;
                }
              }
            }
            
            console.log(`Found ${allParticipants.length} total participants using ${useReportEndpoint ? 'report' : 'basic'} endpoint`);
            
            // Process participants in batches
            const batchSize = 50;
            for (let i = 0; i < allParticipants.length; i += batchSize) {
              const batch = allParticipants.slice(i, i + batchSize);
              const participantInserts = [];
              
              for (const participant of batch) {
                // Map the fields correctly based on what the API actually returns
                const participantData = {
                  webinar_id: webinarDbId,
                  // Primary identifier fields
                  participant_uuid: participant.participant_user_id || participant.user_id || participant.id || '',
                  participant_id: participant.id || participant.registrant_id || '',
                  participant_email: participant.email || participant.user_email || null,
                  participant_name: participant.name || participant.display_name || participant.user_name || '',
                  participant_user_id: participant.user_id || null,
                  
                  // Legacy columns for backward compatibility
                  name: participant.name || participant.display_name || participant.user_name || '',
                  email: participant.email || participant.user_email || null,
                  user_id: participant.user_id || null,
                  registrant_id: participant.registrant_id || null,
                  
                  // Time and duration fields
                  join_time: participant.join_time || null,
                  leave_time: participant.leave_time || null,
                  duration: participant.duration || 0,
                  
                  // Advanced metrics (from report endpoint)
                  attentiveness_score: participant.attentiveness_score || null,
                  customer_key: participant.customer_key || null,
                  
                  // Location data (from report endpoint)
                  location: participant.location || participant.city || null,
                  city: participant.city || null,
                  country: participant.country || null,
                  network_type: participant.network_type || null,
                  device: participant.device || null,
                  ip_address: participant.ip_address || null,
                  
                  // Engagement metrics (from report endpoint or webhooks)
                  posted_chat: participant.posted_chat || false,
                  raised_hand: participant.raised_hand || false,
                  answered_polling: participant.answered_polling || false,
                  asked_question: participant.asked_question || false,
                  camera_on_duration: participant.camera_on_duration || 0,
                  share_application_duration: participant.share_application_duration || 0,
                  share_desktop_duration: participant.share_desktop_duration || 0,
                  share_whiteboard_duration: participant.share_whiteboard_duration || 0,
                  
                  // Status fields
                  status: participant.status || 'joined',
                  participant_status: participant.participant_status || 'in_meeting',
                  failover: participant.failover || false,
                  
                  // Session information
                  session_sequence: participant.session_sequence || 1,
                  is_rejoin_session: participant.is_rejoin_session || false,
                  participant_session_id: participant.participant_session_id || null,
                  
                  // Timestamps
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                
                participantInserts.push(participantData);
              }
              
              // Batch upsert participants
              if (participantInserts.length > 0) {
                const { error } = await supabase
                  .from('zoom_participants')
                  .upsert(participantInserts, {
                    onConflict: 'webinar_id,participant_uuid',
                    ignoreDuplicates: false
                  });
                
                if (error) {
                  console.error(`Error upserting participant batch ${i / batchSize + 1}:`, error);
                  results.errors.push({
                    webinar_id: webinar.id,
                    error: `Failed to upsert participants batch: ${error.message}`
                  });
                }
              }
            }

            // Update webinar attendee count
            await supabase
              .from('zoom_webinars')
              .update({ 
                total_attendees: allParticipants.length,
                participant_sync_status: 'synced',
                participant_sync_attempted_at: new Date().toISOString()
              })
              .eq('id', webinarDbId);

          } catch (participantError) {
            console.error(`Error fetching participants for webinar ${webinar.id}:`, participantError);
            results.errors.push({
              webinar_id: webinar.id,
              error: participantError.message
            });
            
            // Update sync status as failed
            await supabase
              .from('zoom_webinars')
              .update({ 
                participant_sync_status: 'failed',
                participant_sync_error: participantError.message,
                participant_sync_attempted_at: new Date().toISOString()
              })
              .eq('id', webinarDbId);
          }
        }

      } catch (error) {
        console.error(`Error processing webinar ${webinar.id}:`, error);
        results.errors.push({
          webinar_id: webinar.id,
          error: error.message
        });
      }
    }

    // Update connection last sync time
    await supabase
      .from('zoom_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success'
      })
      .eq('id', connection.id);

    if (onProgress) {
      await onProgress(90, 'Finalizing sync...');
    }

    console.log('Sync completed successfully:', results);
    return results;

  } catch (error) {
    console.error('Sync failed:', error);
    
    // Update connection with error status
    await supabase
      .from('zoom_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'failed',
        error_message: error.message
      })
      .eq('id', connection.id);

    throw error;
  }
}

module.exports = {
  syncWebinars
};