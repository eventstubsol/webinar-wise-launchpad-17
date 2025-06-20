// Test script for Zoom webinar sync edge function
// Run this script using: node test-webinar-sync.js

const SUPABASE_URL = 'https://guwvvinnifypcxwbcnzz.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/zoom-sync-webinars`;

// You need to get these values from your app
const ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Get from your Supabase dashboard
const USER_ACCESS_TOKEN = 'YOUR_USER_ACCESS_TOKEN'; // Get from localStorage after logging in
const CONNECTION_ID = 'YOUR_ZOOM_CONNECTION_ID'; // Get from the zoom_connections table

async function testWebinarSync() {
  console.log('🚀 Testing Zoom webinar sync edge function...\n');
  
  // Check if credentials are set
  if (ANON_KEY === 'YOUR_SUPABASE_ANON_KEY' || 
      USER_ACCESS_TOKEN === 'YOUR_USER_ACCESS_TOKEN' || 
      CONNECTION_ID === 'YOUR_ZOOM_CONNECTION_ID') {
    console.error('❌ Please update the credentials in this script before running!');
    console.log('\nTo get these values:');
    console.log('1. ANON_KEY: Go to your Supabase dashboard > Settings > API');
    console.log('2. USER_ACCESS_TOKEN: In your app, open DevTools console and run:');
    console.log('   const { data: { session } } = await supabase.auth.getSession();');
    console.log('   console.log(session.access_token);');
    console.log('3. CONNECTION_ID: Run this SQL in Supabase SQL editor:');
    console.log('   SELECT id, zoom_email FROM zoom_connections WHERE user_id = \'YOUR_USER_ID\';');
    return;
  }

  try {
    console.log('📡 Calling edge function...');
    console.log(`URL: ${EDGE_FUNCTION_URL}`);
    console.log(`Connection ID: ${CONNECTION_ID}`);
    console.log('');
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${USER_ACCESS_TOKEN}`,
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
        'zoom_connection_id': CONNECTION_ID,
        'test_mode': 'false'
      }
    });

    const responseText = await response.text();
    console.log(`Response Status: ${response.status} ${response.statusText}`);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('');

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log('Raw Response:', responseText);
      return;
    }

    if (response.ok) {
      console.log('✅ Sync started successfully!');
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (data.syncId) {
        console.log(`\n📊 Monitor sync progress with sync ID: ${data.syncId}`);
        console.log('Run this SQL query to check status:');
        console.log(`SELECT * FROM zoom_sync_logs WHERE id = '${data.syncId}';`);
      }
    } else {
      console.error('❌ Sync failed!');
      console.error('Error:', JSON.stringify(data, null, 2));
      
      if (data.error && data.error.includes('Authentication failed')) {
        console.log('\n🔑 Authentication issue detected. Your access token may be expired.');
        console.log('Please log out and log back in to get a fresh token.');
      }
    }

  } catch (error) {
    console.error('💥 Request failed:', error.message);
    console.error(error);
  }
}

// Helper function to check sync status
async function checkSyncStatus(syncId) {
  // This would need to be run in your app or via Supabase client
  console.log('\n📊 To check sync status, run this in your app console:');
  console.log(`
const { data, error } = await supabase
  .from('zoom_sync_logs')
  .select('*')
  .eq('id', '${syncId}')
  .single();
console.log(data);
  `);
}

// Run the test
testWebinarSync();
