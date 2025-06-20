import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// Configuration
const SUPABASE_URL = 'https://guwvvinnifypcxwbcnzz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Z2aW5uaWZ5cGN4d2Jjbnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MTExNjMsImV4cCI6MjA2NTE4NzE2M30.qdpRw5EtaW1HGYCkHPN1IK4_JIDPSnQuUfNTIpZwrJg';

// Test credentials - you'll need to update these with actual values
const USER_JWT = process.env.USER_JWT || ''; // You need to get this from your browser session
const CONNECTION_ID = 'e03a3898-2e4d-4e69-a03e-2faf34d1f418'; // Your connection ID

async function testWebinarSync() {
  if (!USER_JWT) {
    console.error('❌ Please set USER_JWT environment variable with your session token');
    console.log('You can get this from your browser by:');
    console.log('1. Open the application in your browser');
    console.log('2. Open Developer Tools (F12)');
    console.log('3. Go to Application/Storage > Local Storage');
    console.log('4. Find the key starting with "sb-" and copy the access_token value');
    process.exit(1);
  }

  console.log('🚀 Testing Zoom Webinar Sync...');
  console.log('📍 Supabase URL:', SUPABASE_URL);
  console.log('🔗 Connection ID:', CONNECTION_ID);
  
  try {
    // First, check if we can see existing webinars
    console.log('\n📊 Checking existing webinars...');
    const webinarsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/zoom_webinars?connection_id=eq.${CONNECTION_ID}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${USER_JWT}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!webinarsResponse.ok) {
      throw new Error(`Failed to fetch webinars: ${webinarsResponse.status} ${webinarsResponse.statusText}`);
    }
    
    const existingWebinars = await webinarsResponse.json();
    console.log(`✅ Found ${existingWebinars.length} existing webinars`);
    
    // Call the edge function to sync webinars
    console.log('\n🔄 Starting webinar sync...');
    const syncResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/zoom-sync-webinars`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${USER_JWT}`,
          'Content-Type': 'application/json',
          'zoom_connection_id': CONNECTION_ID,
          'test_mode': 'false'
        },
        body: JSON.stringify({})
      }
    );
    
    if (!syncResponse.ok) {
      const error = await syncResponse.text();
      throw new Error(`Sync failed: ${syncResponse.status} ${error}`);
    }
    
    const syncResult = await syncResponse.json();
    console.log('✅ Sync initiated:', syncResult);
    
    // Get sync log ID if available
    const syncId = syncResult.syncId;
    if (syncId) {
      console.log(`📝 Sync ID: ${syncId}`);
      
      // Poll for sync status
      console.log('\n⏳ Monitoring sync progress...');
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/zoom_sync_logs?id=eq.${syncId}&select=*`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${USER_JWT}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (statusResponse.ok) {
          const logs = await statusResponse.json();
          if (logs.length > 0) {
            const log = logs[0];
            console.log(`  Status: ${log.sync_status} | Processed: ${log.processed_items}/${log.total_items} | Stage: ${log.sync_stage || 'N/A'}`);
            
            if (log.sync_status === 'completed' || log.sync_status === 'failed') {
              console.log(`\n🎯 Sync ${log.sync_status}!`);
              if (log.error_message) {
                console.error('❌ Error:', log.error_message);
              }
              break;
            }
          }
        }
        
        attempts++;
      }
    }
    
    // Check webinars again after sync
    console.log('\n📊 Checking webinars after sync...');
    const afterSyncResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/zoom_webinars?connection_id=eq.${CONNECTION_ID}&select=*&order=synced_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${USER_JWT}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (afterSyncResponse.ok) {
      const webinarsAfterSync = await afterSyncResponse.json();
      console.log(`✅ Total webinars after sync: ${webinarsAfterSync.length}`);
      
      if (webinarsAfterSync.length > existingWebinars.length) {
        console.log(`🎉 Successfully synced ${webinarsAfterSync.length - existingWebinars.length} new webinars!`);
      }
      
      // Show first 3 webinars
      if (webinarsAfterSync.length > 0) {
        console.log('\n📋 Latest webinars:');
        webinarsAfterSync.slice(0, 3).forEach((webinar, index) => {
          console.log(`  ${index + 1}. ${webinar.topic}`);
          console.log(`     - ID: ${webinar.webinar_id}`);
          console.log(`     - Date: ${webinar.start_time}`);
          console.log(`     - Registrants: ${webinar.total_registrants || 0}`);
          console.log(`     - Attendees: ${webinar.total_attendees || 'N/A'}`);
          console.log(`     - Password: ${webinar.password ? '✓' : '✗'}`);
        });
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Instructions for getting USER_JWT
console.log('='.repeat(60));
console.log('📌 IMPORTANT: How to get your USER_JWT token:');
console.log('='.repeat(60));
console.log('1. Open your Webinar Wise application in the browser');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to Application tab > Local Storage');
console.log('4. Find the entry starting with "sb-guwvvinnifypcxwbcnzz"');
console.log('5. Copy the "access_token" value from the session object');
console.log('6. Set it as: export USER_JWT="your_token_here"');
console.log('7. Then run this script again');
console.log('='.repeat(60));
console.log('');

// Run the test
testWebinarSync();
