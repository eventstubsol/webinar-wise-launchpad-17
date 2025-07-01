require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testZoomEndpoints(webinarId, accessToken) {
  console.log(`\nTesting different Zoom API endpoints for webinar ${webinarId}:`);
  
  const endpoints = [
    `/webinars/${webinarId}/registrants`,
    `/past_webinars/${webinarId}/participants`,
    `/report/webinars/${webinarId}/participants`,
    `/metrics/webinars/${webinarId}/participants`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\nTrying: https://api.zoom.us/v2${endpoint}`);
      const response = await axios.get(`https://api.zoom.us/v2${endpoint}?page_size=300`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      console.log(`✓ Success! Status: ${response.status}`);
      console.log(`Total records: ${response.data.total_records || response.data.participants?.length || 0}`);
      
      // Show first few participants
      if (response.data.participants) {
        console.log(`Sample participants:`);
        response.data.participants.slice(0, 3).forEach(p => {
          console.log(`  - ${p.name || p.display_name} (${p.email || 'no email'})`);
        });
      } else if (response.data.registrants) {
        console.log(`Sample registrants:`);
        response.data.registrants.slice(0, 3).forEach(r => {
          console.log(`  - ${r.first_name} ${r.last_name} (${r.email})`);
        });
      }
      
    } catch (error) {
      console.log(`✗ Failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
  }
}

async function main() {
  console.log('=== ZOOM API ENDPOINT TESTER ===\n');
  
  // Get a problematic webinar
  const { data: webinar } = await supabase
    .from('zoom_webinars')
    .select('*')
    .eq('zoom_webinar_id', '82293193909') // The one with 2815 registrants
    .single();
    
  if (!webinar) {
    console.log('Webinar not found');
    return;
  }
  
  console.log(`Testing webinar: ${webinar.topic}`);
  console.log(`Registrants: ${webinar.total_registrants}, Current attendees: ${webinar.total_attendees}`);
  
  // Get connection
  const { data: connection } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('id', webinar.connection_id)
    .single();
    
  if (!connection) {
    console.log('Connection not found');
    return;
  }
  
  // Test different endpoints
  await testZoomEndpoints(webinar.zoom_webinar_id, connection.access_token);
  
  // Also try with UUID if available
  if (webinar.uuid) {
    console.log(`\n\nTesting with UUID: ${webinar.uuid}`);
    await testZoomEndpoints(encodeURIComponent(webinar.uuid), connection.access_token);
  }
}

main().catch(console.error);
