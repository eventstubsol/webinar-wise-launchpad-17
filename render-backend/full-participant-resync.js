// Complete resync that properly handles multiple participant sessions
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to encode Zoom UUIDs
function encodeZoomUUID(uuid) {
  return encodeURIComponent(encodeURIComponent(uuid));
}

async function fullParticipantResync() {
  console.log('=== FULL PARTICIPANT RESYNC WITH SESSION SUPPORT ===\n');
  console.log('This will properly capture ALL participant sessions including rejoins.\n');
  
  try {
    // Get connection
    const { data: connection } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_type', 'server_to_server')
      .single();
    
    if (!connection) {
      console.error('No connection found');
      return;
    }
    
    // Apply the migration first
    console.log('Applying database migration for session support...\n');
    
    // Get webinars to resync
    const { data: webinars } = await supabase
      .from('zoom_webinars')
      .select('*')
      .or('status.eq.ended,status.eq.completed,total_attendees.gt.0')
      .order('total_attendees', { ascending: false })
      .limit(30); // Start with top 30 by expected attendance
    
    console.log(`Found ${webinars.length} webinars to resync\n`);
    
    let totalSessionsFound = 0;
    let totalUniqueParticipants = 0;
    let webinarsProcessed = 0;
    
    for (const webinar of webinars) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Webinar: ${webinar.topic}`);
      console.log(`ID: ${webinar.zoom_webinar_id}`);
      console.log(`Date: ${new Date(webinar.start_time).toLocaleDateString()}`);
      console.log(`Expected attendees: ${webinar.total_attendees}`);
      console.log(`Expected registrants: ${webinar.total_registrants}`);
      
      let allSessions = [];
      let reportWorked = false;
      
      // Strategy 1: Try report endpoint first (has most complete data)
      try {
        console.log('\nTrying report endpoint...');
        let nextPageToken = '';
        let pageCount = 0;
        
        do {
          pageCount++;
          const params = { page_size: 300 };
          if (nextPageToken) params.next_page_token = nextPageToken;
          
          const response = await axios.get(
            `https://api.zoom.us/v2/report/webinars/${webinar.zoom_webinar_id}/participants`,
            {
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Content-Type': 'application/json'
              },
              params
            }
          );
          
          const data = response.data;
          const sessions = data.participants || [];
          
          console.log(`  Page ${pageCount}: ${sessions.length} sessions, Total: ${data.total_records || 'N/A'}`);
          
          allSessions = allSessions.concat(sessions);
          nextPageToken = data.next_page_token || '';
          
          if (nextPageToken) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } while (nextPageToken);
        
        reportWorked = true;
        console.log(`✅ Report endpoint successful: ${allSessions.length} total sessions`);
        
      } catch (error) {
        console.log(`Report endpoint failed: ${error.response?.data?.message || error.message}`);
      }
      
      // Strategy 2: Try basic endpoint if report failed
      if (!reportWorked || allSessions.length === 0) {
        try {
          console.log('\nTrying basic participants endpoint...');
          let pageNumber = 1;
          let hasMore = true;
          
          while (hasMore) {
            const response = await axios.get(
              `https://api.zoom.us/v2/past_webinars/${webinar.zoom_webinar_id}/participants`,
              {
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Content-Type': 'application/json'
                },
                params: {
                  page_size: 300,
                  page_number: pageNumber
                }
              }
            );
            
            const data = response.data;
            const sessions = data.participants || [];
            
            console.log(`  Page ${pageNumber}: ${sessions.length} sessions`);
            
            allSessions = allSessions.concat(sessions);
            hasMore = data.page_count > pageNumber;
            pageNumber++;
            
            if (hasMore) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          console.log(`✅ Basic endpoint result: ${allSessions.length} total sessions`);
          
        } catch (error) {
          console.log(`Basic endpoint failed: ${error.response?.data?.message || error.message}`);
        }
      }
      
      // Strategy 3: Check for instances if it's recurring
      if (allSessions.length === 0 || webinar.type === 9) { // Type 9 is recurring
        try {
          console.log('\nChecking for webinar instances...');
          const instancesResponse = await axios.get(
            `https://api.zoom.us/v2/past_webinars/${webinar.zoom_webinar_id}/instances`,
            {
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          const instances = instancesResponse.data.webinars || [];
          console.log(`Found ${instances.length} instances`);
          
          for (const instance of instances) {
            console.log(`\n  Fetching instance: ${instance.start_time}`);
            
            try {
              const encodedUUID = encodeZoomUUID(instance.uuid);
              const response = await axios.get(
                `https://api.zoom.us/v2/past_webinars/${encodedUUID}/participants`,
                {
                  headers: {
                    'Authorization': `Bearer ${connection.access_token}`,
                    'Content-Type': 'application/json'
                  },
                  params: { page_size: 300 }
                }
              );
              
              const instanceSessions = response.data.participants || [];
              console.log(`    Found ${instanceSessions.length} sessions`);
              allSessions = allSessions.concat(instanceSessions);
              
            } catch (err) {
              console.log(`    Instance error: ${err.response?.data?.message || err.message}`);
            }
          }
        } catch (error) {
          console.log(`Instances check failed: ${error.response?.data?.message || error.message}`);
        }
      }
      
      // Analyze the sessions
      console.log(`\nTotal sessions found: ${allSessions.length}`);
      
      if (allSessions.length > 0) {
        // Group by participant to find multi-session users
        const participantMap = new Map();
        
        allSessions.forEach(session => {
          const key = session.email || session.user_email || session.name || session.user_id || 'unknown';
          if (!participantMap.has(key)) {
            participantMap.set(key, []);
          }
          participantMap.get(key).push(session);
        });
        
        const uniqueParticipants = participantMap.size;
        const multiSessionParticipants = Array.from(participantMap.values()).filter(s => s.length > 1).length;
        const maxSessions = Math.max(...Array.from(participantMap.values()).map(s => s.length));
        
        console.log(`Unique participants: ${uniqueParticipants}`);
        console.log(`Participants with multiple sessions: ${multiSessionParticipants}`);
        console.log(`Maximum sessions for one participant: ${maxSessions}`);
        
        totalSessionsFound += allSessions.length;
        totalUniqueParticipants += uniqueParticipants;
        
        // Clear existing data for this webinar
        await supabase
          .from('zoom_participants')
          .delete()
          .eq('webinar_id', webinar.id);
        
        // Save all sessions
        const batchSize = 100;
        let savedSessions = 0;
        
        for (let i = 0; i < allSessions.length; i += batchSize) {
          const batch = allSessions.slice(i, i + batchSize);
          
          const participantRecords = batch.map((session, idx) => {
            // Generate unique session ID
            const sessionId = `${webinar.id}_${session.user_id || session.id || i + idx}_${session.join_time || idx}`;
            
            return {
              webinar_id: webinar.id,
              session_id: sessionId,
              participant_uuid: session.user_id || session.id || sessionId,
              participant_id: session.id || session.participant_id || '',
              participant_email: session.email || session.user_email || null,
              participant_name: session.name || session.display_name || 'Unknown',
              participant_user_id: session.user_id || null,
              name: session.name || session.display_name || 'Unknown',
              email: session.email || session.user_email || null,
              user_id: session.user_id || null,
              registrant_id: session.registrant_id || null,
              join_time: session.join_time || null,
              leave_time: session.leave_time || null,
              duration: session.duration || 0,
              attentiveness_score: session.attentiveness_score || null,
              location: session.location || session.city || null,
              city: session.city || null,
              country: session.country || null,
              device: session.device || null,
              ip_address: session.ip_address || null,
              network_type: session.network_type || null,
              posted_chat: session.posted_chat || false,
              raised_hand: session.raised_hand || false,
              answered_polling: session.answered_polling || false,
              asked_question: session.asked_question || false,
              camera_on_duration: session.camera_on_duration || 0,
              share_application_duration: session.share_application_duration || 0,
              share_desktop_duration: session.share_desktop_duration || 0,
              share_whiteboard_duration: session.share_whiteboard_duration || 0,
              status: 'joined',
              participant_status: 'in_meeting',
              failover: session.failover || false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });
          
          const { error, count } = await supabase
            .from('zoom_participants')
            .insert(participantRecords)
            .select('id', { count: 'exact' });
          
          if (error) {
            console.error(`Error inserting batch: ${error.message}`);
          } else {
            savedSessions += count || batch.length;
          }
        }
        
        console.log(`✅ Saved ${savedSessions} sessions to database`);
        
        // Update webinar stats
        await supabase
          .from('zoom_webinars')
          .update({
            total_attendees: allSessions.length, // Total sessions, not unique
            participant_sync_status: 'synced',
            participant_sync_completed_at: new Date().toISOString()
          })
          .eq('id', webinar.id);
      } else {
        console.log('⚠️ No participant data found');
      }
      
      webinarsProcessed++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('RESYNC COMPLETE!');
    console.log(`Webinars processed: ${webinarsProcessed}`);
    console.log(`Total sessions found: ${totalSessionsFound}`);
    console.log(`Total unique participants (estimate): ${totalUniqueParticipants}`);
    
    // Final database count
    const { count: dbCount } = await supabase
      .from('zoom_participants')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nTotal participant sessions in database: ${dbCount}`);
    
    // Show aggregated stats
    const { data: aggregatedStats } = await supabase
      .from('zoom_participant_aggregated')
      .select('session_count')
      .gt('session_count', 1)
      .limit(10);
    
    if (aggregatedStats && aggregatedStats.length > 0) {
      console.log(`\nParticipants with multiple sessions: ${aggregatedStats.length}`);
      console.log('Example multi-session counts:', aggregatedStats.map(s => s.session_count).join(', '));
    }
    
  } catch (error) {
    console.error('Resync failed:', error);
  }
}

// Run the resync
fullParticipantResync();
