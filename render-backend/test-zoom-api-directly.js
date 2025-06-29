// Direct test of Zoom API to see what's really available
require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testZoomAPIDirectly() {
  console.log('=== ZOOM API DIRECT TEST ===\n');
  
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
    
    // Test with a specific webinar that should have many participants
    const testWebinarId = '82293193909'; // The one with 2100 expected attendees
    
    console.log(`Testing webinar ID: ${testWebinarId}`);
    console.log('Expected attendees: 2100\n');
    
    // Test 1: Basic participants endpoint
    console.log('1. Testing /past_webinars/{id}/participants endpoint:');
    try {
      let allParticipants = [];
      let pageNumber = 1;
      let totalPages = 1;
      
      do {
        const response = await axios.get(
          `https://api.zoom.us/v2/past_webinars/${testWebinarId}/participants`,
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
        console.log(`  Page ${pageNumber}: ${data.participants?.length || 0} participants`);
        console.log(`  Total records: ${data.total_records}`);
        console.log(`  Page count: ${data.page_count}`);
        
        if (data.participants) {
          allParticipants = allParticipants.concat(data.participants);
        }
        
        totalPages = data.page_count || 1;
        pageNumber++;
        
        // Rate limit protection
        if (pageNumber <= totalPages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } while (pageNumber <= totalPages);
      
      console.log(`\n  TOTAL from basic endpoint: ${allParticipants.length} participants`);
      
      if (allParticipants.length > 0) {
        console.log('\n  Sample participant data:');
        console.log(JSON.stringify(allParticipants[0], null, 2));
      }
      
    } catch (error) {
      console.error('  Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 2: Report participants endpoint
    console.log('\n\n2. Testing /report/webinars/{id}/participants endpoint:');
    try {
      let allParticipants = [];
      let nextPageToken = '';
      let pageCount = 0;
      
      do {
        const params = {
          page_size: 300
        };
        
        if (nextPageToken) {
          params.next_page_token = nextPageToken;
        }
        
        const response = await axios.get(
          `https://api.zoom.us/v2/report/webinars/${testWebinarId}/participants`,
          {
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'Content-Type': 'application/json'
            },
            params
          }
        );
        
        const data = response.data;
        pageCount++;
        console.log(`  Page ${pageCount}: ${data.participants?.length || 0} participants`);
        console.log(`  Total records: ${data.total_records}`);
        console.log(`  Next page token: ${data.next_page_token ? 'Yes' : 'No'}`);
        
        if (data.participants) {
          allParticipants = allParticipants.concat(data.participants);
        }
        
        nextPageToken = data.next_page_token || '';
        
        // Rate limit protection
        if (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } while (nextPageToken);
      
      console.log(`\n  TOTAL from report endpoint: ${allParticipants.length} participants`);
      
      if (allParticipants.length > 0) {
        console.log('\n  Sample participant data:');
        console.log(JSON.stringify(allParticipants[0], null, 2));
      }
      
    } catch (error) {
      console.error('  Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 3: Check webinar details to understand the discrepancy
    console.log('\n\n3. Testing /webinars/{id} endpoint for details:');
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/webinars/${testWebinarId}`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = response.data;
      console.log('  Webinar details:');
      console.log(`    Topic: ${data.topic}`);
      console.log(`    Start time: ${data.start_time}`);
      console.log(`    Duration: ${data.duration} minutes`);
      console.log(`    Type: ${data.type}`);
      console.log(`    Status: ${data.status}`);
      console.log(`    Occurrences: ${data.occurrences?.length || 0}`);
      
    } catch (error) {
      console.error('  Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 4: Check if it's a recurring webinar with multiple occurrences
    console.log('\n\n4. Checking for webinar instances (if recurring):');
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
      
      const data = response.data;
      console.log(`  Found ${data.webinars?.length || 0} instances`);
      
      if (data.webinars && data.webinars.length > 0) {
        console.log('\n  Webinar instances:');
        data.webinars.forEach((instance, index) => {
          console.log(`    ${index + 1}. UUID: ${instance.uuid}`);
          console.log(`       Start: ${instance.start_time}`);
          console.log(`       Participants: Check separately with UUID`);
        });
      }
      
    } catch (error) {
      console.error('  Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Summary
    console.log('\n\n=== SUMMARY ===');
    console.log('The discrepancy between expected (2100) and actual participants might be due to:');
    console.log('1. Zoom API pagination limits');
    console.log('2. Recurring webinars needing instance-specific queries');
    console.log('3. Data retention policies (Zoom may not keep all participant data)');
    console.log('4. The total_attendees field might include duplicates or registrants');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testZoomAPIDirectly();
