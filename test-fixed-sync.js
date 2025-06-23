const fetch = require('node-fetch');
require('dotenv').config();

async function testZoomSyncWithFix() {
  console.log('🧪 Testing Fixed Zoom Sync Function...\n');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables');
    return;
  }
  
  // First, get a valid session token
  console.log('🔐 Getting authentication token...');
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      email: process.env.TEST_USER_EMAIL || 'your-email@example.com',
      password: process.env.TEST_USER_PASSWORD || 'your-password'
    })
  });
  
  if (!authResponse.ok) {
    console.error('❌ Authentication failed. Please set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env');
    return;
  }
  
  const authData = await authResponse.json();
  const accessToken = authData.access_token;
  console.log('✅ Authentication successful\n');
  
  // Get the first Zoom connection
  console.log('🔍 Finding Zoom connection...');
  const connectionsResponse = await fetch(`${supabaseUrl}/rest/v1/zoom_connections?select=*&limit=1`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': supabaseAnonKey
    }
  });
  
  if (!connectionsResponse.ok) {
    console.error('❌ Failed to fetch Zoom connections');
    return;
  }
  
  const connections = await connectionsResponse.json();
  if (connections.length === 0) {
    console.error('❌ No Zoom connections found');
    return;
  }
  
  const connectionId = connections[0].id;
  console.log(`✅ Using Zoom connection: ${connectionId}\n`);
  
  // Test the sync function with test_mode header
  console.log('🚀 Testing sync with test_mode=true...');
  console.log('📋 Request details:');
  console.log(`  - URL: ${supabaseUrl}/functions/v1/zoom-sync-webinars`);
  console.log(`  - Headers: Authorization, zoom_connection_id, test_mode`);
  console.log('');
  
  const syncResponse = await fetch(`${supabaseUrl}/functions/v1/zoom-sync-webinars`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'zoom_connection_id': connectionId,
      'test_mode': 'true' // This should no longer cause CORS error
    }
  });
  
  console.log(`📊 Response Status: ${syncResponse.status} ${syncResponse.statusText}`);
  console.log(`📋 Response Headers:`, Object.fromEntries(syncResponse.headers.entries()));
  
  const result = await syncResponse.json();
  console.log('\n📦 Response Body:', JSON.stringify(result, null, 2));
  
  if (syncResponse.ok && result.success) {
    console.log('\n✅ SUCCESS! The fix is working:');
    console.log(`  - No CORS error (test_mode header accepted)`);
    console.log(`  - Processed Items: ${result.processedItems || 0}`);
    console.log(`  - Total Items: ${result.totalItems || 0}`);
    
    // Check the sync log for verification
    if (result.syncId) {
      console.log(`\n🔍 Checking sync log ${result.syncId}...`);
      const logResponse = await fetch(
        `${supabaseUrl}/rest/v1/zoom_sync_logs?id=eq.${result.syncId}&select=*`, 
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': supabaseAnonKey
          }
        }
      );
      
      if (logResponse.ok) {
        const logs = await logResponse.json();
        if (logs.length > 0) {
          const log = logs[0];
          console.log(`  - Sync Status: ${log.sync_status}`);
          console.log(`  - Processed Items: ${log.processed_items}`);
          console.log(`  - Total Items: ${log.total_items}`);
          
          if (log.processed_items === log.total_items && log.processed_items > 0) {
            console.log('\n🎉 PERFECT! The processed count is now correct!');
          } else if (log.processed_items === 0 && log.total_items > 0) {
            console.log('\n⚠️  The count issue might still exist. Check the edge function logs.');
          }
        }
      }
    }
  } else {
    console.error('\n❌ Sync failed:', result.error || result.details);
  }
}

// Run the test
testZoomSyncWithFix().catch(console.error);
