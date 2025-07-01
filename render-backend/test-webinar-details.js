require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./services/zoomService');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWebinarDetails() {
  try {
    console.log('Testing Webinar Details API...\n');
    
    // Get a connection with valid token
    const { data: connection, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_type', 'server_to_server')
      .limit(1)
      .single();
    
    if (connError) {
      console.error('Error fetching connection:', connError);
      return;
    }
    
    console.log('Found connection:', connection.account_id);
    
    // Get a sample webinar
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
    console.log(`Webinar ID: ${webinar.zoom_webinar_id}`);
    
    // Test 1: Get webinar list data
    console.log('\n===== WEBINAR LIST DATA =====');
    try {
      const listData = await zoomService.getWebinars(connection.access_token, {
        page_size: 1,
        type: 'scheduled'
      });
      
      if (listData.webinars && listData.webinars.length > 0) {
        const listWebinar = listData.webinars[0];
        console.log('\nFields from LIST endpoint:');
        Object.keys(listWebinar).forEach(key => {
          console.log(`- ${key}: ${typeof listWebinar[key]} = ${JSON.stringify(listWebinar[key])}`);
        });
      }
    } catch (error) {
      console.error('List error:', error.message);
    }
    
    // Test 2: Get webinar detail data
    console.log('\n\n===== WEBINAR DETAIL DATA =====');
    try {
      const detailData = await zoomService.getWebinar(webinar.zoom_webinar_id, connection.access_token);
      
      console.log('\nFields from DETAIL endpoint:');
      Object.keys(detailData).forEach(key => {
        console.log(`- ${key}: ${typeof detailData[key]} = ${JSON.stringify(detailData[key])}`);
      });
      
      // Check specific fields we're looking for
      console.log('\n\n===== MISSING FIELDS CHECK =====');
      const missingFields = [
        'host_email',
        'registration_url',
        'h323_password',
        'pstn_password',
        'encrypted_password',
        'recurrence',
        'occurrences'
      ];
      
      missingFields.forEach(field => {
        const value = detailData[field];
        console.log(`${field}: ${value ? 'FOUND' : 'NOT FOUND'} = ${JSON.stringify(value)}`);
      });
      
      // Check if password fields might be in settings
      if (detailData.settings) {
        console.log('\n\n===== SETTINGS OBJECT =====');
        Object.keys(detailData.settings).forEach(key => {
          console.log(`settings.${key}: ${JSON.stringify(detailData.settings[key])}`);
        });
      }
      
    } catch (error) {
      console.error('Detail error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testWebinarDetails();
