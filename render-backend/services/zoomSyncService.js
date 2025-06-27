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

    // Fetch webinars
    console.log('Fetching webinars from Zoom...');
    const webinarsResponse = await zoomService.getWebinars(accessToken, {
      page_size: 100,
      type: 'scheduled' // Get scheduled webinars
    });

    const webinars = webinarsResponse.webinars || [];
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
          uuid: webinar.uuid || webinar.id,
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

        if (existingWebinar) {
          // Update existing webinar
          await supabase
            .from('zoom_webinars')
            .update(webinarData)
            .eq('id', existingWebinar.id);
        } else {
          // Insert new webinar
          webinarData.created_at = new Date().toISOString();
          await supabase
            .from('zoom_webinars')
            .insert(webinarData);
        }

        results.processedWebinars++;

        // Update progress
        const progress = 40 + Math.floor((i + 1) / webinars.length * 40);
        if (onProgress) {
          await onProgress(progress, `Processed ${i + 1} of ${webinars.length} webinars`);
        }

        // Fetch participants for this webinar if it's past
        if (webinar.status === 'completed' || new Date(webinar.start_time) < new Date()) {
          console.log(`Fetching participants for webinar: ${webinar.topic}`);
          
          try {
            const participantsResponse = await zoomService.getWebinarParticipants(
              webinar.id,
              accessToken
            );
            
            const participants = participantsResponse.participants || [];
            console.log(`Found ${participants.length} participants`);
            
            // Process participants
            for (const participant of participants) {
              const participantData = {
                webinar_id: existingWebinar?.id || webinar.id,
                participant_id: participant.id,
                participant_uuid: participant.user_id || participant.id,
                email: participant.email,
                name: participant.name,
                join_time: participant.join_time,
                leave_time: participant.leave_time,
                duration: participant.duration,
                attentiveness_score: participant.attentiveness_score,
                user_id: participant.user_id,
                registrant_id: participant.registrant_id,
                customer_key: participant.customer_key,
                location: participant.location,
                city: participant.city,
                country: participant.country,
                network_type: participant.network_type,
                device: participant.device,
                ip_address: participant.ip_address,
                updated_at: new Date().toISOString()
              };

              // Check if participant exists
              const { data: existingParticipant } = await supabase
                .from('zoom_participants')
                .select('id')
                .eq('participant_uuid', participantData.participant_uuid)
                .eq('webinar_id', participantData.webinar_id)
                .single();

              if (existingParticipant) {
                await supabase
                  .from('zoom_participants')
                  .update(participantData)
                  .eq('id', existingParticipant.id);
              } else {
                participantData.created_at = new Date().toISOString();
                await supabase
                  .from('zoom_participants')
                  .insert(participantData);
              }
            }

            // Update webinar attendee count
            await supabase
              .from('zoom_webinars')
              .update({ total_attendees: participants.length })
              .eq('webinar_id', webinar.id)
              .eq('connection_id', connection.id);

          } catch (participantError) {
            console.error(`Error fetching participants for webinar ${webinar.id}:`, participantError);
            results.errors.push({
              webinar_id: webinar.id,
              error: participantError.message
            });
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
