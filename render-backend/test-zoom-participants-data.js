// test-zoom-participants-data.js
require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testZoomParticipantsData() {
  try {
    console.log('=== ZOOM PARTICIPANTS DATA TEST ===\n');
    
    // Get a connection with valid token
    const { data: connection, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_type', 'server_to_server')
      .single();
    
    if (connError) {
      console.error('Error fetching connection:', connError);
      return;
    }
    
    console.log('Found connection:', connection.account_id);
    
    // Get a past webinar to test with
    const { data: webinar, error: webError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('connection_id', connection.id)
      .not('status', 'eq', 'scheduled')
      .order('start_time', { ascending: false })
      .limit(1)
      .single();
    
    if (webError) {
      console.error('Error fetching webinar:', webError);
      return;
    }
    
    console.log(`\nTesting with webinar: ${webinar.topic}`);
    console.log(`Webinar ID: ${webinar.webinar_id}`);
    console.log(`Status: ${webinar.status}`);
    console.log(`Start Time: ${webinar.start_time}`);
    
    // Test 1: Past Webinars Participants Endpoint
    console.log('\n\n========== TEST 1: /past_webinars/{id}/participants ==========\n');
    
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/past_webinars/${webinar.webinar_id}/participants`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          },
          params: {
            page_size: 300,
            page_number: 1
          }
        }
      );
      
      console.log('Response status:', response.status);
      console.log('Total participants:', response.data.total_records || 0);
      console.log('Page count:', response.data.page_count);
      console.log('Page size:', response.data.page_size);
      
      if (response.data.participants && response.data.participants.length > 0) {
        console.log(`\nShowing first 3 participants out of ${response.data.participants.length}:\n`);
        
        response.data.participants.slice(0, 3).forEach((participant, index) => {
          console.log(`\n--- Participant ${index + 1} ---`);
          console.log(JSON.stringify(participant, null, 2));
        });
        
        // Analyze all available fields
        const allFields = new Set();
        const fieldValues = {};
        
        response.data.participants.forEach(p => {
          Object.keys(p).forEach(key => {
            allFields.add(key);
            if (!fieldValues[key]) fieldValues[key] = { hasValue: 0, isNull: 0, isEmpty: 0 };
            
            if (p[key] === null) {
              fieldValues[key].isNull++;
            } else if (p[key] === '' || p[key] === 0 || p[key] === false) {
              fieldValues[key].isEmpty++;
            } else {
              fieldValues[key].hasValue++;
            }
          });
        });
        
        console.log('\n\n=== FIELD ANALYSIS ===');
        console.log('Available fields and data population:');
        Array.from(allFields).sort().forEach(field => {
          const stats = fieldValues[field];
          const total = response.data.participants.length;
          const hasValuePct = ((stats.hasValue / total) * 100).toFixed(1);
          console.log(`- ${field}: ${hasValuePct}% populated (${stats.hasValue} values, ${stats.isNull} nulls, ${stats.isEmpty} empty)`);
        });
      }
      
    } catch (error) {
      console.error('Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 2: Webinar Participants Report Endpoint
    console.log('\n\n========== TEST 2: /report/webinars/{id}/participants ==========\n');
    
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/report/webinars/${webinar.webinar_id}/participants`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          },
          params: {
            page_size: 300
          }
        }
      );
      
      console.log('Response status:', response.status);
      console.log('Total participants:', response.data.total_records || 0);
      
      if (response.data.participants && response.data.participants.length > 0) {
        console.log(`\nShowing first 3 participants:\n`);
        
        response.data.participants.slice(0, 3).forEach((participant, index) => {
          console.log(`\n--- Participant ${index + 1} ---`);
          console.log(JSON.stringify(participant, null, 2));
        });
        
        // Analyze fields
        const allFields = new Set();
        response.data.participants.forEach(p => {
          Object.keys(p).forEach(key => allFields.add(key));
        });
        
        console.log('\n\nAvailable fields in report endpoint:');
        Array.from(allFields).sort().forEach(field => {
          console.log(`- ${field}`);
        });
      }
      
    } catch (error) {
      console.error('Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 3: Webinar Registrants
    console.log('\n\n========== TEST 3: /webinars/{id}/registrants ==========\n');
    
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/webinars/${webinar.webinar_id}/registrants`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          },
          params: {
            page_size: 300,
            status: 'approved'
          }
        }
      );
      
      console.log('Response status:', response.status);
      console.log('Total registrants:', response.data.total_records || 0);
      
      if (response.data.registrants && response.data.registrants.length > 0) {
        console.log('\nSample registrant:');
        console.log(JSON.stringify(response.data.registrants[0], null, 2));
      }
      
    } catch (error) {
      console.error('Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 4: Webinar Absentees
    console.log('\n\n========== TEST 4: /past_webinars/{id}/absentees ==========\n');
    
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/past_webinars/${webinar.webinar_id}/absentees`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          },
          params: {
            page_size: 300
          }
        }
      );
      
      console.log('Response status:', response.status);
      console.log('Total absentees:', response.data.total_records || 0);
      
    } catch (error) {
      console.error('Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 5: Q&A
    console.log('\n\n========== TEST 5: /past_webinars/{id}/qa ==========\n');
    
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/past_webinars/${webinar.webinar_id}/qa`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.error('Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 6: Polls
    console.log('\n\n========== TEST 6: /past_webinars/{id}/polls ==========\n');
    
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/past_webinars/${webinar.webinar_id}/polls`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.error('Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Summary
    console.log('\n\n========== SUMMARY ==========\n');
    console.log('Based on the API responses, here are the recommendations:');
    console.log('1. The /past_webinars/{id}/participants endpoint provides the core participant data');
    console.log('2. Additional endpoints may provide supplementary data but are not always available');
    console.log('3. Focus on properly mapping the fields that are actually returned by the API');
    console.log('4. Handle pagination for webinars with >300 participants');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testZoomParticipantsData();