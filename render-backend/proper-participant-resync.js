// Script to correctly re-sync participants with proper handling
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./services/zoomService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function properParticipantResync() {
  console.log('=== PROPER PARTICIPANT RESYNC ===\n');
  console.log('This will fetch actual participants (not registrants) from Zoom API\n');
  
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
    
    // Get webinars to resync - focus on completed ones
    const { data: webinars } = await supabase
      .from('zoom_webinars')
      .select('*')
      .or('status.eq.ended,status.eq.completed')
      .order('start_time', { ascending: false })
      .limit(50); // Start with recent 50 webinars
    
    console.log(`Found ${webinars.length} completed webinars to resync\n`);
    
    let totalParticipantsFound = 0;
    let webinarsWithParticipants = 0;
    
    for (const webinar of webinars) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Webinar: ${webinar.topic}`);
      console.log(`ID: ${webinar.zoom_webinar_id}`);
      console.log(`Date: ${new Date(webinar.start_time).toLocaleDateString()}`);
      console.log(`Currently shows: ${webinar.total_attendees} attendees (likely wrong)`);
      
      // Clear existing participants for clean resync
      await supabase
        .from('zoom_participants')
        .delete()
        .eq('webinar_id', webinar.id);
      
      let allParticipants = [];
      let actualAttendees = 0;
      
      // First, check if this is a recurring webinar with instances
      try {
        const instancesResponse = await zoomService.getWebinarInstances(
          webinar.zoom_webinar_id,
          connection.access_token
        );
        
        const instances = instancesResponse?.webinars || [];
        
        if (instances.length > 0) {
          console.log(`\nThis is a recurring webinar with ${instances.length} instances`);
          
          // For recurring webinars, we need to get participants for each instance
          for (const instance of instances) {
            console.log(`\n  Fetching participants for instance: ${instance.start_time}`);
            
            try {
              // Use the instance UUID instead of webinar ID
              const participants = await fetchAllParticipantsForInstance(
                instance.uuid,
                connection.access_token
              );
              
              console.log(`    Found ${participants.length} participants for this instance`);
              allParticipants = allParticipants.concat(participants);
              
            } catch (err) {
              console.log(`    Error fetching instance participants: ${err.message}`);
            }
          }
        } else {
          // Single webinar - fetch participants directly
          allParticipants = await fetchAllParticipantsForInstance(
            webinar.zoom_webinar_id,
            connection.access_token
          );
        }
        
      } catch (error) {
        // If instances endpoint fails, try direct participant fetch
        console.log('Fetching as single webinar...');
        allParticipants = await fetchAllParticipantsForInstance(
          webinar.zoom_webinar_id,
          connection.access_token
        );
      }
      
      actualAttendees = allParticipants.length;
      console.log(`\nACTUAL PARTICIPANTS FOUND: ${actualAttendees}`);
      
      if (actualAttendees > 0) {
        webinarsWithParticipants++;
        totalParticipantsFound += actualAttendees;
        
        // Save participants in batches
        const batchSize = 100;
        for (let i = 0; i < allParticipants.length; i += batchSize) {
          const batch = allParticipants.slice(i, i + batchSize);
          
          const participantRecords = batch.map((p, index) => ({
            webinar_id: webinar.id,
            participant_uuid: p.user_id || p.id || `${webinar.id}_${i + index}`,
            participant_id: p.id || '',
            participant_name: p.name || 'Unknown',
            participant_email: p.email || null,
            participant_user_id: p.user_id || null,
            name: p.name || 'Unknown',
            email: p.email || null,
            user_id: p.user_id || null,
            registrant_id: p.registrant_id || null,
            join_time: p.join_time || null,
            leave_time: p.leave_time || null,
            duration: p.duration || 0,
            attentiveness_score: p.attentiveness_score || null,
            location: p.location || p.city || null,
            city: p.city || null,
            country: p.country || null,
            device: p.device || null,
            ip_address: p.ip_address || null,
            network_type: p.network_type || null,
            status: 'joined',
            participant_status: 'in_meeting',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          const { error } = await supabase
            .from('zoom_participants')
            .insert(participantRecords);
          
          if (error) {
            console.error(`Error inserting batch: ${error.message}`);
          }
        }
        
        // Update webinar with correct attendee count
        await supabase
          .from('zoom_webinars')
          .update({
            total_attendees: actualAttendees,
            participant_sync_status: 'synced',
            participant_sync_completed_at: new Date().toISOString()
          })
          .eq('id', webinar.id);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('RESYNC COMPLETE');
    console.log(`Webinars with participants: ${webinarsWithParticipants}`);
    console.log(`Total participants found: ${totalParticipantsFound}`);
    
    // Final count
    const { count } = await supabase
      .from('zoom_participants')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nTotal participants in database: ${count}`);
    
  } catch (error) {
    console.error('Resync failed:', error);
  }
}

async function fetchAllParticipantsForInstance(webinarIdOrUuid, accessToken) {
  let allParticipants = [];
  
  // Try report endpoint first
  try {
    let nextPageToken = '';
    do {
      const params = { page_size: 300 };
      if (nextPageToken) params.next_page_token = nextPageToken;
      
      const response = await zoomService.getWebinarParticipantsReport(
        webinarIdOrUuid,
        accessToken,
        params
      );
      
      if (response.participants) {
        allParticipants = allParticipants.concat(response.participants);
      }
      
      nextPageToken = response.next_page_token || '';
    } while (nextPageToken);
    
    return allParticipants;
    
  } catch (reportError) {
    // Fall back to basic endpoint
    console.log('  Report endpoint failed, trying basic endpoint...');
    
    let pageNumber = 1;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await zoomService.getWebinarParticipants(
          webinarIdOrUuid,
          accessToken,
          { page_size: 300, page_number: pageNumber }
        );
        
        if (response.participants) {
          allParticipants = allParticipants.concat(response.participants);
        }
        
        hasMore = response.page_count > pageNumber;
        pageNumber++;
      } catch (error) {
        hasMore = false;
      }
    }
    
    return allParticipants;
  }
}

// Add method to zoomService if not exists
if (!zoomService.getWebinarInstances) {
  zoomService.getWebinarInstances = async function(webinarId, accessToken) {
    try {
      const response = await require('axios').get(
        `https://api.zoom.us/v2/past_webinars/${webinarId}/instances`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  };
}

// Run the resync
properParticipantResync();
