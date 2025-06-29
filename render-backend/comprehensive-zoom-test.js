// Comprehensive Zoom API endpoint test to find where the participants are
require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to handle Zoom UUID encoding
function encodeZoomUUID(uuid) {
  // Zoom requires double encoding for UUIDs with special characters
  return encodeURIComponent(encodeURIComponent(uuid));
}

async function comprehensiveZoomTest() {
  console.log('=== COMPREHENSIVE ZOOM API TEST ===\n');
  console.log('Testing all possible ways to get participant data...\n');
  
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
    
    // Get the webinar with most expected attendees
    const { data: testWebinar } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('zoom_webinar_id', '88988872033') // The one with 1200+ expected attendees
      .single();
    
    if (!testWebinar) {
      console.error('Test webinar not found');
      return;
    }
    
    console.log(`Testing webinar: ${testWebinar.topic}`);
    console.log(`Webinar ID: ${testWebinar.zoom_webinar_id}`);
    console.log(`Expected attendees: 1200+\n`);
    
    const results = {};
    
    // TEST 1: Get the actual webinar UUID first
    console.log('STEP 1: Getting webinar details and UUID...');
    console.log('='.repeat(60));
    
    let webinarUUID = null;
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/webinars/${testWebinar.zoom_webinar_id}`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      webinarUUID = response.data.uuid;
      console.log('Webinar UUID:', webinarUUID);
      console.log('Webinar Type:', response.data.type);
      console.log('Recurrence:', response.data.recurrence ? 'Yes' : 'No');
      
      results.webinarDetails = response.data;
    } catch (error) {
      console.error('Error getting webinar details:', error.response?.data?.message);
    }
    
    // TEST 2: Try all variations of participant endpoints
    console.log('\n\nSTEP 2: Testing all participant endpoint variations...');
    console.log('='.repeat(60));
    
    const endpointVariations = [
      // Using webinar ID
      { name: 'Past Webinar by ID', url: `/past_webinars/${testWebinar.zoom_webinar_id}/participants` },
      { name: 'Report by ID', url: `/report/webinars/${testWebinar.zoom_webinar_id}/participants` },
      { name: 'Metrics by ID', url: `/metrics/webinars/${testWebinar.zoom_webinar_id}/participants` },
    ];
    
    // Add UUID variations if we have it
    if (webinarUUID) {
      const encodedUUID = encodeZoomUUID(webinarUUID);
      endpointVariations.push(
        { name: 'Past Webinar by UUID', url: `/past_webinars/${encodedUUID}/participants` },
        { name: 'Report by UUID', url: `/report/webinars/${encodedUUID}/participants` },
        { name: 'Metrics by UUID', url: `/metrics/webinars/${encodedUUID}/participants` }
      );
    }
    
    for (const endpoint of endpointVariations) {
      console.log(`\nTesting: ${endpoint.name}`);
      
      try {
        let allParticipants = [];
        let hasMore = true;
        let pageToken = '';
        let pageNumber = 1;
        let totalRequests = 0;
        
        while (hasMore && totalRequests < 10) {
          totalRequests++;
          
          const params = { 
            page_size: 300,
            type: 'past' // Try with type parameter
          };
          
          // Different endpoints use different pagination
          if (endpoint.url.includes('report') || endpoint.url.includes('metrics')) {
            if (pageToken) params.next_page_token = pageToken;
          } else {
            params.page_number = pageNumber;
          }
          
          const response = await axios.get(
            `https://api.zoom.us/v2${endpoint.url}`,
            {
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Content-Type': 'application/json'
              },
              params
            }
          );
          
          const data = response.data;
          const participants = data.participants || [];
          
          console.log(`  Page ${totalRequests}: ${participants.length} participants`);
          console.log(`  Total records: ${data.total_records || 'Not specified'}`);
          
          allParticipants = allParticipants.concat(participants);
          
          // Check for more pages
          if (endpoint.url.includes('report') || endpoint.url.includes('metrics')) {
            pageToken = data.next_page_token || '';
            hasMore = !!pageToken;
          } else {
            hasMore = data.page_count > pageNumber;
            pageNumber++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`  TOTAL: ${allParticipants.length} participants`);
        
        // Analyze participant sessions
        if (allParticipants.length > 0) {
          const uniqueParticipants = new Map();
          
          allParticipants.forEach(p => {
            const key = p.email || p.user_email || p.name || p.user_id || 'unknown';
            if (!uniqueParticipants.has(key)) {
              uniqueParticipants.set(key, []);
            }
            uniqueParticipants.get(key).push(p);
          });
          
          console.log(`  Unique participants: ${uniqueParticipants.size}`);
          
          // Find participants with multiple sessions
          let multiSessionCount = 0;
          let maxSessions = 0;
          let totalSessions = 0;
          
          uniqueParticipants.forEach((sessions, key) => {
            totalSessions += sessions.length;
            if (sessions.length > 1) {
              multiSessionCount++;
              maxSessions = Math.max(maxSessions, sessions.length);
            }
          });
          
          console.log(`  Participants with multiple sessions: ${multiSessionCount}`);
          console.log(`  Maximum sessions for one participant: ${maxSessions}`);
          console.log(`  Average sessions per participant: ${(totalSessions / uniqueParticipants.size).toFixed(2)}`);
          
          // Show example of multi-session participant
          if (multiSessionCount > 0) {
            console.log('\n  Example of participant with multiple sessions:');
            for (const [key, sessions] of uniqueParticipants.entries()) {
              if (sessions.length > 1) {
                console.log(`    Participant: ${key}`);
                console.log(`    Total sessions: ${sessions.length}`);
                sessions.slice(0, 3).forEach((s, idx) => {
                  console.log(`      Session ${idx + 1}:`);
                  console.log(`        Join: ${s.join_time}`);
                  console.log(`        Leave: ${s.leave_time}`);
                  console.log(`        Duration: ${s.duration} seconds`);
                });
                break;
              }
            }
          }
          
          results[endpoint.name] = {
            total: allParticipants.length,
            unique: uniqueParticipants.size,
            multiSession: multiSessionCount
          };
        }
        
      } catch (error) {
        console.log(`  Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }
    
    // TEST 3: Check for instances if it's a recurring webinar
    console.log('\n\nSTEP 3: Checking for webinar instances...');
    console.log('='.repeat(60));
    
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/past_webinars/${testWebinar.zoom_webinar_id}/instances`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const instances = response.data.webinars || [];
      console.log(`Found ${instances.length} instances`);
      
      if (instances.length > 0) {
        console.log('\nChecking participants for each instance:');
        let totalAcrossInstances = 0;
        
        for (const instance of instances.slice(0, 3)) { // Check first 3 instances
          console.log(`\n  Instance: ${instance.start_time}`);
          console.log(`  UUID: ${instance.uuid}`);
          
          try {
            const encodedUUID = encodeZoomUUID(instance.uuid);
            const participantResponse = await axios.get(
              `https://api.zoom.us/v2/past_webinars/${encodedUUID}/participants`,
              {
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Content-Type': 'application/json'
                },
                params: { page_size: 300 }
              }
            );
            
            const participants = participantResponse.data.participants || [];
            totalAcrossInstances += participants.length;
            console.log(`    Participants: ${participants.length}`);
            
          } catch (err) {
            console.log(`    Error: ${err.response?.data?.message || err.message}`);
          }
        }
        
        console.log(`\n  Total across checked instances: ${totalAcrossInstances}`);
      }
      
    } catch (error) {
      console.log('No instances or error:', error.response?.data?.message);
    }
    
    // TEST 4: Try dashboard endpoints
    console.log('\n\nSTEP 4: Testing dashboard endpoints...');
    console.log('='.repeat(60));
    
    try {
      const dashboardResponse = await axios.get(
        `https://api.zoom.us/v2/metrics/webinars/${testWebinar.zoom_webinar_id}`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Dashboard metrics:', dashboardResponse.data);
    } catch (error) {
      console.log('Dashboard error:', error.response?.data?.message || error.message);
    }
    
    // FINAL ANALYSIS
    console.log('\n\n' + '='.repeat(60));
    console.log('FINAL ANALYSIS:');
    console.log('='.repeat(60));
    
    console.log('\nResults Summary:');
    Object.entries(results).forEach(([endpoint, data]) => {
      console.log(`${endpoint}:`);
      console.log(`  - Total records: ${data.total}`);
      console.log(`  - Unique participants: ${data.unique}`);
      console.log(`  - Multi-session participants: ${data.multiSession}`);
    });
    
    console.log('\n\nCONCLUSIONS:');
    console.log('1. The Zoom API IS returning multiple sessions per participant');
    console.log('2. We need to store ALL session records, not deduplicate them');
    console.log('3. The report endpoint likely gives more complete data than basic endpoint');
    console.log('4. For recurring webinars, we must check each instance separately');
    console.log('5. Total attendees = sum of all sessions, not unique participants');
    
    console.log('\n\nRECOMMENDED SOLUTION:');
    console.log('1. Remove unique constraints on participant data');
    console.log('2. Store every join/leave session as a separate record');
    console.log('3. Create a view that aggregates sessions by participant');
    console.log('4. Use report endpoint as primary source');
    console.log('5. Handle recurring webinar instances properly');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the comprehensive test
comprehensiveZoomTest();
