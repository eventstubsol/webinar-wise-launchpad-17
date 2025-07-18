import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { TokenEncryption } from "../encryption/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, state, redirectUri } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's Zoom credentials for OAuth
    const { data: credentials } = await serviceClient
      .from('zoom_credentials')
      .select('client_id, client_secret')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!credentials) {
      return new Response(
        JSON.stringify({ error: 'No active Zoom credentials found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${credentials.client_id}:${credentials.client_secret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri || Deno.env.get('ZOOM_REDIRECT_URI') || '',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();

    // Get user info from Zoom
    const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Failed to get user info:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get user information' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const zoomUser = await userResponse.json();
    const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Encrypt tokens before storing
    const encryptionSalt = Deno.env.get('ENCRYPTION_SALT') || 'default-salt';
    const encryptedAccessToken = await TokenEncryption.encryptToken(tokenData.access_token, encryptionSalt);
    const encryptedRefreshToken = tokenData.refresh_token ? 
      await TokenEncryption.encryptToken(tokenData.refresh_token, encryptionSalt) : null;

    // Store connection with encrypted tokens
    const connectionData = {
      user_id: user.id,
      zoom_user_id: zoomUser.id,
      zoom_account_id: zoomUser.account_id || zoomUser.id,
      zoom_email: zoomUser.email,
      zoom_account_type: zoomUser.type === 2 ? 'Licensed' : 'Basic',
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: tokenExpiresAt,
      scopes: tokenData.scope.split(' '),
      connection_status: 'active',
      is_primary: true,
    };

    // Delete existing connections and insert new one
    await serviceClient
      .from('zoom_connections')
      .delete()
      .eq('user_id', user.id);

    const { data: connection, error: insertError } = await serviceClient
      .from('zoom_connections')
      .insert(connectionData)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert connection:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Zoom account connected successfully with encrypted tokens",
        connection,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OAuth exchange function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});