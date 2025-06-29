const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./zoomService');

// Create Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Simple, working sync service that properly handles pagination and upserts
 */
async function syncWebinarsFixed({ connection, credentials, syncLogId, onProgress }) {
  const results = {
    totalWebinars: 0,
    processedWebinars: 0,
    totalParticipants: 0,
    totalRegistrants: 0,
    errors: []
  };

  try {
    // Update initial progress
    if (onProgress) {
      await onProgress(5, 'Starting webinar sync...');
    }

    // Update sync log to running
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'running',
        status: 'running',
        current_operation: 'Fetching webinars from Zoom',
        started_at: new Date().toISOString()
      })
      .eq('id', syncLogId);

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

    // Fetch ALL webinars (past, scheduled, and live)
    console.log('Fetching all webinars from Zoom...');
    const allWebinars = await fetchAllWebinars(accessToken);
    results.totalWebinars = allWebinars.length;

    if (onProgress) {
      await onProgress(20, `Found ${allWebinars.length} webinars to process`);
    }

    // Process each webinar
    for (let i = 0; i < allWebinars.length; i++) {
      const webinar = allWebinars[i];
      
      try {
        console.log(`\nProcessing webinar ${i + 1}/${allWebinars.length}: ${webinar.topic}`);
        console.log(`Webinar status: ${webinar.status}, type: ${webinar.type}, start_time: ${webinar.start_time}`);
        
        // Update current operation
        await supabase
          .from('zoom_sync_logs')
          .update({
            current_operation: `Processing webinar: ${webinar.topic}`,
            processed_items: i,
            total_items: allWebinars.length
          })
          .eq('id', syncLogId);
        
        // Upsert webinar
        const webinarDb = await upsertWebinar(connection.id, webinar);
        
        if (!webinarDb) {
          throw new Error('Failed to save webinar');
        }

        // Check if webinar has already happened
        const webinarDate = new Date(webinar.start_time);
        const now = new Date();
        const hasOccurred = webinarDate < now;
        
        // Try to sync participants for webinars that have occurred
        // Even if status is still "scheduled", past webinars might have participants
        if (hasOccurred || webinar.status === 'completed' || webinar.type === 9) {
          console.log(`Attempting to fetch participants for webinar: ${webinar.topic}`);
          
          const participantResults = await syncWebinarParticipants(
            webinarDb.id,
            webinar.id,
            webinar.uuid,
            accessToken
          );
          
          results.totalParticipants += participantResults.totalParticipants;
          
          // Update webinar with participant count
          await supabase
            .from('zoom_webinars')
            .update({
              actual_participant_count: participantResults.totalParticipants,
              unique_participant_count: participantResults.uniqueParticipants,
              participant_sync_status: participantResults.totalParticipants > 0 ? 'synced' : 'no_participants',
              participant_sync_completed_at: new Date().toISOString(),
              last_successful_sync: new Date().toISOString()
            })
            .eq('id', webinarDb.id);
        } else {
          console.log(`Skipping participant sync for future webinar: ${webinar.topic}`);
          
          // Mark as not applicable for future webinars
          await supabase
            .from('zoom_webinars')
            .update({
              participant_sync_status: 'not_applicable',
              last_successful_sync: new Date().toISOString()
            })
            .eq('id', webinarDb.id);
        }

        // Sync registrants for all webinars (even future ones)
        const registrantResults = await syncWebinarRegistrants(
          webinarDb.id,
          webinar.id,
          accessToken
        );
        
        results.totalRegistrants += registrantResults.totalRegistrants;

        results.processedWebinars++;

        // Update progress
        const progress = 20 + Math.floor((i + 1) / allWebinars.length * 70);
        if (onProgress) {
          await onProgress(progress, `Processed ${i + 1} of ${allWebinars.length} webinars`);
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
        last_sync_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    // Update sync log as completed
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: results.processedWebinars,
        total_items: results.totalWebinars,
        webinars_synced: results.processedWebinars,
        metadata: {
          totalParticipants: results.totalParticipants,
          totalRegistrants: results.totalRegistrants,
          errors: results.errors
        }
      })
      .eq('id', syncLogId);

    if (onProgress) {
      await onProgress(100, 'Sync completed successfully');
    }

    console.log('Sync completed successfully:', results);
    return results;

  } catch (error) {
    console.error('Sync failed:', error);
    
    // Update sync log with error
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'failed',
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', syncLogId);
    
    throw error;
  }
}

