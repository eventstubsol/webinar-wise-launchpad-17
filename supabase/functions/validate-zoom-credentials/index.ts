
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // Initialize Supabase client
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
      console.error('No Zoom credentials found:', credentialsError);
      return new Response(
        JSON.stringify({ error: 'No Zoom credentials configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Validating credentials for user:', user.id, 'account:', credentials.account_id);

    // Use a simpler token request without explicit scopes
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: credentials.account_id
    });

    console.log('Token request body:', tokenRequestBody.toString());

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
          error: 'Invalid Zoom credentials',
          details: 'Unable to authenticate with Zoom API. Please verify your Client ID, Client Secret, and Account ID.',
          statusCode: tokenResponse.status,
          zoomError: errorText
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token obtained successfully. Scopes:', tokenData.scope);

    // Try /users/me first - this should work with basic user scopes
    console.log('Testing token with /users/me endpoint...');
    const userTestResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    let accountData = null;
    let accountEndpoint = '';

    if (userTestResponse.ok) {
      accountData = await userTestResponse.json();
      accountEndpoint = '/users/me';
      console.log('Success with /users/me endpoint. User data:', {
        id: accountData.id,
        email: accountData.email,
        type: accountData.type,
        plan_type: accountData.plan_type
      });
    } else {
      const userErrorText = await userTestResponse.text();
      console.error('Failed /users/me:', userTestResponse.status, userErrorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to validate Zoom credentials',
          details: 'Unable to access basic user information. Please check your app permissions in Zoom Marketplace.',
          tokenScopes: tokenData.scope,
          statusCode: userTestResponse.status,
          zoomError: userErrorText
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get account information if we have account scopes
    if (tokenData.scope && tokenData.scope.includes('account:read')) {
      console.log('Attempting to get account info with account scopes...');
      
      const accountResponse = await fetch(`https://api.zoom.us/v2/accounts/${credentials.account_id}`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (accountResponse.ok) {
        const accountInfo = await accountResponse.json();
        console.log('Account info retrieved successfully:', {
          id: accountInfo.id,
          account_name: accountInfo.account_name,
          owner_email: accountInfo.owner_email
        });
        // Use account info instead of user info if available
        accountData = {
          ...accountData,
          account_name: accountInfo.account_name,
          owner_email: accountInfo.owner_email,
          account_id: accountInfo.id
        };
      } else {
        const accountErrorText = await accountResponse.text();
        console.log('Account info not available:', accountResponse.status, accountErrorText);
        // Continue with user info - this is not a failure
      }
    }

    console.log('Using endpoint:', accountEndpoint, 'for account validation');

    // Create or update zoom connection record
    const connectionData = {
      user_id: user.id,
      zoom_user_id: accountData.id,
      zoom_account_id: accountData.account_id || accountData.id,
      zoom_email: accountData.email || accountData.owner_email || 'Unknown',
      zoom_account_type: accountData.plan_type || accountData.type || 'Unknown',
      access_token: 'validated', // We don't store the actual token for Server-to-Server
      refresh_token: 'not_applicable',
      token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      scopes: tokenData.scope ? tokenData.scope.split(' ') : ['user:read:admin'],
      connection_status: 'active',
      is_primary: true,
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
    };

    // Check if connection already exists
    const { data: existingConnection } = await supabaseClient
      .from('zoom_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('zoom_account_id', connectionData.zoom_account_id)
      .single();

    let connection;
    if (existingConnection) {
      // Update existing connection
      const { data: updatedConnection, error: updateError } = await supabaseClient
        .from('zoom_connections')
        .update(connectionData)
        .eq('id', existingConnection.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update connection:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update connection' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      connection = updatedConnection;
    } else {
      // Create new connection
      const { data: newConnection, error: insertError } = await supabaseClient
        .from('zoom_connections')
        .insert(connectionData)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create connection:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create connection' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      connection = newConnection;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Zoom credentials validated successfully',
        connection: connection,
        accountInfo: {
          id: accountData.id,
          email: accountData.email || accountData.owner_email,
          plan_type: accountData.plan_type || accountData.type,
          account_name: accountData.account_name
        },
        debugInfo: {
          endpointUsed: accountEndpoint,
          tokenScopes: tokenData.scope,
          hasAccountAccess: tokenData.scope && tokenData.scope.includes('account:read')
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
