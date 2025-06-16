
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SimpleTokenEncryption } from './encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with user's auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's active Zoom credentials
    const { data: credentials, error: credentialsError } = await supabaseClient
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (credentialsError || !credentials) {
      console.error('No active Zoom credentials found:', credentialsError);
      return new Response(
        JSON.stringify({ error: 'No active Zoom credentials configured for this user.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Validating credentials for user:', user.id, 'account:', credentials.account_id);

    // Use service role for database operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, clean up any existing connections for this user
    const { error: deleteError } = await serviceClient
      .from('zoom_connections')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error cleaning up existing connections:', deleteError);
      // Continue anyway, as this might just mean no existing connections
    }

    // Request Server-to-Server OAuth token from Zoom
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: credentials.account_id
    });

    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${credentials.client_id}:${credentials.client_secret}`)}`,
      },
      body: tokenRequestBody,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Zoom token request failed:', tokenResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Zoom credentials. Please verify your Client ID, Client Secret, and Account ID.',
          details: errorText,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const tokenData = await tokenResponse.json();

    // Validate the token by fetching basic user info
    const userTestResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });

    if (!userTestResponse.ok) {
      const userErrorText = await userTestResponse.text();
      console.error('Failed /users/me validation:', userTestResponse.status, userErrorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to validate token. Check app permissions in Zoom Marketplace.',
          details: userErrorText,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const accountData = await userTestResponse.json();

    // Encrypt the actual Server-to-Server access token using proper encryption
    const encryptedAccessToken = await SimpleTokenEncryption.encryptToken(tokenData.access_token, user.id);
    const encryptedRefreshToken = await SimpleTokenEncryption.encryptToken('SERVER_TO_SERVER_NOT_APPLICABLE', user.id);

    // Prepare connection data for Server-to-Server
    const connectionData = {
      user_id: user.id,
      zoom_user_id: accountData.id,
      zoom_account_id: accountData.account_id || accountData.id,
      zoom_email: accountData.email,
      zoom_account_type: accountData.plan_type || (accountData.type === 1 ? 'Basic' : 'Licensed'),
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      scopes: tokenData.scope?.split(' ') || ['webinar:read:admin', 'user:read:admin'],
      connection_status: 'active',
      is_primary: true,
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
    };
    
    // Insert new connection data
    const { data: connection, error: insertError } = await serviceClient
      .from('zoom_connections')
      .insert(connectionData)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert connection:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save connection to database', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Server-to-Server connection created successfully for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Zoom credentials validated successfully with Server-to-Server OAuth',
        connection: connection,
        accountInfo: {
          id: accountData.id,
          email: accountData.email,
          plan_type: accountData.plan_type || accountData.type,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
