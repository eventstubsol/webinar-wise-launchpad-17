require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./services/zoomService');
const { syncWebinars } = require('./services/zoomSyncService');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCompleteFix() {
  try {
    console.log('=== TESTING ZOOM SYNC COMPLETE FIX ===\n');
    
    // 1. Get connection and credentials
    const { data: connection } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_status', 'active')
      .single();
    
    const { data: credentials } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', connection.user_id)
      .eq('is_active', true)
      .single();
    
    // 2. Get fresh token
    console.log('Getting fresh access token...');
    const tokenData = await zoomService.getServerToServerToken(
      credentials.client_id,
      credentials.client_secret,
      credentials.account_id
    );
    
    const accessToken = tokenData.access_token;
    console.log('Got access token\n');
    
    // 3. Test getting users
    console.log('=== TESTING USER ENUMERATION ===');
    const usersResponse = await zoomService.getUsers(accessToken);
    console.log(`Found ${usersResponse.users.length} users:`);
    
    usersResponse.users.forEach(user => {
      console.log(`- ${user.email} (${user.id}) - Type: ${user.type}`);
    });
    
    // 4. Test getting webinars for each user
    console.log('\n=== TESTING WEBINAR FETCHING PER USER ===');
    let totalWebinars = 0;
    
    for (const user of usersResponse.users) {
      console.log(`\nChecking webinars for ${user.email}:`);
      
      for (const type of ['scheduled', 'past']) {
        try {
          const webinarsResponse = await zoomService.getUserWebinars(user.id, accessToken, {
            type: type,
            page_size: 10
          });
          
          if (webinarsResponse.total_records > 0) {
            console.log(`  ${type}: ${webinarsResponse.total_records} webinars`);
            totalWebinars += webinarsResponse.total_records;
            
            // Show first webinar as example
            if (webinarsResponse.webinars && webinarsResponse.webinars.length > 0) {
              const firstWebinar = webinarsResponse.webinars[0];
              console.log(`    Example: "${firstWebinar.topic}" on ${firstWebinar.start_time}`);
            }
          }
        } catch (error) {
          // User might not have webinar permissions
          if (error.response?.status !== 400) {
            console.error(`  Error: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`\nTotal webinars found across all users: ${totalWebinars}`);
    
    // 5. Test getting full webinar details
    console.log('\n=== TESTING WEBINAR DETAIL FETCHING ===');
    
    // Find a webinar to test with
    let testWebinar = null;
    for (const user of usersResponse.users) {
      try {
        const response = await zoomService.getUserWebinars(user.id, accessToken, {
          type: 'scheduled',
          page_size: 1
        });
        
        if (response.webinars && response.webinars.length > 0) {
          testWebinar = response.webinars[0];
          break;
        }
      } catch (error) {
        // Continue to next user
      }
    }
    
    if (testWebinar) {
      console.log(`\nFetching details for webinar: ${testWebinar.topic}`);
      console.log('Fields from LIST endpoint:');
      console.log(`- host_email: ${testWebinar.host_email || 'NOT PRESENT'}`);
      console.log(`- registration_url: ${testWebinar.registration_url || 'NOT PRESENT'}`);
      console.log(`- h323_password: ${testWebinar.h323_password || 'NOT PRESENT'}`);
      
      // Get full details
      const fullDetails = await zoomService.getWebinar(testWebinar.id, accessToken);
      
      console.log('\nFields from DETAIL endpoint:');
      console.log(`- host_email: ${fullDetails.host_email || 'NOT PRESENT'}`);
      console.log(`- registration_url: ${fullDetails.registration_url || 'NOT PRESENT'}`);
      console.log(`- h323_password: ${fullDetails.h323_password || 'NOT PRESENT'}`);
      console.log(`- pstn_password: ${fullDetails.pstn_password || 'NOT PRESENT'}`);
      console.log(`- encrypted_password: ${fullDetails.encrypted_password || 'NOT PRESENT'}`);
      console.log(`- recurrence: ${fullDetails.recurrence ? 'PRESENT' : 'NOT PRESENT'}`);
      console.log(`- occurrences: ${fullDetails.occurrences ? 'PRESENT' : 'NOT PRESENT'}`);
    }
    
    // 6. Test the actual sync function
    console.log('\n\n=== TESTING FULL SYNC FUNCTION ===');
    console.log('Running sync with progress tracking...\n');
    
    const syncResults = await syncWebinars({
      connection: { ...connection, access_token: accessToken },
      credentials,
      syncLogId: 'test-sync-' + Date.now(),
      syncType: 'manual',
      onProgress: (progress, message) => {
        console.log(`[${progress}%] ${message}`);
      }
    });
    
    console.log('\n=== SYNC RESULTS ===');
    console.log(`Total webinars found: ${syncResults.totalWebinars}`);
    console.log(`Webinars processed: ${syncResults.processedWebinars}`);
    console.log(`Errors: ${syncResults.errors.length}`);
    
    if (syncResults.errors.length > 0) {
      console.log('\nErrors encountered:');
      syncResults.errors.forEach(err => {
        console.log(`- Webinar ${err.webinar_id}: ${err.error}`);
      });
    }
    
    // 7. Verify database update
    console.log('\n=== VERIFYING DATABASE UPDATE ===');
    const { data: dbCheck } = await supabase
      .from('zoom_webinars')
      .select(`
        COUNT(*) as total,
        COUNT(CASE WHEN host_email IS NOT NULL AND host_email != '' THEN 1 END) as has_host_email,
        COUNT(CASE WHEN registration_url IS NOT NULL THEN 1 END) as has_registration_url,
        COUNT(CASE WHEN h323_password IS NOT NULL THEN 1 END) as has_h323_password
      `)
      .eq('connection_id', connection.id)
      .single();
    
    console.log('Database statistics:');
    console.log(`- Total webinars: ${dbCheck.total}`);
    console.log(`- With host_email: ${dbCheck.has_host_email}`);
    console.log(`- With registration_url: ${dbCheck.has_registration_url}`);
    console.log(`- With h323_password: ${dbCheck.has_h323_password}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error.response?.data) {
      console.error('API Error:', error.response.data);
    }
  }
}

// Run the test
testCompleteFix();
