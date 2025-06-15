
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple encryption for Server-to-Server tokens (placeholder values)
function encryptPlaceholderToken(token: string, userId: string): string {
  // For Server-to-Server OAuth, we store encrypted placeholders
  // This ensures the frontend decryption doesn't fail
  const combined = token + ':' + userId;
  return btoa(combined); // Simple base64 encoding for placeholders
}

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

    // Prepare connection data using validated info
    const connectionData = {
      user_id: user.id,
      zoom_user_id: accountData.id,
      zoom_account_id: accountData.account_id || accountData.id,
      zoom_email: accountData.email,
      zoom_account_type: accountData.plan_type || (accountData.type === 1 ? 'Basic' : 'Licensed'),
      access_token: encryptPlaceholderToken('SERVER_TO_SERVER_VALIDATED', user.id),
      refresh_token: encryptPlaceholderToken('SERVER_TO_SERVER_NOT_APPLICABLE', user.id),
      token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      scopes: tokenData.scope?.split(' ') || [],
      connection_status: 'active',
      is_primary: true,
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
    };

    // Use service role for database operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Upsert connection data
    const { data: connection, error: upsertError } = await serviceClient
      .from('zoom_connections')
      .upsert(connectionData, { onConflict: 'user_id, zoom_account_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('Failed to upsert connection:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save connection to database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Zoom credentials validated successfully',
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
