// Test script to verify Edge Function is responding correctly
// Run this in your browser console or as a Node.js script

async function testEdgeFunction() {
  const PROJECT_REF = 'guwvvinnifypcxwbcnzz';
  const FUNCTION_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/zoom-sync-webinars`;
  
  console.log('🧪 Testing Edge Function CORS...\n');
  
  // Test 1: OPTIONS request (CORS preflight)
  console.log('📍 Test 1: OPTIONS request (CORS preflight)');
  try {
    const optionsResponse = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8080',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type,zoom_connection_id'
      }
    });
    
    console.log('Status:', optionsResponse.status);
    console.log('CORS Headers:');
    console.log('- Access-Control-Allow-Origin:', optionsResponse.headers.get('Access-Control-Allow-Origin'));
    console.log('- Access-Control-Allow-Methods:', optionsResponse.headers.get('Access-Control-Allow-Methods'));
    console.log('- Access-Control-Allow-Headers:', optionsResponse.headers.get('Access-Control-Allow-Headers'));
    
    if (optionsResponse.status === 200) {
      console.log('✅ CORS preflight passed!\n');
    } else {
      console.log('❌ CORS preflight failed!\n');
    }
  } catch (error) {
    console.error('❌ OPTIONS request failed:', error, '\n');
  }
  
  // Test 2: POST request without auth (should fail with 401)
  console.log('📍 Test 2: POST request without auth (should return 401)');
  try {
    const postResponse = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:8080'
      },
      body: JSON.stringify({ test: true })
    });
    
    console.log('Status:', postResponse.status);
    const responseData = await postResponse.json();
    console.log('Response:', responseData);
    
    if (postResponse.status === 401 && responseData.error === 'Missing Authorization header') {
      console.log('✅ Auth check working correctly!\n');
    } else {
      console.log('⚠️ Unexpected response\n');
    }
  } catch (error) {
    console.error('❌ POST request failed:', error, '\n');
  }
  
  console.log('🏁 Test complete!');
  console.log('If both tests passed, the Edge Function is deployed and CORS is configured correctly.');
  console.log('If tests failed, check the Edge Function logs for errors.');
}

// Run the test
testEdgeFunction();
