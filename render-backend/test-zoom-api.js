require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testZoomParticipantsAPI() {
  try {
    console.log('Starting Zoom API test...\n');
    
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
    
    // Get a recent webinar to test with
    const { data: webinar, error: webError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('connection_id', connection.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (webError) {
      console.error('Error fetching webinar:', webError);
      return;
    }
    
    console.log(`\nTesting with webinar: ${webinar.topic}`);
    console.log(`Webinar ID: ${webinar.webinar_id}`);
    
    // Test different endpoints
    const endpoints = [
      `/past_webinars/${webinar.webinar_id}/participants`,
      `/report/webinars/${webinar.webinar_id}/participants`,
      `/metrics/webinars/${webinar.webinar_id}/participants`
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n\n===== Testing endpoint: ${endpoint} =====\n`);
      
      try {
        const response = await axios.get(
          `https://api.zoom.us/v2${endpoint}`,
          {
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'Content-Type': 'application/json'
            },
            params: {
              page_size: 30,
              page_number: 1
            }
          }
        );
        
        console.log('Response status:', response.status);
        console.log('Total participants:', response.data.total_records || response.data.participants?.length || 0);
        
        if (response.data.participants && response.data.participants.length > 0) {
          console.log('\nSample participant data:');
          const participant = response.data.participants[0];
          console.log(JSON.stringify(participant, null, 2));
          
          // Check what fields are available
          console.log('\nAvailable fields:');
          const fields = Object.keys(participant);
          fields.forEach(field => {
            const value = participant[field];
            console.log(`- ${field}: ${typeof value} (${value === null ? 'null' : value === '' ? 'empty' : 'has value'})`);
          });
        }
        
      } catch (error) {
        console.log('Error:', error.response?.status, error.response?.data?.message || error.message);
      }
    }
    
    // Also test Q&A and Polls
    console.log(`\n\n===== Testing Q&A endpoint =====\n`);
    try {
      const qaResponse = await axios.get(
        `https://api.zoom.us/v2/past_webinars/${webinar.webinar_id}/qa`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Q&A Response:', JSON.stringify(qaResponse.data, null, 2));
    } catch (error) {
      console.log('Q&A Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    console.log(`\n\n===== Testing Polls endpoint =====\n`);
    try {
      const pollResponse = await axios.get(
        `https://api.zoom.us/v2/past_webinars/${webinar.webinar_id}/polls`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Poll Response:', JSON.stringify(pollResponse.data, null, 2));
    } catch (error) {
      console.log('Poll Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testZoomParticipantsAPI();
