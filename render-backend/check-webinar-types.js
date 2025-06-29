require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./services/zoomService');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWebinarTypes() {
  console.log('=== Checking Webinar Types and Participants ===\n');
  
  try {
    // Get active connection
    const { data: connection } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_status', 'active')
      .limit(1)
      .single();
    
    if (!connection) {
      console.log('❌ No active connection found');
      return;
    }
    
    console.log('✅ Found active connection\n');
    
    // Get credentials
    const { data: credentials } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', connection.user_id)
      .eq('is_active', true)
      .single();
    
    // Refresh token if needed
    const tokenExpiresAt = new Date(connection.token_expires_at);
    let accessToken = connection.access_token;
    
    if (tokenExpiresAt <= new Date()) {
      console.log('🔄 Refreshing token...');
      const tokenData = await zoomService.getServerToServerToken(
        credentials.client_id,
        credentials.client_secret,
        credentials.account_id
      );
      accessToken = tokenData.access_token;
      console.log('✅ Token refreshed\n');
    }
    
    // Check different webinar types
    const types = ['past', 'scheduled', 'live'];
    const webinarsByType = {};
    
    for (const type of types) {
      console.log(`📋 Fetching ${type} webinars...`);
      try {
        const response = await zoomService.getWebinars(accessToken, {
          type: type,
          page_size: 10
        });
        
        webinarsByType[type] = response.webinars || [];
        console.log(`  Found ${webinarsByType[type].length} ${type} webinars`);
        
        // Show first few
        webinarsByType[type].slice(0, 3).forEach(w => {
          console.log(`  - ${w.topic} (${w.start_time})`);
        });
        
      } catch (error) {
        console.log(`  ❌ Error fetching ${type}: ${error.message}`);
      }
      console.log('');
    }
    
    // Check if any past webinars have participants
    console.log('📋 Checking for participants in past webinars...\n');
    
    if (webinarsByType.past && webinarsByType.past.length > 0) {
      for (const webinar of webinarsByType.past.slice(0, 3)) {
        console.log(`Checking webinar: ${webinar.topic}`);
        console.log(`  ID: ${webinar.id}, UUID: ${webinar.uuid}`);
        
        try {
          // Try report endpoint
          const reportResponse = await zoomService.getWebinarParticipantsReport(
            webinar.uuid || webinar.id,
            accessToken,
            { page_size: 10 }
          );
          
          console.log(`  ✅ Report endpoint: ${reportResponse.total_records || 0} total participants`);
          
        } catch (error) {
          console.log(`  ❌ Report endpoint failed: ${error.response?.data?.message || error.message}`);
          
          // Try basic endpoint
          try {
            const basicResponse = await zoomService.getWebinarParticipants(
              webinar.id,
              accessToken,
              { page_size: 10 }
            );
            
            console.log(`  ✅ Basic endpoint: ${basicResponse.total_records || 0} total participants`);
            
          } catch (error2) {
            console.log(`  ❌ Basic endpoint failed: ${error2.response?.data?.message || error2.message}`);
          }
        }
        console.log('');
      }
    } else {
      console.log('❌ No past webinars found\n');
    }
    
    // Check scheduled webinars that have already occurred
    console.log('📋 Checking scheduled webinars that have already occurred...\n');
    
    const now = new Date();
    const pastScheduled = (webinarsByType.scheduled || []).filter(w => 
      new Date(w.start_time) < now
    );
    
    console.log(`Found ${pastScheduled.length} scheduled webinars that have already occurred\n`);
    
    for (const webinar of pastScheduled.slice(0, 3)) {
      console.log(`Checking webinar: ${webinar.topic}`);
      console.log(`  Start time: ${webinar.start_time}`);
      console.log(`  Status: ${webinar.status}`);
      
      try {
        const reportResponse = await zoomService.getWebinarParticipantsReport(
          webinar.uuid || webinar.id,
          accessToken,
          { page_size: 10 }
        );
        
        console.log(`  ✅ Found ${reportResponse.total_records || 0} participants`);
        
      } catch (error) {
        console.log(`  ❌ No participants found: ${error.response?.data?.message || error.message}`);
      }
      console.log('');
    }
    
    // Summary
    console.log('📊 Summary:');
    console.log(`- Past webinars: ${webinarsByType.past?.length || 0}`);
    console.log(`- Scheduled webinars: ${webinarsByType.scheduled?.length || 0}`);
    console.log(`- Live webinars: ${webinarsByType.live?.length || 0}`);
    console.log(`- Scheduled webinars that have occurred: ${pastScheduled.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkWebinarTypes();
