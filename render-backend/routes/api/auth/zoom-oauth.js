const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Zoom OAuth configuration
const ZOOM_CLIENT_ID = process.env.ZOOM_OAUTH_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_OAUTH_CLIENT_SECRET;
const ZOOM_REDIRECT_URI = process.env.ZOOM_OAUTH_REDIRECT_URI || `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001'}/api/auth/zoom/callback`;

// Required scopes for Webinar Wise
const ZOOM_SCOPES = [
  'user:read',
  'account:read:admin',
  'webinar:read:admin',
  'recording:read:admin',
  'report:read:admin'
].join(' ');

// Store state temporarily (in production, use Redis or database)
const stateStore = new Map();

/**
 * Generate Zoom OAuth URL
 * GET /api/auth/zoom/authorize
 */
router.get('/zoom/authorize', async (req, res) => {
  try {
    // Generate a secure random state
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state with expiration (5 minutes)
    stateStore.set(state, {
      timestamp: Date.now(),
      returnUrl: req.query.returnUrl || '/dashboard'
    });
    
    // Clean up old states
    for (const [key, value] of stateStore.entries()) {
      if (Date.now() - value.timestamp > 5 * 60 * 1000) {
        stateStore.delete(key);
      }
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
    
    res.json({ 
      authUrl: zoomAuthUrl,
      state: state 
    });
  } catch (error) {
    console.error('Error generating Zoom OAuth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * Handle Zoom OAuth callback
 * GET /api/auth/zoom/callback
 */
router.get('/zoom/callback', async (req, res) => {
  try {
    const { code, state, error: zoomError } = req.query;

    // Check for Zoom errors
    if (zoomError) {
      console.error('Zoom OAuth error:', zoomError);
      return res.redirect(`${process.env.VITE_APP_URL}/login?error=zoom_oauth_denied`);
    }

    // Validate state
    const stateData = stateStore.get(state);
    if (!stateData) {
      console.error('Invalid or expired state');
      return res.redirect(`${process.env.VITE_APP_URL}/login?error=invalid_state`);
    }
    
    // Clean up state
    stateStore.delete(state);

    // Exchange code for access token
    const tokenUrl = 'https://zoom.us/oauth/token';
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: ZOOM_REDIRECT_URI
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
      console.error('Token exchange failed:', errorData);
      return res.redirect(`${process.env.VITE_APP_URL}/login?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // Get user information from Zoom
    const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch user info');
      return res.redirect(`${process.env.VITE_APP_URL}/login?error=user_info_failed`);
    }

    const zoomUser = await userResponse.json();

    // Check if user exists in Supabase
    let { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', zoomUser.email)
      .single();

    let userId;
    let isNewUser = false;

    if (!existingUser) {
      // Create new user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: zoomUser.email,
        email_confirm: true,
        user_metadata: {
          full_name: `${zoomUser.first_name} ${zoomUser.last_name}`,
          zoom_id: zoomUser.id,
          zoom_account_id: zoomUser.account_id,
          avatar_url: zoomUser.pic_url
        }
      });

      if (authError) {
        console.error('Failed to create user:', authError);
        return res.redirect(`${process.env.VITE_APP_URL}/login?error=user_creation_failed`);
      }

      userId = authData.user.id;
      isNewUser = true;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: zoomUser.email,
          full_name: `${zoomUser.first_name} ${zoomUser.last_name}`,
          avatar_url: zoomUser.pic_url,
          zoom_user_id: zoomUser.id,
          zoom_account_id: zoomUser.account_id,
          role: zoomUser.role_name === 'Owner' ? 'zoom_admin' : 'member',
          is_zoom_admin: ['Owner', 'Admin'].includes(zoomUser.role_name),
          zoom_account_level: zoomUser.role_name
        });

      if (profileError) {
        console.error('Failed to create profile:', profileError);
        // Continue anyway, profile will be created later
      }
    } else {
      userId = existingUser.id;
      
      // Update profile with latest Zoom info
      await supabase
        .from('profiles')
        .update({
          avatar_url: zoomUser.pic_url,
          zoom_user_id: zoomUser.id,
          zoom_account_id: zoomUser.account_id,
          role: zoomUser.role_name === 'Owner' ? 'zoom_admin' : existingUser.role,
          is_zoom_admin: ['Owner', 'Admin'].includes(zoomUser.role_name),
          zoom_account_level: zoomUser.role_name
        })
        .eq('id', userId);
    }

    // Store Zoom OAuth tokens
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
        zoom_account_type: zoomUser.account_type,
        is_active: true,
        last_sync_at: null
      }, {
        onConflict: 'user_id'
      });

    if (connectionError) {
      console.error('Failed to store Zoom connection:', connectionError);
      return res.redirect(`${process.env.VITE_APP_URL}/login?error=connection_storage_failed`);
    }

    // Generate a magic link for the user to sign in
    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: zoomUser.email,
      options: {
        redirectTo: `${process.env.VITE_APP_URL}${stateData.returnUrl}`
      }
    });

    if (magicLinkError) {
      console.error('Failed to generate magic link:', magicLinkError);
      return res.redirect(`${process.env.VITE_APP_URL}/login?error=magic_link_failed`);
    }

    // Redirect to the magic link
    res.redirect(magicLinkData.properties.action_link);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.VITE_APP_URL}/login?error=oauth_error`);
  }
});

/**
 * Get Zoom OAuth consent info
 * GET /api/auth/zoom/consent-info
 */
router.get('/zoom/consent-info', (req, res) => {
  res.json({
    summary: "Webinar Wise will access your Zoom account information and webinar data to provide analytics and insights.",
    scopes: [
      {
        name: "user:read",
        description: "Read your basic Zoom profile information"
      },
      {
        name: "account:read:admin",
        description: "View your Zoom account details"
      },
      {
        name: "webinar:read:admin",
        description: "Access your webinar data and participant information"
      },
      {
        name: "recording:read:admin",
        description: "Access webinar recordings for analysis"
      },
      {
        name: "report:read:admin",
        description: "Generate reports from your webinar data"
      }
    ],
    privacyUrl: `${process.env.VITE_APP_URL}/privacy`,
    termsUrl: `${process.env.VITE_APP_URL}/terms`
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

    // Get current connection
    const { data: connection, error: connectionError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (connectionError || !connection) {
      return res.status(404).json({ error: 'Zoom connection not found' });
    }

    // Refresh the token
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
      return res.status(400).json({ error: 'Token refresh failed' });
    }

    const tokenData = await tokenResponse.json();

    // Update stored tokens
    const { error: updateError } = await supabase
      .from('zoom_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update tokens:', updateError);
      return res.status(500).json({ error: 'Failed to update tokens' });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
