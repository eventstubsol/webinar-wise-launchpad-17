const https = require('https');

console.log('=== ZOOM OAUTH REDIRECT URI CHECKER ===\n');

// Your credentials
const CLIENT_ID = 'xKW9nsk8STWIXmMDxMySdA';
const CLIENT_SECRET = 'rP74gznjxmXM6TI4OOYJKtgA9p7jvAVq';

console.log('Client ID:', CLIENT_ID);
console.log('Client Secret:', CLIENT_SECRET.substring(0, 10) + '...\n');

// Test different redirect URIs
const testRedirectURIs = [
  'http://localhost:3001/api/auth/zoom/callback',
  'https://localhost:3001/api/auth/zoom/callback',
  'http://localhost:8080/api/auth/zoom/callback',
  'https://localhost:8080/api/auth/zoom/callback',
  'https://webinar-wise-launchpad-17.onrender.com/api/auth/zoom/callback',
  'http://webinar-wise-launchpad-17.onrender.com/api/auth/zoom/callback',
  'https://webinar-wise-launchpad-17.lovable.app/api/auth/zoom/callback',
  'http://webinar-wise-launchpad-17.lovable.app/api/auth/zoom/callback'
];

console.log('Testing OAuth URLs with different redirect URIs:\n');

testRedirectURIs.forEach((redirectUri, index) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    state: 'test-state-123',
    scope: 'user:read webinar:read webinar:read:admin'
  });

  const authUrl = `https://zoom.us/oauth/authorize?${params.toString()}`;
  
  console.log(`${index + 1}. Testing redirect URI:`);
  console.log(`   ${redirectUri}`);
  console.log(`   Full URL: ${authUrl}`);
  console.log('');
});

console.log('\n=== WHAT TO DO NEXT ===\n');
console.log('1. Try each URL above in your browser');
console.log('2. The one that DOESN\'T give error 4700 is the correct redirect URI');
console.log('3. Update your .env file with the working redirect URI');
console.log('4. Make sure this EXACT URI is added to your Zoom app settings\n');

console.log('To check your Zoom app settings:');
console.log('1. Go to: https://marketplace.zoom.us/user/build');
console.log('2. Click on your app');
console.log('3. Go to "App Credentials" tab');
console.log('4. Check the "Redirect URL for OAuth" field');
console.log('5. Make sure it matches EXACTLY (including http/https and trailing slashes)\n');
