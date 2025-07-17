// Test Zoom OAuth Configuration
// This script helps diagnose OAuth issues

const ZOOM_TEST_CONFIG = {
  // Test with a known working client ID format
  // You'll need to replace this with your actual new client ID
  CLIENT_ID: 'YOUR_NEW_CLIENT_ID_HERE',
  CLIENT_SECRET: 'YOUR_NEW_CLIENT_SECRET_HERE',
  
  // These are the redirect URIs you should add in Zoom app
  REDIRECT_URIS: {
    development: 'http://localhost:3001/api/auth/zoom/callback',
    production: 'https://webinar-wise-launchpad-17.onrender.com/api/auth/zoom/callback'
  },
  
  // Required scopes
  SCOPES: [
    'user:read',
    'webinar:read',
    'webinar:read:admin',
    'report:read:admin'
  ]
};

console.log('=== ZOOM OAUTH CONFIGURATION GUIDE ===\n');

console.log('1. Create a new Zoom OAuth App:');
console.log('   - Go to: https://marketplace.zoom.us/');
console.log('   - Click "Develop" → "Build App"');
console.log('   - Choose "OAuth" app type');
console.log('   - Name it "Webinar Wise"\n');

console.log('2. Configure OAuth Settings:');
console.log('   - Add these Redirect URLs:');
Object.entries(ZOOM_TEST_CONFIG.REDIRECT_URIS).forEach(([env, url]) => {
  console.log(`     • ${env}: ${url}`);
});

console.log('\n3. Add Required Scopes:');
ZOOM_TEST_CONFIG.SCOPES.forEach(scope => {
  console.log(`   • ${scope}`);
});

console.log('\n4. Update Your Environment Variables:');
console.log('   Frontend (.env):');
console.log('     VITE_ZOOM_CLIENT_ID=[YOUR_NEW_CLIENT_ID]');
console.log('     VITE_ZOOM_CLIENT_SECRET=[YOUR_NEW_CLIENT_SECRET]');
console.log('\n   Backend (.env):');
console.log('     ZOOM_OAUTH_CLIENT_ID=[YOUR_NEW_CLIENT_ID]');
console.log('     ZOOM_OAUTH_CLIENT_SECRET=[YOUR_NEW_CLIENT_SECRET]');

console.log('\n5. Domain Allow List (in Surface section):');
console.log('   • localhost:8080');
console.log('   • localhost:3001');
console.log('   • webinar-wise-launchpad-17.lovable.app');
console.log('   • webinar-wise-launchpad-17.onrender.com');

console.log('\n6. Common Mistakes to Avoid:');
console.log('   ❌ Not activating the app after creation');
console.log('   ❌ Mismatched redirect URIs (even trailing slash matters)');
console.log('   ❌ Missing required scopes');
console.log('   ❌ Not updating both frontend and backend credentials');

console.log('\n7. Testing:');
console.log('   After updating credentials, test with:');
console.log('   cd render-backend');
console.log('   node test-zoom-oauth.js');

// Generate a sample OAuth URL for testing
const sampleParams = new URLSearchParams({
  response_type: 'code',
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: ZOOM_TEST_CONFIG.REDIRECT_URIS.development,
  state: 'random_state_string',
  scope: ZOOM_TEST_CONFIG.SCOPES.join(' ')
});

console.log('\n8. Sample OAuth URL Structure:');
console.log(`   https://zoom.us/oauth/authorize?${sampleParams.toString()}`);
