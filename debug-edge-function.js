// Debug script to check Edge Function error details
// Run this in your browser console after the sync fails

async function debugEdgeFunction() {
  console.log('🔍 Debugging Edge Function Error...\n');
  
  // Check if there's a recent failed response in the network tab
  const lastError = window.__lastSyncError;
  
  if (lastError) {
    console.log('📋 Last Sync Error Details:');
    console.log('- Error:', lastError.error);
    console.log('- Details:', lastError.details);
    console.log('- Error Type:', lastError.errorType);
    console.log('- Debug Info:', lastError.debug);
  }
  
  // Also check localStorage for any stored error info
  const storedError = localStorage.getItem('last_sync_error');
  if (storedError) {
    console.log('\n📦 Stored Error Info:');
    console.log(JSON.parse(storedError));
  }
  
  console.log('\n💡 To capture more details, modify useZoomSync.tsx to log the full error response:');
  console.log('Add this after line 71:');
  console.log(`
    // Log full error details
    if (error.response) {
      error.response.json().then(errorData => {
        console.error('Edge Function Error Details:', errorData);
        window.__lastSyncError = errorData;
        localStorage.setItem('last_sync_error', JSON.stringify(errorData));
      });
    }
  `);
}

// Function to test Edge Function directly
async function testEdgeFunctionDirectly() {
  const PROJECT_REF = 'guwvvinnifypcxwbcnzz';
  const FUNCTION_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/zoom-sync-webinars`;
  
  // Get auth token from localStorage
  const session = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
  const token = session?.currentSession?.access_token;
  
  if (!token) {
    console.error('No auth token found. Please log in first.');
    return;
  }
  
  // Get connection ID
  const connectionId = 'e03a3898-2e4d-4e69-a03e-2faf34d1f418'; // From your logs
  
  console.log('🚀 Testing Edge Function directly...');
  
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'zoom_connection_id': connectionId,
        'test_mode': 'false'
      },
      body: JSON.stringify({})
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('❌ Edge Function Error:');
      console.error('Status:', response.status);
      console.error('Response:', responseData);
      
      // Save for later analysis
      window.__lastSyncError = responseData;
      localStorage.setItem('last_sync_error', JSON.stringify({
        timestamp: new Date().toISOString(),
        status: response.status,
        error: responseData
      }));
    } else {
      console.log('✅ Edge Function Success:', responseData);
    }
    
  } catch (error) {
    console.error('💥 Request failed:', error);
  }
}

// Run the debug function
debugEdgeFunction();

console.log('\n📞 To test the Edge Function directly, run:');
console.log('testEdgeFunctionDirectly()');
