const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Zoom OAuth configuration with better environment handling
const ZOOM_CLIENT_ID = process.env.ZOOM_OAUTH_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_OAUTH_CLIENT_SECRET;

// Dynamic redirect URI based on environment
const getRedirectUri = () => {
  if (process.env.ZOOM_OAUTH_REDIRECT_URI) {
    return process.env.ZOOM_OAUTH_REDIRECT_URI;
  }
  
  // Auto-detect based on environment
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    return `${process.env.RENDER_EXTERNAL_URL}/api/auth/zoom/callback`;
  }
  
  return 'http://localhost:3001/api/auth/zoom/callback';
};

const ZOOM_REDIRECT_URI = getRedirectUri();

console.log('=== ZOOM OAUTH CONFIGURATION ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('Client ID:', ZOOM_CLIENT_ID ? `${ZOOM_CLIENT_ID.substring(0, 8)}...` : 'NOT SET');
console.log('Client Secret:', ZOOM_CLIENT_SECRET ? '[SET]' : 'NOT SET');
console.log('Redirect URI:', ZOOM_REDIRECT_URI);
console.log('App URL:', process.env.VITE_APP_URL || 'NOT SET');

// Required scopes for Webinar Wise - simplified list
const ZOOM_SCOPES = [
  'user:read',           // Basic profile info
  'webinar:read',        // Read webinar data
  'webinar:read:admin',  // Read all webinars in account
  'report:read:admin',   // Read webinar reports
  'recording:read'       // Read recordings
].join(' ');

// Store state temporarily (in production, use Redis or database)
const stateStore = new Map();

/**
 * Generate Zoom OAuth URL
 * GET /api/auth/zoom/authorize
 */
router.get('/zoom/authorize', async (req, res) => {
  try {
    console.log('\n=== ZOOM AUTHORIZE REQUEST ===');
    console.log('Request Headers:', {
      origin: req.get('origin'),
      referer: req.get('referer'),
      userAgent: req.get('user-agent')?.substring(0, 50)
    });
    console.log('Return URL:', req.query.returnUrl);
    
    // Check if credentials are configured
    if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
      console.error('❌ Zoom OAuth credentials not configured!');
      
      // Provide helpful error message
      return res.status(500).json({ 
        error: 'Zoom OAuth not configured',
        message: 'The Zoom OAuth integration is not properly configured. Please contact support.',
        details: process.env.NODE_ENV === 'development' ? {
          hasClientId: !!ZOOM_CLIENT_ID,
          hasClientSecret: !!ZOOM_CLIENT_SECRET,
          redirectUri: ZOOM_REDIRECT_URI,
          help: 'Set ZOOM_OAUTH_CLIENT_ID and ZOOM_OAUTH_CLIENT_SECRET in your .env file'
        } : undefined
      });
    }

    // Generate a secure random state
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state with metadata
    stateStore.set(state, {
      timestamp: Date.now(),
      returnUrl: req.query.returnUrl || '/dashboard',
      origin: req.get('origin') || req.get('referer')
    });
    
    console.log('Generated state:', state);
    console.log('State store size:', stateStore.size);
    
    // Clean up expired states (older than 10 minutes)
    let cleanedCount = 0;
    for (const [key, value] of stateStore.entries()) {
      if (Date.now() - value.timestamp > 10 * 60 * 1000) {
        stateStore.delete(key);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired states`);
    }

    // Build Zoom OAuth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: ZOOM_CLIENT_ID,
      redirect_uri: ZOOM_REDIRECT_URI,
      state: state,
      scope: ZOOM_SCOPES
    });

    const zoomAuthUrl = `https://zoom.us/oauth/authorize?${params.toString()}`;
    
    console.log('✅ Generated Auth URL successfully');
    console.log('Redirect URI being used:', ZOOM_REDIRECT_URI);
    
    // Return detailed response for debugging
    res.json({ 
      authUrl: zoomAuthUrl,
      state: state,
      debug: process.env.NODE_ENV === 'development' ? {
        clientIdPreview: ZOOM_CLIENT_ID.substring(0, 8) + '...',
        redirectUri: ZOOM_REDIRECT_URI,
        scopes: ZOOM_SCOPES.split(' '),
        environment: process.env.NODE_ENV
      } : undefined
    });
  } catch (error) {
    console.error('❌ Error generating Zoom OAuth URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate authorization URL',
      message: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Handle Zoom OAuth callback
 * GET /api/auth/zoom/callback
 */
router.get('/zoom/callback', async (req, res) => {
  try {
    console.log('\n=== ZOOM CALLBACK REQUEST ===');
    console.log('Query params:', {
      code: req.query.code ? 'present' : 'missing',
      state: req.query.state ? 'present' : 'missing',
      error: req.query.error
    });
    
    const { code, state, error: zoomError } = req.query;

    // Handle Zoom OAuth errors
    if (zoomError) {
      console.error('❌ Zoom OAuth error:', zoomError);
      const errorMessages = {
        'invalid_request': 'The authorization request was invalid.',
        'unauthorized_client': 'The app is not authorized. Please check your Zoom app settings.',
        'access_denied': 'Access was denied. Please try again.',
        'unsupported_response_type': 'Invalid response type specified.',
        'invalid_scope': 'Invalid permissions requested.',
        'server_error': 'Zoom server error. Please try again later.',
        'temporarily_unavailable': 'Zoom OAuth is temporarily unavailable.'
      };
      
      const userMessage = errorMessages[zoomError] || 'An error occurred during authorization.';
      
      // Redirect to frontend with error
      const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:8080';
      return res.redirect(`${frontendUrl}/register?error=zoom_oauth_error&message=${encodeURIComponent(userMessage)}`);
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('❌ Missing required parameters');
      const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:8080';
      return res.redirect(`${frontendUrl}/register?error=missing_parameters`);
    }

    // Validate state
    const stateData = stateStore.get(state);
    if (!stateData) {
      console.error('❌ Invalid or expired state:', state);
      console.log('Available states:', Array.from(stateStore.keys()));
      const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:8080';
      return res.redirect(`${frontendUrl}/register?error=invalid_state`);
    }
    
    console.log('✅ State validated successfully');
    
    // Clean up state
    stateStore.delete(state);

    // Exchange code for access token
    console.log('Exchanging authorization code for access token...');
    const tokenUrl = 'https://zoom.us/oauth/token';
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: ZOOM_REDIRECT_URI
    });

    const authHeader = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    console.log('Making token exchange request...');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    const responseText = await tokenResponse.text();
    
    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        response: responseText
      });
      
      // Parse error if possible
      let errorDetail = 'Token exchange failed';
      try {
        const errorData = JSON.parse(responseText);
        errorDetail = errorData.reason || errorData.error || errorDetail;
      } catch (e) {
        // Ignore parse error
      }
      
      const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:8080';
      return res.redirect(`${frontendUrl}/register?error=token_exchange_failed&message=${encodeURIComponent(errorDetail)}`);
    }

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse token response:', responseText);
      const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:8080';
      return res.redirect(`${frontendUrl}/register?error=invalid_token_response`);
    }

    console.log('✅ Token received successfully');
    console.log('Token type:', tokenData.token_type);
    console.log('Scope:', tokenData.scope);

    // Get user information from Zoom
    console.log('Fetching user information from Zoom...');
    const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('❌ Failed to fetch user info:', userResponse.status);
      const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:8080';
      return res.redirect(`${frontendUrl}/register?error=user_info_failed`);
    }

    const zoomUser = await userResponse.json();
    console.log('✅ User info retrieved:', {
      email: zoomUser.email,
      id: zoomUser.id,
      first_name: zoomUser.first_name,
      last_name: zoomUser.last_name,
      type: zoomUser.type,
      role_name: zoomUser.role_name,
      account_id: zoomUser.account_id
    });

    // Check if user exists in Supabase
    let { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', zoomUser.email)
      .single();

    let userId;
    let isNewUser = false;

    if (!existingUser) {
      console.log('Creating new user in Supabase...');
      
      // Create new user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: zoomUser.email,
        email_confirm: true,
        user_metadata: {
          full_name: `${zoomUser.first_name} ${zoomUser.last_name}`.trim(),
          zoom_id: zoomUser.id,
          zoom_account_id: zoomUser.account_id,
          avatar_url: zoomUser.pic_url,
          zoom_auth: true
        }
      });

      if (authError) {
        console.error('❌ Failed to create user:', authError);
        const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:8080';
        return res.redirect(`${frontendUrl}/register?error=user_creation_failed&message=${encodeURIComponent(authError.message)}`);
      }

      userId = authData.user.id;
      isNewUser = true;
      console.log('✅ User created successfully:', userId);

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: zoomUser.email,
          full_name: `${zoomUser.first_name} ${zoomUser.last_name}`.trim(),
          avatar_url: zoomUser.pic_url,
          zoom_user_id: zoomUser.id,
          zoom_account_id: zoomUser.account_id,
          role: zoomUser.type === 2 ? 'owner' : 'member', // Type 2 is owner in Zoom
          is_zoom_admin: zoomUser.type >= 2, // Type 2 and 3 are admins
          zoom_account_level: zoomUser.role_name || 'Basic'
        });

      if (profileError) {
        console.error('⚠️ Failed to create profile:', profileError);
        // Continue anyway, profile will be created later
      }
    } else {
      userId = existingUser.id;
      console.log('Updating existing user profile...');
      
      // Update profile with latest Zoom info
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: zoomUser.pic_url,
          zoom_user_id: zoomUser.id,
          zoom_account_id: zoomUser.account_id,
          is_zoom_admin: zoomUser.type >= 2,
          zoom_account_level: zoomUser.role_name || existingUser.zoom_account_level,
          last_updated: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('⚠️ Failed to update profile:', updateError);
      }
    }

    // Store Zoom OAuth tokens
    console.log('Storing Zoom connection...');
    const { error: connectionError } = await supabase
      .from('zoom_connections')
      .upsert({
        user_id: userId,
        zoom_account_id: zoomUser.account_id,
        zoom_user_id: zoomUser.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        zoom_role: zoomUser.role_name,
        zoom_account_type: zoomUser.type,
        is_active: true,
        last_sync_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (connectionError) {
      console.error('❌ Failed to store Zoom connection:', connectionError);
      // Continue anyway - user can reconnect later
    }

    // Generate a magic link for the user to sign in
    console.log('Generating magic link for auto-signin...');
    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: zoomUser.email,
      options: {
        redirectTo: `${process.env.VITE_APP_URL || 'http://localhost:8080'}${stateData.returnUrl}`
      }
    });

    if (magicLinkError) {
      console.error('❌ Failed to generate magic link:', magicLinkError);
      // Fallback to manual login
      const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:8080';
      return res.redirect(`${frontendUrl}/login?message=${encodeURIComponent('Account created successfully. Please sign in.')}&email=${encodeURIComponent(zoomUser.email)}`);
    }

    console.log('✅ OAuth flow completed successfully');
    console.log(`Redirecting to: ${isNewUser ? 'welcome page' : 'dashboard'}`);
    
    // Redirect to the magic link
    res.redirect(magicLinkData.properties.action_link);

  } catch (error) {
    console.error('💥 OAuth callback error:', error);
    console.error('Stack trace:', error.stack);
    
    const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:8080';
    res.redirect(`${frontendUrl}/register?error=oauth_error&message=${encodeURIComponent('An unexpected error occurred. Please try again.')}`);
  }
});

