// Deep dive investigation into Zoom participant data issues
require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepDiveInvestigation() {
  console.log('=== ZOOM PARTICIPANTS DEEP DIVE INVESTIGATION ===\n');
  console.log('Investigating why we\'re missing thousands of attendees...\n');
  
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
    
    // Test with the webinar that should have 1200+ attendees
    const testWebinarId = '88988872033'; // "An Easy Pill to Swallow" - expecting 1200+ attendees
    
    console.log('Testing webinar: "An Easy Pill to Swallow"');
    console.log(`Webinar ID: ${testWebinarId}`);
    console.log('Expected: 1200+ actual attendees\n');
    
    // TEST 1: Check if it's a recurring webinar with multiple instances
    console.log('TEST 1: Checking for webinar instances/occurrences...');
    console.log('='.repeat(60));
    
    let allInstances = [];
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/past_webinars/${testWebinarId}/instances`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      allInstances = response.data.webinars || [];
      console.log(`Found ${allInstances.length} instances for this webinar`);
      
      if (allInstances.length > 0) {
        console.log('\nInstances found:');
        allInstances.forEach((instance, idx) => {
          console.log(`  ${idx + 1}. UUID: ${instance.uuid}`);
          console.log(`     Start: ${instance.start_time}`);
          console.log(`     Duration: ${instance.duration} minutes`);
        });
      }
    } catch (error) {
      console.log('No instances found or error:', error.response?.data?.message || error.message);
    }
    
    // TEST 2: Try different API endpoints and parameters
    console.log('\n\nTEST 2: Testing all participant-related endpoints...');
    console.log('='.repeat(60));
    
    const endpointsToTest = [
      {
        name: 'Past Webinar Participants',
        url: `/past_webinars/${testWebinarId}/participants`,
        paginated: true,
        pageParam: 'page_number'
      },
      {
        name: 'Webinar Participants Report',
        url: `/report/webinars/${testWebinarId}/participants`,
        paginated: true,
        pageParam: 'next_page_token'
      },
      {
        name: 'Webinar Absentees',
        url: `/past_webinars/${testWebinarId}/absentees`,
        paginated: true,
        pageParam: 'page_number'
      },
      {
        name: 'Metrics - Webinar Participants',
        url: `/metrics/webinars/${testWebinarId}/participants`,
        paginated: true,
        pageParam: 'next_page_token'
      }
    ];
    
    for (const endpoint of endpointsToTest) {
      console.log(`\nTesting: ${endpoint.name}`);
      console.log(`Endpoint: ${endpoint.url}`);
      
      try {
        let allParticipants = [];
        let pageToken = '';
        let pageNumber = 1;
        let requestCount = 0;
        
        do {
          requestCount++;
          const params = { page_size: 300 };
          
          if (endpoint.pageParam === 'next_page_token' && pageToken) {
            params.next_page_token = pageToken;
          } else if (endpoint.pageParam === 'page_number') {
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
          const participants = data.participants || data.absentees || [];
          
          console.log(`  Request ${requestCount}: Got ${participants.length} records`);
          console.log(`  Total records reported: ${data.total_records || 'N/A'}`);
          
          allParticipants = allParticipants.concat(participants);
          
          // Handle pagination
          if (endpoint.pageParam === 'next_page_token') {
            pageToken = data.next_page_token || '';
            if (!pageToken) break;
          } else {
            const totalPages = data.page_count || 1;
            if (pageNumber >= totalPages) break;
            pageNumber++;
          }
          
          // Rate limit protection
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } while (requestCount < 20); // Safety limit
        
        console.log(`  TOTAL: ${allParticipants.length} participants found`);
        
        // Analyze the data structure
        if (allParticipants.length > 0) {
          console.log('\n  Sample participant structure:');
          const sample = allParticipants[0];
          console.log(`  Fields available: ${Object.keys(sample).join(', ')}`);
          
          // Check for multiple sessions
          const participantsWithMultipleSessions = {};
          allParticipants.forEach(p => {
            const key = p.email || p.name || p.user_id || 'unknown';
            if (!participantsWithMultipleSessions[key]) {
              participantsWithMultipleSessions[key] = [];
            }
            participantsWithMultipleSessions[key].push(p);
          });
          
          const multiSessionUsers = Object.entries(participantsWithMultipleSessions)
            .filter(([_, sessions]) => sessions.length > 1);
          
          console.log(`\n  Participants with multiple sessions: ${multiSessionUsers.length}`);
          if (multiSessionUsers.length > 0) {
            console.log('  Example of user with multiple sessions:');
            const [userName, sessions] = multiSessionUsers[0];
            console.log(`    User: ${userName}`);
            console.log(`    Sessions: ${sessions.length}`);
            sessions.forEach((s, idx) => {
              console.log(`      ${idx + 1}. Join: ${s.join_time}, Duration: ${s.duration}s`);
            });
          }
        }
        
      } catch (error) {
        console.log(`  Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }
    
    // TEST 3: Try with instance UUIDs if available
    if (allInstances.length > 0) {
      console.log('\n\nTEST 3: Fetching participants for each instance...');
      console.log('='.repeat(60));
      
      let totalParticipantsAcrossInstances = 0;
      
      for (const instance of allInstances) {
        console.log(`\nFetching for instance: ${instance.start_time}`);
        
        try {
          // Use double-encoded UUID as per Zoom documentation
          const encodedUuid = encodeURIComponent(encodeURIComponent(instance.uuid));
          
          const response = await axios.get(
            `https://api.zoom.us/v2/past_webinars/${encodedUuid}/participants`,
            {
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Content-Type': 'application/json'
              },
              params: { page_size: 300 }
            }
          );
          
          const participants = response.data.participants || [];
          totalParticipantsAcrossInstances += participants.length;
          
          console.log(`  Found ${participants.length} participants`);
          console.log(`  Total records: ${response.data.total_records}`);
          
        } catch (error) {
          console.log(`  Error: ${error.response?.data?.message || error.message}`);
        }
      }
      
      console.log(`\nTOTAL across all instances: ${totalParticipantsAcrossInstances} participants`);
    }
    
    // TEST 4: Check participant details endpoint
    console.log('\n\nTEST 4: Testing participant details endpoint...');
    console.log('='.repeat(60));
    
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/report/webinars/${testWebinarId}/participants/sharing`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Sharing/details data available:', response.data);
    } catch (error) {
      console.log('Sharing endpoint error:', error.response?.data?.message || error.message);
    }
    
    // TEST 5: Check Zoom account type and data retention
    console.log('\n\nTEST 5: Checking account capabilities...');
    console.log('='.repeat(60));
    
    try {
      const response = await axios.get(
        'https://api.zoom.us/v2/users/me',
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const user = response.data;
      console.log('Account type:', user.type);
      console.log('Account plan:', user.plan_united_type);
      console.log('Account created:', user.created_at);
      
    } catch (error) {
      console.log('Account check error:', error.response?.data?.message || error.message);
    }
    
    // ANALYSIS
    console.log('\n\n' + '='.repeat(60));
    console.log('ANALYSIS SUMMARY:');
    console.log('='.repeat(60));
    console.log('\nPossible reasons for missing participants:');
    console.log('1. Data Retention: Zoom may only keep detailed participant data for a limited time');
    console.log('2. Account Limitations: Some data might require higher-tier Zoom accounts');
    console.log('3. API Evolution: The API might have changed what data it returns');
    console.log('4. Instance Handling: For recurring webinars, participants might be spread across instances');
    console.log('5. Report Generation: Some data might only be available after Zoom generates reports');
    console.log('6. Privacy Settings: Participant data might be limited by privacy settings');
    
    console.log('\nRecommendations:');
    console.log('1. Use webhooks to capture participant data in real-time');
    console.log('2. Store participant join/leave events as they happen');
    console.log('3. Aggregate multiple sessions per participant');
    console.log('4. Check Zoom Dashboard for actual numbers to verify');
    console.log('5. Contact Zoom support about historical data access');
    
  } catch (error) {
    console.error('Investigation failed:', error);
  }
}

// Run the investigation
deepDiveInvestigation();
