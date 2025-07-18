// Zoom OAuth Debug Script
// Run this to test your Zoom OAuth configuration

require('dotenv').config();

console.log('=== ZOOM OAUTH DEBUG TOOL ===\n');

// Check environment variables
const checkEnvVars = () => {
  console.log('1. Checking Environment Variables:');
  console.log('----------------------------------');
  
  const required = [
    'ZOOM_OAUTH_CLIENT_ID',
    'ZOOM_OAUTH_CLIENT_SECRET',
    'ZOOM_OAUTH_REDIRECT_URI',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_APP_URL'
  ];
  
  let allPresent = true;
  
  required.forEach(varName => {
    const value = process.env[varName];
    const present = !!value;
    
    if (!present) allPresent = false;
    
    console.log(`${present ? '✅' : '❌'} ${varName}: ${
      present ? (varName.includes('SECRET') || varName.includes('KEY') ? '[HIDDEN]' : value) : 'NOT SET'
    }`);
  });
  
  console.log('\n');
  return allPresent;
};

// Test Zoom OAuth URL generation
const testOAuthURL = () => {
  console.log('2. Testing OAuth URL Generation:');
  console.log('--------------------------------');
  
  const clientId = process.env.ZOOM_OAUTH_CLIENT_ID;
  const redirectUri = process.env.ZOOM_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/auth/zoom/callback';
  const scopes = 'user:read webinar:read webinar:read:admin report:read:admin recording:read';
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state: 'test-state-123',
    scope: scopes
  });
  
  const authUrl = `https://zoom.us/oauth/authorize?${params.toString()}`;
  
  console.log('Generated OAuth URL:');
  console.log(authUrl);
  console.log('\nRedirect URI:', redirectUri);
  console.log('Scopes:', scopes.split(' ').join(', '));
  console.log('\n');
  
  return authUrl;
};

// Test backend server connectivity
const testBackendServer = async () => {
  console.log('3. Testing Backend Server:');
  console.log('-------------------------');
  
  const backendUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
  
  try {
    // Check if node-fetch is available
    let fetch;
    try {
      fetch = require('node-fetch');
    } catch (e) {
      console.log('⚠️  node-fetch not installed. Run: npm install node-fetch');
      return;
    }
    
    // Test health endpoint
    console.log(`Testing ${backendUrl}/health...`);
    const healthResponse = await fetch(`${backendUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test consent info endpoint
    console.log(`\nTesting ${backendUrl}/api/auth/zoom/consent-info...`);
    const consentResponse = await fetch(`${backendUrl}/api/auth/zoom/consent-info`);
    const consentData = await consentResponse.json();
    console.log('✅ Consent info available');
    
    // Test authorize endpoint
    console.log(`\nTesting ${backendUrl}/api/auth/zoom/authorize...`);
    const authResponse = await fetch(`${backendUrl}/api/auth/zoom/authorize?returnUrl=/dashboard`);
    const authData = await authResponse.json();
    
    if (authData.error) {
      console.log('❌ Authorization endpoint error:', authData.error);
      if (authData.details) {
        console.log('Details:', authData.details);
      }
    } else {
      console.log('✅ Authorization endpoint working');
      console.log('Auth URL generated:', authData.authUrl ? 'Yes' : 'No');
    }
    
  } catch (error) {
    console.log('❌ Backend server error:', error.message);
    console.log('Make sure the backend server is running on port 3001');
  }
  
  console.log('\n');
};

// Validate Zoom OAuth credentials
const validateZoomCredentials = async () => {
  console.log('4. Validating Zoom OAuth Credentials:');
  console.log('------------------------------------');
  
  const clientId = process.env.ZOOM_OAUTH_CLIENT_ID;
  const clientSecret = process.env.ZOOM_OAUTH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('❌ Missing Zoom OAuth credentials');
    return;
  }
  
  // Check credential format
  if (clientId.length < 20) {
    console.log('⚠️  Client ID seems too short. Expected ~22 characters');
  }
  
  if (clientSecret.length < 30) {
    console.log('⚠️  Client Secret seems too short. Expected ~32 characters');
  }
  
  // Test basic auth header
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  console.log('✅ Basic auth header generated');
  
  console.log('\n');
};

// Main debug function
const runDebug = async () => {
  console.log('Starting Zoom OAuth debug...\n');
  
  // 1. Check environment variables
  const envOk = checkEnvVars();
  
  if (!envOk) {
    console.log('⚠️  Fix missing environment variables before continuing\n');
    console.log('Instructions:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Fill in your actual Zoom OAuth credentials');
    console.log('3. Get credentials from: https://marketplace.zoom.us/develop/apps\n');
    return;
  }
  
  // 2. Test OAuth URL
  const authUrl = testOAuthURL();
  
  // 3. Validate credentials
  await validateZoomCredentials();
  
  // 4. Test backend
  await testBackendServer();
  
  console.log('=== DEBUG COMPLETE ===\n');
  console.log('Next steps:');
  console.log('1. If all checks pass, try the OAuth flow in your browser');
  console.log('2. Make sure your Zoom app redirect URI matches exactly');
  console.log('3. Check Zoom app is not in development mode if testing with other users');
  console.log('4. Monitor backend console for detailed error logs\n');
  
  console.log('Common Error 4700 fixes:');
  console.log('- Redirect URI must match EXACTLY (check for trailing slashes)');
  console.log('- Use the same protocol (http/https) in app and code');
  console.log('- Include all redirect URIs you might use in Zoom app settings');
  console.log('- For production, use your actual domain, not localhost\n');
};

// Run the debug script
runDebug().catch(console.error);
