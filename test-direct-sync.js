// Direct test to verify Edge Function after deployment
// Run this in browser console

async function testEdgeFunctionDirectly() {
  console.log('🔍 Testing Edge Function Directly...\n');
  
  const PROJECT_REF = 'guwvvinnifypcxwbcnzz';
  const FUNCTION_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/zoom-sync-webinars`;
  const CONNECTION_ID = 'e03a3898-2e4d-4e69-a03e-2faf34d1f418';
  
  // Find auth token
  let token = null;
  const keys = Object.keys(localStorage);
  
  // Look for Supabase auth token
  for (const key of keys) {
    if (key.startsWith('sb-') && key.includes('auth-token')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        token = data?.access_token;
        if (token) {
          console.log('✅ Found auth token');
          break;
        }
      } catch (e) {}
    }
  }
  
  if (!token) {
    console.log('❌ No auth token found. Please login first.');
    return;
  }
  
  console.log('🚀 Calling Edge Function with authentication...\n');
  
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'zoom_connection_id': CONNECTION_ID,
        'test_mode': 'false'
      },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', data);
    
    if (response.status === 200) {
      console.log('\n✅ SUCCESS! Edge Function is working correctly!');
      console.log('Sync ID:', data.syncId);
      console.log('\nThe sync is now running. Check your dashboard for progress.');
    } else if (response.status === 500) {
      console.log('\n❌ Error Details:');
      console.log('Error:', data.error);
      console.log('Details:', data.details);
      console.log('\nThis means the Edge Function is deployed but encountering an error.');
      console.log('Check the Edge Function logs for more details.');
    } else {
      console.log('\n⚠️ Unexpected response. Check the data above.');
    }
    
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Run the test
testEdgeFunctionDirectly();
