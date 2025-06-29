const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./zoomService');

// Create Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Enhanced sync service that properly handles participant sessions and large webinars
 */
async function syncWebinarsEnhanced({ connection, credentials, syncLogId, syncType, onProgress }) {
  const results = {
    totalWebinars: 0,
    processedWebinars: 0,
    totalParticipants: 0,
    totalSessions: 0,
    errors: []
  };

  try {
    // Update progress
    if (onProgress) {
      await onProgress(10, 'Starting enhanced webinar sync...');
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

    // Get webinars to sync
    console.log('Fetching webinars from Zoom...');
    
    // Get both past and scheduled webinars
    const pastWebinarsResponse = await zoomService.getWebinars(accessToken, {
      page_size: 100,
      type: 'past'
    });
    
    const webinars = pastWebinarsResponse.webinars || [];
    results.totalWebinars = webinars.length;

    if (onProgress) {
      await onProgress(20, `Found ${webinars.length} webinars to process...`);
    }

    // Process each webinar
    for (let i = 0; i < webinars.length; i++) {
      const webinar = webinars[i];
      
      try {
        console.log(`\nProcessing webinar: ${webinar.topic}`);
        console.log(`Webinar ID: ${webinar.id}, UUID: ${webinar.uuid}`);
        
        // Save or update webinar
        const { data: webinarDb } = await saveWebinar(connection.id, webinar);
        
        if (!webinarDb) {
          throw new Error('Failed to save webinar');
        }

        // Sync participants with enhanced session tracking
        const participantResults = await syncWebinarParticipantsEnhanced(
          webinarDb.id,
          webinar.id,
          webinar.uuid,
          accessToken
        );
        
        results.totalParticipants += participantResults.totalParticipants;
        results.totalSessions += participantResults.totalSessions;
        
        // Calculate webinar statistics
        await calculateWebinarStats(webinarDb.id);
        
        // Update webinar with sync results
        await supabase
          .from('zoom_webinars')
          .update({
            actual_participant_count: participantResults.totalParticipants,
            unique_participant_count: participantResults.uniqueParticipants,
            last_successful_sync: new Date().toISOString(),
            sync_method: 'enhanced_session_tracking',
            participant_sync_status: 'synced',
            participant_sync_completed_at: new Date().toISOString()
          })
          .eq('id', webinarDb.id);

        results.processedWebinars++;

        // Update progress
        const progress = 20 + Math.floor((i + 1) / webinars.length * 60);
        if (onProgress) {
          await onProgress(progress, `Processed ${i + 1} of ${webinars.length} webinars`);
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

    console.log('Enhanced sync completed successfully:', results);
    return results;

  } catch (error) {
    console.error('Enhanced sync failed:', error);
    
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

/**
 * Save or update webinar in database
 */
async function saveWebinar(connectionId, webinar) {
  // Check if webinar already exists
  const { data: existingWebinar } = await supabase
    .from('zoom_webinars')
    .select('id')
    .eq('zoom_webinar_id', webinar.id)
    .eq('connection_id', connectionId)
    .single();

  const webinarData = {
    connection_id: connectionId,
    zoom_webinar_id: webinar.id,
    zoom_uuid: webinar.uuid || webinar.id,
    webinar_uuid: webinar.uuid || webinar.id,
    topic: webinar.topic,
    start_time: webinar.start_time,
    duration: webinar.duration,
    timezone: webinar.timezone,
    agenda: webinar.agenda,
    host_id: webinar.host_id,
    host_email: webinar.host_email,
    type: webinar.type,
    registration_url: webinar.registration_url,
    status: webinar.status || 'scheduled',
    join_url: webinar.join_url,
    updated_at: new Date().toISOString()
  };

  if (existingWebinar) {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .update(webinarData)
      .eq('id', existingWebinar.id)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  } else {
    webinarData.created_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('zoom_webinars')
      .insert(webinarData)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  }
}

/**
 * Enhanced participant sync with session tracking
 */
async function syncWebinarParticipantsEnhanced(webinarDbId, webinarZoomId, webinarUuid, accessToken) {
  const results = {
    totalParticipants: 0,
    uniqueParticipants: 0,
    totalSessions: 0,
    errors: []
  };

  console.log(`\nSyncing participants for webinar ${webinarZoomId}...`);

  try {
    // First, try to get all instances if it's a recurring webinar
    let webinarInstances = [];
    
    try {
      const instancesResponse = await zoomService.getWebinarInstances(webinarZoomId, accessToken);
      if (instancesResponse.webinars && instancesResponse.webinars.length > 0) {
        webinarInstances = instancesResponse.webinars;
        console.log(`Found ${webinarInstances.length} instances for this recurring webinar`);
      }
    } catch (error) {
      // Not a recurring webinar or instances endpoint failed
      console.log('Single webinar or instances fetch failed, proceeding with main ID');
    }

    // If we have instances, process each one
    if (webinarInstances.length > 0) {
      for (const instance of webinarInstances) {
        console.log(`\nProcessing instance: ${instance.start_time}`);
        const instanceResults = await fetchAndSaveParticipants(
          webinarDbId,
          instance.uuid || webinarZoomId,
          accessToken,
          true // Use UUID for instances
        );
        results.totalParticipants += instanceResults.totalParticipants;
        results.totalSessions += instanceResults.totalSessions;
      }
    } else {
      // Single webinar - process normally
      const singleResults = await fetchAndSaveParticipants(
        webinarDbId,
        webinarUuid || webinarZoomId,
        accessToken,
        false
      );
      results.totalParticipants = singleResults.totalParticipants;
      results.totalSessions = singleResults.totalSessions;
    }

    // Calculate unique participants
    const { count } = await supabase
      .from('zoom_participants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarDbId);
    
    results.uniqueParticipants = count || 0;

    console.log(`\nParticipant sync complete:
    - Total participant records: ${results.totalParticipants}
    - Unique participants: ${results.uniqueParticipants}
    - Total sessions tracked: ${results.totalSessions}`);

    return results;

  } catch (error) {
    console.error('Error syncing participants:', error);
    results.errors.push(error.message);
    return results;
  }
}

/**
 * Fetch and save participants for a specific webinar/instance
 */
async function fetchAndSaveParticipants(webinarDbId, webinarIdentifier, accessToken, useUuid = false) {
  const results = {
    totalParticipants: 0,
    totalSessions: 0
  };

  let allParticipants = [];
  let nextPageToken = '';
  let pageCount = 0;
  let hasMore = true;

  // Use report endpoint for detailed data
  while (hasMore) {
    try {
      pageCount++;
      console.log(`Fetching page ${pageCount}...`);

      const response = await zoomService.getWebinarParticipantsReport(
        webinarIdentifier,
        accessToken,
        {
          page_size: 300,
          next_page_token: nextPageToken
        }
      );

      const participants = response.participants || [];
      console.log(`Page ${pageCount}: Found ${participants.length} participant records`);
      
      if (participants.length > 0) {
        // Check if we have session details
        const firstParticipant = participants[0];
        const hasSessionDetails = firstParticipant.details && Array.isArray(firstParticipant.details);
        
        if (hasSessionDetails) {
          console.log('Participant data includes session details');
        } else {
          console.log('Participant data does not include detailed sessions');
        }

        allParticipants = allParticipants.concat(participants);
      }

      nextPageToken = response.next_page_token || '';
      hasMore = !!nextPageToken;

      // Rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error) {
      console.error(`Error fetching page ${pageCount}:`, error.message);
      
      // Try fallback to basic endpoint if report fails
      if (pageCount === 1 && error.response?.status === 400) {
        console.log('Report endpoint failed with 400 error, trying basic endpoint...');
        return await fetchWithBasicEndpoint(webinarDbId, webinarIdentifier, accessToken);
      }
      
      hasMore = false;
    }
  }

  console.log(`Total participant records fetched: ${allParticipants.length}`);

  // Process and save participants
  if (allParticipants.length > 0) {
    // Group participants by unique identifier to handle multiple sessions
    const participantMap = new Map();
    
    for (const participant of allParticipants) {
      // Create unique key for participant
      const uniqueKey = participant.participant_user_id || 
                       participant.user_id || 
                       participant.email || 
                       participant.registrant_id ||
                       `${participant.name}_${participant.id}`;
      
      if (!participantMap.has(uniqueKey)) {
        participantMap.set(uniqueKey, {
          mainData: participant,
          sessions: []
        });
      }
      
      // Add session data
      if (participant.details && Array.isArray(participant.details)) {
        // Detailed session data available
        participantMap.get(uniqueKey).sessions.push(...participant.details);
      } else {
        // Single session
        participantMap.get(uniqueKey).sessions.push({
          join_time: participant.join_time,
          leave_time: participant.leave_time,
          duration: participant.duration || 0
        });
      }
    }

    // Save each unique participant and their sessions
    for (const [uniqueKey, data] of participantMap) {
      const participant = data.mainData;
      const sessions = data.sessions;
      
      // Generate participant UUID if needed
      const participantUuid = participant.participant_user_id || 
                            participant.user_id || 
                            participant.id ||
                            `${webinarDbId}_${uniqueKey}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // Check if participant already exists
      const { data: existingParticipant } = await supabase
        .from('zoom_participants')
        .select('id')
        .eq('webinar_id', webinarDbId)
        .eq('participant_uuid', participantUuid)
        .single();

      let savedParticipant;
      
      if (existingParticipant) {
        // Update existing participant
        const { data: updated, error: updateError } = await supabase
          .from('zoom_participants')
          .update({
            participant_email: participant.email || participant.user_email || null,
            participant_name: participant.name || participant.display_name || '',
            name: participant.name || participant.display_name || '',
            email: participant.email || participant.user_email || null,
            attentiveness_score: participant.attentiveness_score || null,
            customer_key: participant.customer_key || null,
            location: participant.location || participant.city || null,
            city: participant.city || null,
            country: participant.country || null,
            device: participant.device || null,
            ip_address: participant.ip_address || null,
            network_type: participant.network_type || null,
            session_count: sessions.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingParticipant.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating participant:', updateError);
          continue;
        }
        
        savedParticipant = updated;
      } else {
        // Insert new participant
        const { data: inserted, error: insertError } = await supabase
          .from('zoom_participants')
          .insert({
            webinar_id: webinarDbId,
            participant_uuid: participantUuid,
            participant_id: participant.id || participant.registrant_id || '',
            participant_email: participant.email || participant.user_email || null,
            participant_name: participant.name || participant.display_name || '',
            participant_user_id: participant.user_id || null,
            name: participant.name || participant.display_name || '',
            email: participant.email || participant.user_email || null,
            user_id: participant.user_id || null,
            registrant_id: participant.registrant_id || null,
            attentiveness_score: participant.attentiveness_score || null,
            customer_key: participant.customer_key || null,
            location: participant.location || participant.city || null,
            city: participant.city || null,
            country: participant.country || null,
            device: participant.device || null,
            ip_address: participant.ip_address || null,
            network_type: participant.network_type || null,
            status: 'joined',
            participant_status: 'in_meeting',
            session_count: sessions.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting participant:', insertError);
          continue;
        }
        
        savedParticipant = inserted;
      }

      if (savedParticipant?.id) {
        results.totalParticipants++;
        
        // Save sessions
        for (const session of sessions) {
          const sessionId = `${savedParticipant.id}_${session.join_time || Date.now()}`;
          
          // Check if session already exists
          const { data: existingSession } = await supabase
            .from('zoom_participant_sessions')
            .select('id')
            .eq('participant_id', savedParticipant.id)
            .eq('session_id', sessionId)
            .single();

          if (!existingSession) {
            const { error: sessionError } = await supabase
              .from('zoom_participant_sessions')
              .insert({
                participant_id: savedParticipant.id,
                webinar_id: webinarDbId,
                session_id: sessionId,
                join_time: session.join_time || null,
                leave_time: session.leave_time || null,
                duration: session.duration || 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (!sessionError) {
              results.totalSessions++;
            } else {
              console.error('Error inserting session:', sessionError);
            }
          }
        }
        
        // Update participant aggregated data
        await updateParticipantAggregates(savedParticipant.id, webinarDbId);
      }
    }
  }

  return results;
}

/**
 * Fallback function using basic endpoint
 */
async function fetchWithBasicEndpoint(webinarDbId, webinarIdentifier, accessToken) {
  const results = {
    totalParticipants: 0,
    totalSessions: 0
  };

  let pageNumber = 1;
  let hasMore = true;
  let allParticipants = [];

  while (hasMore) {
    try {
      const response = await zoomService.getWebinarParticipants(
        webinarIdentifier,
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

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Error fetching basic page ${pageNumber}:`, error.message);
      hasMore = false;
    }
  }

  console.log(`Basic endpoint returned ${allParticipants.length} participants`);

  // Process similar to above but simpler
  for (const participant of allParticipants) {
    const participantUuid = participant.user_id || 
                          participant.id ||
                          `${webinarDbId}_${participant.name}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Check if participant already exists
    const { data: existingParticipant } = await supabase
      .from('zoom_participants')
      .select('id')
      .eq('webinar_id', webinarDbId)
      .eq('participant_uuid', participantUuid)
      .single();

    let savedParticipant;
    
    if (existingParticipant) {
      // Update existing participant
      const { data: updated } = await supabase
        .from('zoom_participants')
        .update({
          participant_name: participant.name || '',
          name: participant.name || '',
          join_time: participant.join_time || null,
          leave_time: participant.leave_time || null,
          duration: participant.duration || 0,
          total_duration: participant.duration || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingParticipant.id)
        .select()
        .single();
      
      savedParticipant = updated;
    } else {
      // Insert new participant
      const { data: inserted } = await supabase
        .from('zoom_participants')
        .insert({
          webinar_id: webinarDbId,
          participant_uuid: participantUuid,
          participant_id: participant.id || '',
          participant_name: participant.name || '',
          name: participant.name || '',
          user_id: participant.user_id || null,
          registrant_id: participant.registrant_id || null,
          join_time: participant.join_time || null,
          leave_time: participant.leave_time || null,
          duration: participant.duration || 0,
          total_duration: participant.duration || 0,
          status: 'joined',
          participant_status: 'in_meeting',
          session_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      savedParticipant = inserted;
    }

    if (savedParticipant) {
      results.totalParticipants++;
      
      // Create single session record
      const sessionId = `${savedParticipant.id}_main`;
      
      // Check if session already exists
      const { data: existingSession } = await supabase
        .from('zoom_participant_sessions')
        .select('id')
        .eq('participant_id', savedParticipant.id)
        .eq('session_id', sessionId)
        .single();

      if (!existingSession) {
        await supabase
          .from('zoom_participant_sessions')
          .insert({
            participant_id: savedParticipant.id,
            webinar_id: webinarDbId,
            session_id: sessionId,
            join_time: participant.join_time || null,
            leave_time: participant.leave_time || null,
            duration: participant.duration || 0
          });
        
        results.totalSessions++;
      }
    }
  }

  return results;
}

/**
 * Update participant aggregated data
 */
async function updateParticipantAggregates(participantId, webinarId) {
  try {
    // Get all sessions for this participant
    const { data: sessions } = await supabase
      .from('zoom_participant_sessions')
      .select('duration, join_time, leave_time')
      .eq('participant_id', participantId)
      .eq('webinar_id', webinarId);

    if (sessions && sessions.length > 0) {
      // Calculate totals
      const totalDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      const firstJoinTime = sessions
        .filter(s => s.join_time)
        .map(s => new Date(s.join_time))
        .sort((a, b) => a - b)[0];
      const lastLeaveTime = sessions
        .filter(s => s.leave_time)
        .map(s => new Date(s.leave_time))
        .sort((a, b) => b - a)[0];

      // Update participant record
      await supabase
        .from('zoom_participants')
        .update({
          total_duration: totalDuration,
          session_count: sessions.length,
          first_join_time: firstJoinTime ? firstJoinTime.toISOString() : null,
          last_leave_time: lastLeaveTime ? lastLeaveTime.toISOString() : null,
          is_aggregated: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', participantId);
    }
  } catch (error) {
    console.error('Error updating participant aggregates:', error);
  }
}

/**
 * Calculate webinar statistics
 */
async function calculateWebinarStats(webinarId) {
  try {
    // Get participant stats
    const { data: stats } = await supabase
      .from('zoom_participants')
      .select('id, total_duration')
      .eq('webinar_id', webinarId);

    if (stats && stats.length > 0) {
      const totalMinutes = stats.reduce((sum, p) => sum + (p.total_duration || 0), 0);
      const avgDuration = Math.round(totalMinutes / stats.length);

      await supabase
        .from('zoom_webinars')
        .update({
          total_attendees: stats.length,
          total_participant_minutes: totalMinutes,
          avg_attendance_duration: avgDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', webinarId);
    }
  } catch (error) {
    console.error('Error calculating webinar stats:', error);
  }
}

// Export both versions
module.exports = {
  syncWebinars: syncWebinarsEnhanced,  // Use enhanced version as default
  syncWebinarsEnhanced,
  syncWebinarParticipantsEnhanced
};