/**
 * Fetch all webinars with proper pagination
 */
async function fetchAllWebinars(accessToken) {
  const allWebinars = [];
  
  // Fetch different types of webinars
  const webinarTypes = ['past', 'scheduled', 'live'];
  
  for (const type of webinarTypes) {
    console.log(`\nFetching ${type} webinars...`);
    let pageNumber = 1;
    const pageSize = 100;
    
    while (true) {
      try {
        console.log(`Fetching ${type} webinars page ${pageNumber}...`);
        
        const response = await zoomService.getWebinars(accessToken, {
          type: type,
          page_size: pageSize,
          page_number: pageNumber
        });
        
        const webinars = response.webinars || [];
        console.log(`Page ${pageNumber}: Found ${webinars.length} ${type} webinars`);
        
        if (webinars.length === 0) {
          break;
        }
        
        allWebinars.push(...webinars);
        
        // Check if there are more pages
        if (response.page_count && response.page_number >= response.page_count) {
          break;
        }
        
        pageNumber++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error fetching ${type} webinars page ${pageNumber}:`, error.message);
        // Continue with next type if one fails
        break;
      }
    }
  }
  
  // Remove duplicates (in case same webinar appears in multiple types)
  const uniqueWebinars = Array.from(
    new Map(allWebinars.map(w => [w.id, w])).values()
  );
  
  console.log(`Total unique webinars fetched: ${uniqueWebinars.length}`);
  return uniqueWebinars;
}

/**
 * Upsert webinar using Supabase's proper upsert method
 */
async function upsertWebinar(connectionId, webinar) {
  const webinarData = {
    connection_id: connectionId,
    zoom_webinar_id: webinar.id,
    zoom_uuid: webinar.uuid || webinar.id,
    webinar_uuid: webinar.uuid || webinar.id,
    topic: webinar.topic || 'Untitled Webinar',
    start_time: webinar.start_time,
    duration: webinar.duration || 0,
    timezone: webinar.timezone || 'UTC',
    agenda: webinar.agenda || null,
    host_id: webinar.host_id,
    host_email: webinar.host_email || '',
    type: webinar.type || 5,
    registration_url: webinar.registration_url || null,
    status: webinar.status || 'scheduled',
    join_url: webinar.join_url || '',
    webinar_type: webinar.type || 5,
    created_at: webinar.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    synced_at: new Date().toISOString()
  };

  // Use Supabase's upsert method properly
  const { data, error } = await supabase
    .from('zoom_webinars')
    .upsert(webinarData, {
      onConflict: 'zoom_webinar_id,connection_id',
      ignoreDuplicates: false
    })
    .select()
    .single();
  
  if (error) {
    // If upsert fails, try to get existing record
    const { data: existing } = await supabase
      .from('zoom_webinars')
      .select()
      .eq('zoom_webinar_id', webinar.id)
      .eq('connection_id', connectionId)
      .single();
    
    if (existing) {
      // Update existing record
      const { data: updated } = await supabase
        .from('zoom_webinars')
        .update(webinarData)
        .eq('id', existing.id)
        .select()
        .single();
      
      return updated;
    }
    
    throw error;
  }
  
  return data;
}

/**
 * Sync webinar participants with proper pagination
 */
async function syncWebinarParticipants(webinarDbId, webinarZoomId, webinarUuid, accessToken) {
  const results = {
    totalParticipants: 0,
    uniqueParticipants: 0
  };

  try {
    console.log(`Syncing participants for webinar ${webinarZoomId}...`);
    
    // Try different approaches to get participants
    let allParticipants = [];
    let fetchSuccess = false;
    
    // Method 1: Try report endpoint with UUID
    if (webinarUuid && webinarUuid !== webinarZoomId) {
      try {
        console.log(`Trying report endpoint with UUID: ${webinarUuid}`);
        allParticipants = await fetchParticipantsWithReport(webinarUuid, accessToken);
        fetchSuccess = allParticipants.length > 0;
      } catch (error) {
        console.log('Report endpoint with UUID failed:', error.message);
      }
    }
    
    // Method 2: Try report endpoint with ID
    if (!fetchSuccess) {
      try {
        console.log(`Trying report endpoint with ID: ${webinarZoomId}`);
        allParticipants = await fetchParticipantsWithReport(webinarZoomId, accessToken);
        fetchSuccess = allParticipants.length > 0;
      } catch (error) {
        console.log('Report endpoint with ID failed:', error.message);
      }
    }
    
    // Method 3: Try basic participants endpoint
    if (!fetchSuccess) {
      try {
        console.log('Trying basic participants endpoint...');
        allParticipants = await fetchParticipantsBasic(webinarZoomId, accessToken);
        fetchSuccess = allParticipants.length > 0;
      } catch (error) {
        console.log('Basic participants endpoint failed:', error.message);
      }
    }
    
    console.log(`Total participants fetched: ${allParticipants.length}`);
    
    // Process participants
    if (allParticipants.length > 0) {
      // Group by unique identifier
      const participantMap = new Map();
      
      for (const participant of allParticipants) {
        const uniqueKey = participant.user_id || 
                         participant.email || 
                         participant.id ||
                         `${participant.name}_${participant.join_time}`;
        
        if (!participantMap.has(uniqueKey)) {
          participantMap.set(uniqueKey, []);
        }
        
        participantMap.get(uniqueKey).push(participant);
      }
      
      // Save each unique participant
      for (const [uniqueKey, sessions] of participantMap) {
        const firstSession = sessions[0];
        
        // Calculate total duration across all sessions
        const totalDuration = sessions.reduce((sum, session) => 
          sum + (session.duration || 0), 0
        );
        
        // Find earliest join and latest leave times
        const joinTimes = sessions
          .filter(s => s.join_time)
          .map(s => new Date(s.join_time));
        const leaveTimes = sessions
          .filter(s => s.leave_time)
          .map(s => new Date(s.leave_time));
        
        const firstJoinTime = joinTimes.length > 0 
          ? new Date(Math.min(...joinTimes)) 
          : null;
        const lastLeaveTime = leaveTimes.length > 0 
          ? new Date(Math.max(...leaveTimes)) 
          : null;
        
        const participantData = {
          webinar_id: webinarDbId,
          participant_uuid: firstSession.user_id || firstSession.id || uniqueKey,
          participant_id: firstSession.id || '',
          participant_user_id: firstSession.user_id || null,
          name: firstSession.name || firstSession.display_name || 'Unknown',
          email: firstSession.email || firstSession.user_email || null,
          participant_name: firstSession.name || firstSession.display_name || 'Unknown',
          participant_email: firstSession.email || firstSession.user_email || null,
          join_time: firstJoinTime?.toISOString() || null,
          leave_time: lastLeaveTime?.toISOString() || null,
          first_join_time: firstJoinTime?.toISOString() || null,
          last_leave_time: lastLeaveTime?.toISOString() || null,
          duration: totalDuration,
          total_duration: totalDuration,
          session_count: sessions.length,
          attentiveness_score: firstSession.attentiveness_score || null,
          location: firstSession.location || firstSession.city || null,
          city: firstSession.city || null,
          country: firstSession.country || null,
          device: firstSession.device || null,
          status: 'joined',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Upsert participant
        const { error } = await supabase
          .from('zoom_participants')
          .upsert(participantData, {
            onConflict: 'webinar_id,participant_uuid',
            ignoreDuplicates: false
          });
        
        if (!error) {
          results.totalParticipants++;
          
          // Save sessions
          for (const session of sessions) {
            const sessionData = {
              participant_id: participantData.participant_uuid,
              webinar_id: webinarDbId,
              session_id: `${participantData.participant_uuid}_${session.join_time || Date.now()}`,
              join_time: session.join_time || null,
              leave_time: session.leave_time || null,
              duration: session.duration || 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            await supabase
              .from('zoom_participant_sessions')
              .upsert(sessionData, {
                onConflict: 'session_id',
                ignoreDuplicates: true
              });
          }
        } else {
          console.error('Error saving participant:', error);
        }
      }
      
      results.uniqueParticipants = participantMap.size;
    }
    
    return results;
    
  } catch (error) {
    console.error('Error syncing participants:', error);
    return results;
  }
}

/**
 * Fetch participants using report endpoint
 */
async function fetchParticipantsWithReport(webinarIdentifier, accessToken) {
  const allParticipants = [];
  let nextPageToken = '';
  let pageCount = 0;
  
  while (true) {
    pageCount++;
    
    const response = await zoomService.getWebinarParticipantsReport(
      webinarIdentifier,
      accessToken,
      {
        page_size: 300,
        next_page_token: nextPageToken
      }
    );
    
    const participants = response.participants || [];
    
    if (participants.length > 0) {
      allParticipants.push(...participants);
    }
    
    // Check for next page
    nextPageToken = response.next_page_token || '';
    if (!nextPageToken) {
      break;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return allParticipants;
}

/**
 * Fetch participants using basic endpoint
 */
async function fetchParticipantsBasic(webinarId, accessToken) {
  const allParticipants = [];
  let pageNumber = 1;
  
  while (true) {
    const response = await zoomService.getWebinarParticipants(
      webinarId,
      accessToken,
      {
        page_size: 300,
        page_number: pageNumber
      }
    );
    
    const participants = response.participants || [];
    if (participants.length === 0) break;
    
    allParticipants.push(...participants);
    
    if (response.page_count && pageNumber >= response.page_count) {
      break;
    }
    
    pageNumber++;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return allParticipants;
}

/**
 * Sync webinar registrants
 */
async function syncWebinarRegistrants(webinarDbId, webinarZoomId, accessToken) {
  const results = {
    totalRegistrants: 0
  };
  
  try {
    console.log(`Syncing registrants for webinar ${webinarZoomId}...`);
    
    let pageNumber = 1;
    
    while (true) {
      const response = await zoomService.getWebinarRegistrants(
        webinarZoomId,
        accessToken,
        {
          page_size: 300,
          page_number: pageNumber
        }
      );
      
      const registrants = response.registrants || [];
      if (registrants.length === 0) break;
      
      // Process registrants
      for (const registrant of registrants) {
        const registrantData = {
          webinar_id: webinarDbId,
          registrant_id: registrant.id || registrant.registrant_id,
          email: registrant.email,
          first_name: registrant.first_name || null,
          last_name: registrant.last_name || null,
          status: registrant.status || 'approved',
          join_url: registrant.join_url || null,
          registration_time: registrant.create_time || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('zoom_registrants')
          .upsert(registrantData, {
            onConflict: 'webinar_id,registrant_id',
            ignoreDuplicates: false
          });
        
        if (!error) {
          results.totalRegistrants++;
        }
      }
      
      if (response.page_count && pageNumber >= response.page_count) {
        break;
      }
      
      pageNumber++;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
  } catch (error) {
    console.error('Error syncing registrants:', error);
  }
  
  return results;
}

// Export the fixed version
module.exports = {
  syncWebinars: syncWebinarsFixed
};
