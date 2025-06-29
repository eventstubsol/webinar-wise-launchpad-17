// Emergency script to re-sync all webinar participants
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./services/zoomService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function emergencyResyncParticipants() {
  console.log('=== EMERGENCY PARTICIPANT DATA RECOVERY ===\n');
  console.log('This script will re-sync all webinar participants to recover lost data.\n');
  
  try {
    // Get connection
    const { data: connection } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_type', 'server_to_server')
      .single();
    
    if (!connection) {
      console.error('No server-to-server connection found');
      return;
    }
    
    // Get all webinars that need re-sync
    const { data: webinars } = await supabase
      .from('zoom_webinars')
      .select('*')
      .or('total_attendees.gt.0,status.eq.completed')
      .order('start_time', { ascending: false });
    
    console.log(`Found ${webinars.length} webinars to check for re-sync\n`);
    
    let totalRecovered = 0;
    let webinarsProcessed = 0;
    
    for (const webinar of webinars) {
      console.log(`\nProcessing: ${webinar.topic}`);
      console.log(`Webinar ID: ${webinar.zoom_webinar_id}`);
      console.log(`Expected attendees: ${webinar.total_attendees || 'Unknown'}`);
      
      // Get current participant count
      const { count: currentCount } = await supabase
        .from('zoom_participants')
        .select('*', { count: 'exact', head: true })
        .eq('webinar_id', webinar.id);
      
      console.log(`Current participants in DB: ${currentCount}`);
      
      try {
        // Try report endpoint first
        let participants = [];
        let useReportEndpoint = true;
        
        try {
          const reportResponse = await zoomService.getWebinarParticipantsReport(
            webinar.zoom_webinar_id,
            connection.access_token,
            { page_size: 300 }
          );
          
          participants = reportResponse.participants || [];
          
          // Handle pagination
          let nextPageToken = reportResponse.next_page_token;
          while (nextPageToken) {
            const nextResponse = await zoomService.getWebinarParticipantsReport(
              webinar.zoom_webinar_id,
              connection.access_token,
              { page_size: 300, next_page_token: nextPageToken }
            );
            participants = participants.concat(nextResponse.participants || []);
            nextPageToken = nextResponse.next_page_token;
          }
          
          console.log(`✅ Report endpoint returned ${participants.length} participants`);
        } catch (reportError) {
          console.log('Report endpoint failed, trying basic endpoint...');
          useReportEndpoint = false;
        }
        
        // Fall back to basic endpoint
        if (!useReportEndpoint || participants.length === 0) {
          let pageNumber = 1;
          let hasMore = true;
          
          while (hasMore) {
            const response = await zoomService.getWebinarParticipants(
              webinar.zoom_webinar_id,
              connection.access_token,
              { page_size: 300, page_number: pageNumber }
            );
            
            const pageParticipants = response.participants || [];
            participants = participants.concat(pageParticipants);
            
            hasMore = response.page_count > pageNumber;
            pageNumber++;
            
            if (hasMore) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          console.log(`✅ Basic endpoint returned ${participants.length} participants`);
        }
        
        if (participants.length > currentCount) {
          // Process participants in batches
          const batchSize = 50;
          let inserted = 0;
          
          for (let i = 0; i < participants.length; i += batchSize) {
            const batch = participants.slice(i, i + batchSize);
            const participantInserts = [];
            
            for (const participant of batch) {
              // Generate a unique ID for participants without one
              const participantUuid = participant.participant_user_id || 
                                    participant.user_id || 
                                    participant.id || 
                                    `${webinar.id}_${participant.name}_${participant.join_time}`.replace(/[^a-zA-Z0-9_-]/g, '_');
              
              const participantData = {
                webinar_id: webinar.id,
                participant_uuid: participantUuid,
                participant_id: participant.id || participant.registrant_id || '',
                participant_email: participant.email || participant.user_email || null,
                participant_name: participant.name || participant.display_name || '',
                participant_user_id: participant.user_id || null,
                name: participant.name || participant.display_name || '',
                email: participant.email || participant.user_email || null,
                user_id: participant.user_id || null,
                registrant_id: participant.registrant_id || null,
                join_time: participant.join_time || null,
                leave_time: participant.leave_time || null,
                duration: participant.duration || 0,
                attentiveness_score: participant.attentiveness_score || null,
                customer_key: participant.customer_key || null,
                location: participant.location || participant.city || null,
                city: participant.city || null,
                country: participant.country || null,
                network_type: participant.network_type || null,
                device: participant.device || null,
                ip_address: participant.ip_address || null,
                posted_chat: participant.posted_chat || false,
                raised_hand: participant.raised_hand || false,
                answered_polling: participant.answered_polling || false,
                asked_question: participant.asked_question || false,
                camera_on_duration: participant.camera_on_duration || 0,
                share_application_duration: participant.share_application_duration || 0,
                share_desktop_duration: participant.share_desktop_duration || 0,
                share_whiteboard_duration: participant.share_whiteboard_duration || 0,
                status: participant.status || 'joined',
                participant_status: 'in_meeting',
                failover: participant.failover || false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              participantInserts.push(participantData);
            }
            
            // Insert without using upsert to avoid conflicts
            const { error } = await supabase
              .from('zoom_participants')
              .insert(participantInserts);
            
            if (!error) {
              inserted += participantInserts.length;
            } else {
              console.error('Error inserting batch:', error.message);
            }
          }
          
          console.log(`✅ Recovered ${inserted} participants for this webinar`);
          totalRecovered += inserted;
          
          // Update webinar total
          await supabase
            .from('zoom_webinars')
            .update({ 
              total_attendees: participants.length,
              participant_sync_status: 'synced',
              participant_sync_completed_at: new Date().toISOString()
            })
            .eq('id', webinar.id);
        } else {
          console.log('ℹ️ No additional participants to recover');
        }
        
        webinarsProcessed++;
        
        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error processing webinar: ${error.message}`);
      }
    }
    
    console.log('\n=== RECOVERY COMPLETE ===');
    console.log(`Webinars processed: ${webinarsProcessed}`);
    console.log(`Total participants recovered: ${totalRecovered}`);
    
    // Final count
    const { count: finalCount } = await supabase
      .from('zoom_participants')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nTotal participants in database: ${finalCount}`);
    
  } catch (error) {
    console.error('Recovery failed:', error);
  }
}

// Run the recovery
emergencyResyncParticipants();