/**
 * Get Zoom OAuth consent info
 * GET /api/auth/zoom/consent-info
 */
router.get('/zoom/consent-info', (req, res) => {
  res.json({
    summary: "Connect your Zoom account to access webinar analytics and insights.",
    scopes: [
      {
        name: "Basic Profile",
        description: "View your name, email, and profile picture"
      },
      {
        name: "Webinar Access", 
        description: "Read your webinar data and reports"
      }
    ],
    detailedScopes: [
      {
        name: "user:read",
        description: "Read your basic Zoom profile information including name, email, and profile picture"
      },
      {
        name: "webinar:read",
        description: "View your webinars and basic webinar information"
      },
      {
        name: "webinar:read:admin",
        description: "Access all webinars in your Zoom account for comprehensive analytics"
      },
      {
        name: "report:read:admin",
        description: "Generate detailed reports and analytics from your webinar data"
      },
      {
        name: "recording:read",
        description: "Access webinar recordings for AI-powered insights and analysis"
      }
    ],
    privacyUrl: `${process.env.VITE_APP_URL || 'http://localhost:8080'}/privacy`,
    termsUrl: `${process.env.VITE_APP_URL || 'http://localhost:8080'}/terms`
  });
});

/**
 * Refresh Zoom OAuth token
 * POST /api/auth/zoom/refresh
 */
