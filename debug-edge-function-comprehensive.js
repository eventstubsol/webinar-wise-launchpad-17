// Comprehensive Edge Function Debug Test
// Run this in your browser console after attempting sync

console.log('🔍 Starting Comprehensive Edge Function Debug...\n');

// Function to test the Edge Function
async function debugEdgeFunction() {
  const PROJECT_REF = 'guwvvinnifypcxwbcnzz';
  const FUNCTION_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/zoom-sync-webinars`;
  
  // Step 1: Check stored error details
  console.log('📋 Step 1: Checking stored error details...');
  const storedError = localStorage.getItem('last_sync_error');
  if (storedError) {
    const errorData = JSON.parse(storedError);
    console.log('Last Error:', errorData);
    if (errorData.error) {
      console.log('Error Details:', errorData.error);
    }
  } else {
    console.log('No stored error found');
  }
  
  // Step 2: Test CORS
  console.log('\n📋 Step 2: Testing CORS configuration...');
  try {
    const corsResponse = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8080',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type,zoom_connection_id'
      }
    });
    
    console.log('CORS Status:', corsResponse.status);
    if (corsResponse.status === 200) {
      console.log('✅ CORS is properly configured');
    } else {
      console.log('❌ CORS configuration issue');
    }
  } catch (error) {
    console.error('❌ CORS test failed:', error);
  }
  
  // Step 3: Test without auth
  console.log('\n📋 Step 3: Testing without authentication...');
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', data);
    
    if (response.status === 401) {
      console.log('✅ Authentication check is working');
    } else if (response.status === 500) {
      console.log('❌ Server error - check Edge Function logs');
      if (data.details) {
        console.log('Error Details:', data.details);
      }
      if (data.debug) {
        console.log('Debug Info:', data.debug);
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
  
  // Step 4: Get auth token and test with auth
  console.log('\n📋 Step 4: Testing with authentication...');
  const authData = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
  const token = authData?.currentSession?.access_token;
  
  if (token) {
    try {
      const authResponse = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'zoom_connection_id': 'e03a3898-2e4d-4e69-a03e-2faf34d1f418'
        },
        body: JSON.stringify({})
      });
      
      const authData = await authResponse.json();
      console.log('Auth Response Status:', authResponse.status);
      console.log('Auth Response Data:', authData);
      
      if (authResponse.status === 500 && authData.details) {
        console.log('\n❌ Edge Function Error Details:');
        console.log('- Error:', authData.error);
        console.log('- Details:', authData.details);
        console.log('- Type:', authData.errorType);
        if (authData.debug) {
          console.log('- Debug:', authData.debug);
        }
      }
    } catch (error) {
      console.error('❌ Auth request failed:', error);
    }
  } else {
    console.log('⚠️ No auth token found - please log in');
  }
  
  console.log('\n📊 Debug Summary:');
  console.log('1. If CORS fails - Edge Function not deployed');
  console.log('2. If 401 without auth - Edge Function working');
  console.log('3. If 500 error - Check the error details above');
  console.log('4. Check Edge Function logs at:');
  console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/functions/zoom-sync-webinars/logs`);
}

// Run the debug
debugEdgeFunction();
