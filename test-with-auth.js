// Find and test with the correct auth token
console.log('🔍 Finding Supabase auth token...\n');

// Search for Supabase auth in localStorage
const keys = Object.keys(localStorage);
const supabaseKeys = keys.filter(key => key.includes('supabase') || key.includes('auth'));

console.log('Found localStorage keys:', supabaseKeys);

// Try different possible locations
let token = null;

// Method 1: Look for sb-* keys
const sbKeys = keys.filter(key => key.startsWith('sb-'));
if (sbKeys.length > 0) {
  console.log('\nFound Supabase keys:', sbKeys);
  
  for (const key of sbKeys) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data?.access_token) {
        token = data.access_token;
        console.log('✅ Found token in:', key);
        break;
      }
    } catch (e) {
      // Not JSON or doesn't have token
    }
  }
}

// Method 2: Check for specific Supabase auth key
if (!token) {
  const authKey = keys.find(key => key.includes('auth-token'));
  if (authKey) {
    try {
      const data = JSON.parse(localStorage.getItem(authKey));
      token = data?.access_token || data?.currentSession?.access_token;
      if (token) {
        console.log('✅ Found token in:', authKey);
      }
    } catch (e) {
      // Not JSON
    }
  }
}

if (token) {
  console.log('\n🚀 Testing Edge Function with authentication...');
  
  const PROJECT_REF = 'guwvvinnifypcxwbcnzz';
  const FUNCTION_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/zoom-sync-webinars`;
  const CONNECTION_ID = 'e03a3898-2e4d-4e69-a03e-2faf34d1f418';
  
  fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'zoom_connection_id': CONNECTION_ID,
      'test_mode': 'false'
    },
    body: JSON.stringify({})
  })
  .then(response => response.json().then(data => ({ status: response.status, data })))
  .then(({ status, data }) => {
    console.log('Response Status:', status);
    console.log('Response Data:', data);
    
    if (status === 200) {
      console.log('\n✅ Edge Function is working correctly!');
      console.log('Sync should be running now.');
    } else if (status === 500) {
      console.log('\n❌ Edge Function error:');
      console.log('Error:', data.error);
      console.log('Details:', data.details);
      if (data.debug) {
        console.log('Debug:', data.debug);
      }
      console.log('\nCheck the Edge Function logs for more details.');
    }
  })
  .catch(error => {
    console.error('Request failed:', error);
  });
  
} else {
  console.log('\n❌ Could not find auth token.');
  console.log('Please make sure you are logged in to the application.');
  
  // Try to get the Supabase client instance
  console.log('\nAlternative: Try running the sync from your UI again.');
  console.log('The Edge Function is now working, so it should succeed.');
}
