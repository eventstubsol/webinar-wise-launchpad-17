// Test the Edge Function deployment
const PROJECT_REF = 'guwvvinnifypcxwbcnzz';
const EDGE_FUNCTION_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/zoom-sync-webinars`;

async function testEdgeFunctionHealth() {
  console.log('🧪 Testing Edge Function health...\n');
  
  // Test 1: OPTIONS request
  console.log('📍 Test 1: OPTIONS request (CORS check)');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8080',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type,zoom_connection_id'
      }
    });
    
    console.log('Response Status:', response.status);
    console.log('CORS Headers:');
    console.log('- Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    console.log('- Access-Control-Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'));
    
    if (response.status === 200) {
      console.log('✅ CORS configuration is correct!\n');
    } else {
      console.log('❌ CORS configuration failed\n');
    }
  } catch (error) {
    console.error('❌ OPTIONS request failed:', error, '\n');
  }
  
  // Test 2: POST without auth (should return 401)
  console.log('📍 Test 2: POST without auth');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', data);
    
    if (response.status === 401) {
      console.log('✅ Auth check is working!\n');
    } else {
      console.log('⚠️ Unexpected response\n');
    }
  } catch (error) {
    console.error('❌ POST request failed:', error, '\n');
  }
}

// Run the test
testEdgeFunctionHealth();
