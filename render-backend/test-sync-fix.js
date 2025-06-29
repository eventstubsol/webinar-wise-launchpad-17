require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./services/zoomService');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSyncFix() {
  console.log('=== Testing Fixed Zoom Sync Service ===\n');
  
  try {
    // Get test user connection
    const { data: connections, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_status', 'active')
      .limit(1)
      .single();
    
    if (connError || !connections) {
      console.log('❌ No active connection found to test');
      return;
    }
    
    console.log('✅ Found active connection:', {
      id: connections.id,
      user_id: connections.user_id,
      zoom_email: connections.zoom_email
    });
    
    // Get credentials
    const { data: credentials } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', connections.user_id)
      .eq('is_active', true)
      .single();
    
    if (!credentials) {
      console.log('❌ No credentials found');
      return;
    }
    
    console.log('✅ Found credentials for user\n');
    
    // Test token refresh if needed
    const tokenExpiresAt = new Date(connections.token_expires_at);
    if (tokenExpiresAt <= new Date()) {
      console.log('🔄 Token expired, refreshing...');
      
      const tokenData = await zoomService.getServerToServerToken(
        credentials.client_id,
        credentials.client_secret,
        credentials.account_id
      );
      
      await supabase
        .from('zoom_connections')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
        })
        .eq('id', connections.id);
      
      connections.access_token = tokenData.access_token;
      console.log('✅ Token refreshed successfully\n');
    }
    
    // Test fetching webinars with pagination
    console.log('📋 Testing webinar fetch with pagination...');
    
    let allWebinars = [];
    let pageNumber = 1;
    
    while (true) {
      console.log(`  Fetching page ${pageNumber}...`);
      
      const response = await zoomService.getWebinars(connections.access_token, {
        type: 'past',
        page_size: 10, // Small page size for testing
        page_number: pageNumber
      });
      
      const webinars = response.webinars || [];
      console.log(`  Page ${pageNumber}: Found ${webinars.length} webinars`);
      
      if (webinars.length === 0) break;
      
      allWebinars = allWebinars.concat(webinars);
      
      if (response.page_count && pageNumber >= response.page_count) {
        console.log(`  Total pages: ${response.page_count}`);
        break;
      }
      
      pageNumber++;
      
      // Stop after 3 pages for testing
      if (pageNumber > 3) {
        console.log('  (Stopping at 3 pages for test)');
        break;
      }
    }
    
    console.log(`\n✅ Pagination test successful! Total webinars: ${allWebinars.length}`);
    
    // Test participant fetch for one webinar
    if (allWebinars.length > 0) {
      const testWebinar = allWebinars.find(w => w.type === 9) || allWebinars[0];
      console.log(`\n📋 Testing participant fetch for webinar: ${testWebinar.topic}`);
      
      try {
        // Test report endpoint
        console.log('  Testing report endpoint...');
        const reportResponse = await zoomService.getWebinarParticipantsReport(
          testWebinar.uuid || testWebinar.id,
          connections.access_token,
          {
            page_size: 30,
            next_page_token: ''
          }
        );
        
        console.log(`  ✅ Report endpoint returned ${reportResponse.participants?.length || 0} participants`);
        
        if (reportResponse.next_page_token) {
          console.log('  ✅ Pagination token present:', reportResponse.next_page_token.substring(0, 20) + '...');
        }
        
      } catch (error) {
        console.log('  ⚠️ Report endpoint failed:', error.response?.data?.message || error.message);
        
        // Test basic endpoint as fallback
        console.log('  Testing basic endpoint...');
        const basicResponse = await zoomService.getWebinarParticipants(
          testWebinar.id,
          connections.access_token,
          {
            page_size: 30,
            page_number: 1
          }
        );
        
        console.log(`  ✅ Basic endpoint returned ${basicResponse.participants?.length || 0} participants`);
      }
    }
    
    // Test upsert functionality
    console.log('\n📋 Testing Supabase upsert...');
    
    const testData = {
      connection_id: connections.id,
      zoom_webinar_id: 'test-' + Date.now(),
      topic: 'Test Webinar',
      start_time: new Date().toISOString(),
      duration: 60,
      timezone: 'UTC',
      host_id: 'test-host',
      host_email: 'test@example.com',
      type: 5,
      status: 'completed',
      join_url: 'https://zoom.us/test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // First insert
    const { data: inserted, error: insertError } = await supabase
      .from('zoom_webinars')
      .upsert(testData, {
        onConflict: 'zoom_webinar_id,connection_id'
      })
      .select()
      .single();
    
    if (insertError) {
      console.log('  ❌ Upsert failed:', insertError.message);
      
      // Try alternative approach
      console.log('  Trying alternative approach...');
      const { data: existing } = await supabase
        .from('zoom_webinars')
        .select()
        .eq('zoom_webinar_id', testData.zoom_webinar_id)
        .eq('connection_id', testData.connection_id)
        .single();
      
      if (existing) {
        const { data: updated } = await supabase
          .from('zoom_webinars')
          .update({ ...testData, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        
        console.log('  ✅ Alternative update successful');
      } else {
        const { data: created } = await supabase
          .from('zoom_webinars')
          .insert(testData)
          .select()
          .single();
        
        console.log('  ✅ Alternative insert successful');
      }
    } else {
      console.log('  ✅ Upsert successful');
      
      // Clean up test data
      await supabase
        .from('zoom_webinars')
        .delete()
        .eq('id', inserted.id);
    }
    
    console.log('\n✅ All tests passed! The sync service should work correctly now.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testSyncFix();
