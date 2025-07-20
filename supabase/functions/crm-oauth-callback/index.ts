
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const crmType = url.searchParams.get('crm_type');

    if (!code || !state || !crmType) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth header to identify user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the connection being set up
    const { data: connection, error: connectionError } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('crm_type', crmType)
      .eq('status', 'pending')
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Connection not found or already configured' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for tokens based on CRM type
    let tokenResult;
    
    try {
      switch (crmType) {
        case 'salesforce':
          tokenResult = await exchangeSalesforceTokens(code, connection.config);
          break;
        case 'hubspot':
          tokenResult = await exchangeHubSpotTokens(code, connection.config);
          break;
        case 'pipedrive':
          tokenResult = await exchangePipedriveTokens(code, connection.config);
          break;
        default:
          throw new Error(`Unsupported CRM type: ${crmType}`);
      }
    } catch (tokenError) {
      console.error('Token exchange error:', tokenError);
      
      // Update connection with error status
      await supabase
        .from('crm_connections')
        .update({
          status: 'error',
          error_message: `Token exchange failed: ${tokenError.message}`,
          error_count: connection.error_count + 1
        })
        .eq('id', connection.id);

      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code for tokens' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update connection with tokens
    const { error: updateError } = await supabase
      .from('crm_connections')
      .update({
        access_token: tokenResult.accessToken,
        refresh_token: tokenResult.refreshToken,
        token_expires_at: tokenResult.expiresAt,
        instance_url: tokenResult.instanceUrl,
        status: 'active',
        error_message: null,
        error_count: 0
      })
      .eq('id', connection.id);

    if (updateError) {
      console.error('Failed to update connection:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save connection tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'CRM connection established successfully',
        connection_id: connection.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function exchangeSalesforceTokens(code: string, config: any) {
  const tokenUrl = 'https://login.salesforce.com/services/oauth2/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/crm-oauth-callback`
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Salesforce token exchange failed: ${errorText}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
    instanceUrl: data.instance_url
  };
}

async function exchangeHubSpotTokens(code: string, config: any) {
  const tokenUrl = 'https://api.hubapi.com/oauth/v1/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/crm-oauth-callback`
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HubSpot token exchange failed: ${errorText}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
    instanceUrl: undefined
  };
}

async function exchangePipedriveTokens(code: string, config: any) {
  const tokenUrl = 'https://oauth.pipedrive.com/oauth/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/crm-oauth-callback`
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pipedrive token exchange failed: ${errorText}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
    instanceUrl: undefined
  };
}
