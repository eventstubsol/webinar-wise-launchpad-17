// Zoom OAuth configuration for different environments

const getZoomConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // CRITICAL: These must match EXACTLY what's in your Zoom app
  const redirectUris = {
    development: 'http://localhost:3001/api/auth/zoom/callback',
    production: 'https://webinar-wise-launchpad-17.onrender.com/api/auth/zoom/callback'
  };
  
  return {
    clientId: process.env.ZOOM_OAUTH_CLIENT_ID,
    clientSecret: process.env.ZOOM_OAUTH_CLIENT_SECRET,
    redirectUri: isProduction ? redirectUris.production : redirectUris.development,
    scopes: [
      'user:read',
      'account:read:admin',
      'webinar:read:admin',
      'recording:read:admin',
      'report:read:admin'
    ].join(' ')
  };
};

module.exports = { getZoomConfig };
