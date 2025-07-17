// Test Zoom OAuth Flow
require('dotenv').config();
const axios = require('axios');

console.log('=== ZOOM OAUTH TEST ===');
console.log('Testing OAuth flow with current configuration...\n');

// Check environment variables
console.log('1. Environment Variables Check:');
console.log('   ZOOM_OAUTH_CLIENT_ID:', process.env.ZOOM_OAUTH_CLIENT_ID ? `${process.env.ZOOM_OAUTH_CLIENT_ID.substring(0, 8)}...` : 'NOT SET');
console.log('   ZOOM_OAUTH_CLIENT_SECRET:', process.env.ZOOM_OAUTH_CLIENT_SECRET ? '[SET]' : 'NOT SET');
console.log('   ZOOM_OAUTH_REDIRECT_URI:', process.env.ZOOM_OAUTH_REDIRECT_URI || 'Not set (will use default)');
console.log('   VITE_APP_URL:', process.env.VITE_APP_URL || 'Not set');
console.log('   PORT:', process.env.PORT || 3001);

// Test the authorize endpoint
async function testAuthorizeEndpoint() {
  try {
    console.log('\n2. Testing /api/auth/zoom/authorize endpoint...');
    
    const backendUrl = `http://localhost:${process.env.PORT || 3001}`;
    const response = await axios.get(`${backendUrl}/api/auth/zoom/authorize`, {
      params: {
        returnUrl: '/dashboard'
      }
    });
    
    console.log('   ✅ Response received:', response.status);
    console.log('   Auth URL:', response.data.authUrl);
    console.log('   State:', response.data.state);
    
    if (response.data.debug) {
      console.log('   Debug info:', JSON.stringify(response.data.debug, null, 2));
    }
    
    // Parse the auth URL to check parameters
    const authUrl = new URL(response.data.authUrl);
    console.log('\n3. OAuth URL Analysis:');
    console.log('   Base URL:', authUrl.origin + authUrl.pathname);
    console.log('   Parameters:');
    authUrl.searchParams.forEach((value, key) => {
      if (key === 'client_id') {
        console.log(`     ${key}: ${value.substring(0, 8)}...`);
      } else if (key === 'redirect_uri') {
        console.log(`     ${key}: ${value}`);
      } else if (key === 'scope') {
        console.log(`     ${key}: ${value}`);
      } else {
        console.log(`     ${key}: ${value.substring(0, 20)}...`);
      }
    });
    
    // Test if the client ID is valid by making a simple request
    console.log('\n4. Testing if Zoom recognizes the client ID...');
    console.log('   You can test this by visiting the auth URL in a browser.');
    console.log('   If you see error 4,700, the client ID is invalid.');
    console.log('\n   Auth URL to test:');
    console.log('   ' + response.data.authUrl);
    
  } catch (error) {
    console.error('\n❌ Error testing authorize endpoint:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
testAuthorizeEndpoint();
