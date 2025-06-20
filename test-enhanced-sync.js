// Test script for enhanced Zoom webinar sync
const SUPABASE_URL = 'https://guwvvinnifypcxwbcnzz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Z2aW5uaWZ5cGN4d2Jjbnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwMzIxMzksImV4cCI6MjA1MDYwODEzOX0.YM-v5-2SqpYxRQ-PIdOcM7OlXbsxXgWzQ9e5qJH8wNg';

// You'll need to get these values from your application
const USER_AUTH_TOKEN = 'YOUR_USER_TOKEN'; // Get this from your app's auth context
const ZOOM_CONNECTION_ID = 'YOUR_CONNECTION_ID'; // Get this from your zoom connections

async function testEnhancedSync() {
  console.log('🧪 Testing Enhanced Zoom Webinar Sync');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/zoom-sync-webinars`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${USER_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'zoom_connection_id': ZOOM_CONNECTION_ID,
        'test_mode': 'true'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Enhanced sync completed successfully:', result);
    } else {
      console.error('❌ Enhanced sync failed:', result);
    }
    
  } catch (error) {
    console.error('💥 Error during enhanced sync test:', error);
  }
}

// Instructions for running this test:
console.log(`
📋 To test the enhanced sync:

1. Get your user auth token from your app's authentication context
2. Get your Zoom connection ID from the zoom_connections table
3. Update the USER_AUTH_TOKEN and ZOOM_CONNECTION_ID variables above
4. Run this script

The enhanced sync will:
- Log comprehensive raw Zoom API data for debugging
- Extract all available fields with fallback logic
- Populate previously null columns in zoom_webinars table
- Show enhanced field mapping in the logs

Check the Supabase Edge Function logs to see the detailed extraction process!
`);

// Uncomment the line below to run the test (after updating the variables)
// testEnhancedSync();
