
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log('=== ZOOM OAUTH COMPLETE FUNCTION ===');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const zoomClientId = Deno.env.get('ZOOM_OAUTH_CLIENT_ID');
    const zoomClientSecret = Deno.env.get('ZOOM_OAUTH_CLIENT_SECRET');
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8080';

    if (!supabaseUrl || !supabaseServiceKey || !zoomClientId || !zoomClientSecret) {
      throw new Error('Missing required environment variables');
    }

    // Handle OAuth errors
    if (error) {
      console.error('Zoom OAuth error:', error);
      const errorUrl = `${appUrl}/login?error=zoom_oauth_denied`;
      return Response.redirect(errorUrl, 302);
    }

    if (!code || !state) {
      console.error('Missing required OAuth parameters');
      const errorUrl = `${appUrl}/login?error=missing_parameters`;
      return Response.redirect(errorUrl, 302);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate state
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !stateData) {
      console.error('Invalid or expired OAuth state');
      const errorUrl = `${appUrl}/login?error=invalid_state`;
      return Response.redirect(errorUrl, 302);
    }

    // Clean up state
    await supabase.from('oauth_states').delete().eq('state', state);

    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/zoom-oauth-complete`;
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${zoomClientId}:${zoomClientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      const errorUrl = `${appUrl}/login?error=token_exchange_failed`;
      return Response.redirect(errorUrl, 302);
    }

    const tokenData = await tokenResponse.json();

    // Get user info from Zoom
    const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    if (!userResponse.ok) {
      console.error('Failed to get Zoom user info');
      const errorUrl = `${appUrl}/login?error=user_info_failed`;
      return Response.redirect(errorUrl, 302);
    }

    const zoomUser = await userResponse.json();

    // Create or get Supabase user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: zoomUser.email,
      email_confirm: true,
      user_metadata: {
        full_name: `${zoomUser.first_name} ${zoomUser.last_name}`.trim(),
        zoom_user_id: zoomUser.id,
        provider: 'zoom'
      }
    });

    if (authError && authError.message !== 'User already registered') {
      // If user exists, try to get them
      if (authError.message.includes('already registered')) {
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const user = existingUser.users?.find(u => u.email === zoomUser.email);
        
        if (user) {
          // Update user metadata
          await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              zoom_user_id: zoomUser.id,
              provider: 'zoom'
            }
          });
          authData.user = user;
        }
      } else {
        console.error('Failed to create/get user:', authError);
        const errorUrl = `${appUrl}/login?error=user_creation_failed`;
        return Response.redirect(errorUrl, 302);
      }
    }

    if (!authData.user) {
      console.error('No user data after auth operation');
      const errorUrl = `${appUrl}/login?error=user_creation_failed`;
      return Response.redirect(errorUrl, 302);
    }

    // Encrypt tokens
    const encryptionSalt = Deno.env.get('ENCRYPTION_SALT') || 'default-salt';
    const { TokenEncryption } = await import('../encryption/index.ts');
    
    const encryptedAccessToken = await TokenEncryption.encryptToken(tokenData.access_token, encryptionSalt);
    const encryptedRefreshToken = tokenData.refresh_token ? 
      await TokenEncryption.encryptToken(tokenData.refresh_token, encryptionSalt) : null;

    // Store Zoom connection
    const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    
    // Delete existing connections for this user
    await supabase
      .from('zoom_connections')
      .delete()
      .eq('user_id', authData.user.id);

    const { error: connectionError } = await supabase
      .from('zoom_connections')
      .insert({
        user_id: authData.user.id,
        zoom_user_id: zoomUser.id,
        zoom_account_id: zoomUser.account_id || zoomUser.id,
        zoom_email: zoomUser.email,
        zoom_account_type: zoomUser.type === 2 ? 'Licensed' : 'Basic',
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        scopes: tokenData.scope.split(' '),
        connection_status: 'active',
        connection_type: 'oauth',
        is_primary: true
      });

    if (connectionError) {
      console.error('Failed to store connection:', connectionError);
      const errorUrl = `${appUrl}/login?error=connection_storage_failed`;
      return Response.redirect(errorUrl, 302);
    }

    // Generate auth session
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: zoomUser.email,
      options: {
        redirectTo: `${appUrl}${stateData.return_url}`
      }
    });

    if (sessionError || !sessionData.properties?.action_link) {
      console.error('Failed to generate session:', sessionError);
      const errorUrl = `${appUrl}/login?error=session_failed`;
      return Response.redirect(errorUrl, 302);
    }

    // Redirect to the magic link to establish session
    console.log('Zoom OAuth completed successfully, redirecting to establish session');
    return Response.redirect(sessionData.properties.action_link, 302);

  } catch (error) {
    console.error('Error in zoom-oauth-complete:', error);
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8080';
    const errorUrl = `${appUrl}/login?error=oauth_error`;
    return Response.redirect(errorUrl, 302);
  }
});