router.post('/zoom/refresh', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('Refreshing token for user:', userId);

    // Get current connection
    const { data: connection, error: connectionError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (connectionError || !connection) {
      console.error('Connection not found:', connectionError);
      return res.status(404).json({ error: 'Zoom connection not found' });
    }

    // Check if token needs refresh (refresh if expires in less than 5 minutes)
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
      console.log('Token still valid, no refresh needed');
      return res.json({ 
        success: true, 
        message: 'Token still valid',
        expiresAt: expiresAt.toISOString()
      });
    }

    // Refresh the token
    console.log('Token expiring soon, refreshing...');
    const tokenUrl = 'https://zoom.us/oauth/token';
    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token refresh failed:', errorData);
      
      // Mark connection as inactive if refresh fails
      await supabase
        .from('zoom_connections')
        .update({ is_active: false })
        .eq('user_id', userId);
        
      return res.status(400).json({ 
        error: 'Token refresh failed',
        message: 'Please reconnect your Zoom account'
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token refreshed successfully');

    // Update stored tokens
    const { error: updateError } = await supabase
      .from('zoom_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update tokens:', updateError);
      return res.status(500).json({ error: 'Failed to update tokens' });
    }

    res.json({ 
      success: true,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to refresh token'
    });
  }
});

/**
 * Disconnect Zoom account
 * POST /api/auth/zoom/disconnect
 */
router.post('/zoom/disconnect', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('Disconnecting Zoom account for user:', userId);

    // Deactivate the connection
    const { error } = await supabase
      .from('zoom_connections')
      .update({ 
        is_active: false,
        access_token: null,
        refresh_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to disconnect:', error);
      return res.status(500).json({ error: 'Failed to disconnect Zoom account' });
    }

    console.log('✅ Zoom account disconnected successfully');
    res.json({ success: true });

  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
