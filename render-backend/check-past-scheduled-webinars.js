require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./services/zoomService');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPastScheduledWebinars() {
  console.log('=== Checking Past Webinars with Scheduled Status ===\n');
  
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
    
    // Get webinars that have occurred but show as scheduled
    const { data: pastScheduledWebinars } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('connection_id', connection.id)
      .eq('status', 'scheduled')
      .lt('start_time', new Date().toISOString())
      .order('start_time', { ascending: false })
      .limit(10);
    
    console.log(`Found ${pastScheduledWebinars.length} webinars that have occurred but show as scheduled\n`);
    
    const webinarsWithParticipants = [];
    
    for (const webinar of pastScheduledWebinars) {
      console.log(`📋 Checking: ${webinar.topic}`);
      console.log(`   Start time: ${webinar.start_time}`);
      console.log(`   Status: ${webinar.status}`);
      console.log(`   ID: ${webinar.zoom_webinar_id}`);
      
      let participantCount = 0;
      let hasParticipants = false;
      
      // Try multiple methods to get participants
      
      // Method 1: Report endpoint with UUID
      if (webinar.zoom_uuid || webinar.webinar_uuid) {
        try {
          const response = await zoomService.getWebinarParticipantsReport(
            webinar.zoom_uuid || webinar.webinar_uuid,
            accessToken,
            { page_size: 10 }
          );
          
          participantCount = response.total_records || 0;
          hasParticipants = participantCount > 0;
          console.log(`   ✅ Report (UUID): ${participantCount} participants found`);
          
        } catch (error) {
          console.log(`   ⚠️  Report (UUID) failed: ${error.response?.data?.message || error.message}`);
        }
      }
      
      // Method 2: Report endpoint with ID
      if (!hasParticipants) {
        try {
          const response = await zoomService.getWebinarParticipantsReport(
            webinar.zoom_webinar_id,
            accessToken,
            { page_size: 10 }
          );
          
          participantCount = response.total_records || 0;
          hasParticipants = participantCount > 0;
          console.log(`   ✅ Report (ID): ${participantCount} participants found`);
          
        } catch (error) {
          console.log(`   ⚠️  Report (ID) failed: ${error.response?.data?.message || error.message}`);
        }
      }
      
      // Method 3: Basic participants endpoint
      if (!hasParticipants) {
        try {
          const response = await zoomService.getWebinarParticipants(
            webinar.zoom_webinar_id,
            accessToken,
            { page_size: 10 }
          );
          
          participantCount = response.total_records || 0;
          hasParticipants = participantCount > 0;
          console.log(`   ✅ Basic endpoint: ${participantCount} participants found`);
          
        } catch (error) {
          console.log(`   ⚠️  Basic endpoint failed: ${error.response?.data?.message || error.message}`);
        }
      }
      
      // Method 4: Check for instances (recurring webinars)
      if (!hasParticipants) {
        try {
          const instances = await zoomService.getWebinarInstances(
            webinar.zoom_webinar_id,
            accessToken
          );
          
          if (instances.webinars && instances.webinars.length > 0) {
            console.log(`   📅 Found ${instances.webinars.length} instances (recurring webinar)`);
            
            // Check first instance for participants
            for (const instance of instances.webinars.slice(0, 2)) {
              try {
                const response = await zoomService.getWebinarParticipantsReport(
                  instance.uuid,
                  accessToken,
                  { page_size: 10 }
                );
                
                const instanceParticipants = response.total_records || 0;
                if (instanceParticipants > 0) {
                  console.log(`   ✅ Instance ${instance.start_time}: ${instanceParticipants} participants`);
                  hasParticipants = true;
                  participantCount += instanceParticipants;
                }
                
              } catch (error) {
                // Silent fail for instances
              }
            }
          }
        } catch (error) {
          // Not a recurring webinar
        }
      }
      
      if (hasParticipants) {
        webinarsWithParticipants.push({
          ...webinar,
          participantCount
        });
        console.log(`   ✨ TOTAL: ${participantCount} participants\n`);
      } else {
        console.log(`   ❌ No participants found\n`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`- Total past webinars checked: ${pastScheduledWebinars.length}`);
    console.log(`- Webinars with participants: ${webinarsWithParticipants.length}`);
    
    if (webinarsWithParticipants.length > 0) {
      console.log('\n✅ Webinars that have participants:');
      webinarsWithParticipants.forEach(w => {
        console.log(`  - ${w.topic} (${w.participantCount} participants)`);
      });
    }
    
    // Update database for webinars with participants
    if (webinarsWithParticipants.length > 0) {
      console.log('\n🔄 Updating database...');
      
      for (const webinar of webinarsWithParticipants) {
        await supabase
          .from('zoom_webinars')
          .update({
            participant_sync_status: 'ready_to_sync',
            actual_participant_count: webinar.participantCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', webinar.id);
      }
      
      console.log('✅ Database updated. Run sync again to fetch participant details.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkPastScheduledWebinars();
