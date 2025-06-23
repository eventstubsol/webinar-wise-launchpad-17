
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const createSupabaseClient = (authHeader?: string) => {
  if (authHeader) {
    return createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
  }
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
};

const authenticateUser = async (supabase: any) => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
};

const handleOAuthExchange = async (req: Request) => {
  const { code, state, redirectUri } = await req.json();
  
  if (!code) {
    throw new Error('Authorization code is required');
  }

  const supabaseClient = createSupabaseClient(req.headers.get('Authorization')!);
  const user = await authenticateUser(supabaseClient);
  
  const serviceClient = createSupabaseClient();

  // Get user's Zoom credentials
  const { data: credentials } = await serviceClient
    .from('zoom_credentials')
    .select('client_id, client_secret')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!credentials) {
    throw new Error('No active Zoom credentials found');
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
    throw new Error('Failed to exchange authorization code');
  }

  const tokenData = await tokenResponse.json();

  // Get user info from Zoom
  const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to get user information');
  }

  const zoomUser = await userResponse.json();
  const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

  // Store connection
  const connectionData = {
    user_id: user.id,
    zoom_user_id: zoomUser.id,
    zoom_account_id: zoomUser.account_id || zoomUser.id,
    zoom_email: zoomUser.email,
    zoom_account_type: zoomUser.type === 2 ? 'Licensed' : 'Basic',
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
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
    throw new Error('Failed to save connection');
  }

  return {
    success: true,
    message: "Zoom account connected successfully",
    connection,
  };
};

const handleCredentialsValidation = async (req: Request) => {
  const supabaseClient = createSupabaseClient(req.headers.get('Authorization')!);
  const user = await authenticateUser(supabaseClient);

  const { data: credentials, error: credentialsError } = await supabaseClient
    .from('zoom_credentials')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (credentialsError || !credentials) {
    throw new Error('No active Zoom credentials configured');
  }

  const serviceClient = createSupabaseClient();

  // Request Server-to-Server OAuth token
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
    throw new Error('Invalid Zoom credentials');
  }
  
  const tokenData = await tokenResponse.json();

  // Validate token
  const userTestResponse = await fetch('https://api.zoom.us/v2/users/me', {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
  });

  if (!userTestResponse.ok) {
    throw new Error('Failed to validate token');
  }
  
  const accountData = await userTestResponse.json();

  // Check for existing connection
  const { data: existingConnection } = await serviceClient
    .from('zoom_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('zoom_account_id', accountData.account_id || accountData.id)
    .single();

  const connectionData = {
    user_id: user.id,
    zoom_user_id: accountData.id,
    zoom_account_id: accountData.account_id || accountData.id,
    zoom_email: accountData.email,
    zoom_account_type: accountData.plan_type || (accountData.type === 1 ? 'Basic' : 'Licensed'),
    access_token: tokenData.access_token,
    refresh_token: 'SERVER_TO_SERVER_NOT_APPLICABLE',
    token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
    scopes: tokenData.scope?.split(' ') || ['webinar:read:admin', 'user:read:admin'],
    connection_status: 'active',
    is_primary: true,
    auto_sync_enabled: true,
    sync_frequency_hours: 24,
    updated_at: new Date().toISOString(),
  };

  let connection;
  let operationType;

  if (existingConnection) {
    operationType = 'updated';
    const { data: updatedConnection, error: updateError } = await serviceClient
      .from('zoom_connections')
      .update(connectionData)
      .eq('id', existingConnection.id)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update connection');
    }
    connection = updatedConnection;
  } else {
    operationType = 'created';
    await serviceClient
      .from('zoom_connections')
      .update({ is_primary: false })
      .eq('user_id', user.id);

    const { data: newConnection, error: insertError } = await serviceClient
      .from('zoom_connections')
      .insert(connectionData)
      .select()
      .single();

    if (insertError) {
      throw new Error('Failed to save connection');
    }
    connection = newConnection;
  }

  return {
    success: true,
    message: `Zoom credentials validated successfully with Server-to-Server OAuth (${operationType})`,
    connection: connection,
    accountInfo: {
      id: accountData.id,
      email: accountData.email,
      plan_type: accountData.plan_type || accountData.type,
    }
  };
};

const handleZoomSync = async (req: Request) => {
  const requestBody = await req.json();
  const supabase = createSupabaseClient(req.headers.get('Authorization')!);
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data: connection, error: connError } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('id', requestBody.connectionId)
    .eq('user_id', user.id)
    .single();

  if (connError || !connection) {
    throw new Error('Connection not found');
  }

  // Create sync log
  const { data: syncLog, error: syncError } = await supabase
    .from('zoom_sync_logs')
    .insert({
      connection_id: requestBody.connectionId,
      sync_type: requestBody.syncType || 'manual',
      sync_status: 'started',
      resource_type: requestBody.syncType === 'single' ? 'webinar' : 'webinars',
      resource_id: requestBody.webinarId || null,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (syncError) {
    throw new Error('Failed to initialize sync operation');
  }

  // Queue the actual sync processing (simplified for now)
  console.log(`Starting sync process for connection ${connection.id}, sync log ${syncLog.id}`);
  
  return {
    success: true,
    syncId: syncLog.id,
    status: 'started',
    message: `${requestBody.syncType} sync initiated successfully.`,
  };
};

const handleZoomTest = async (req: Request) => {
  const supabase = createSupabaseClient(req.headers.get('Authorization')!);
  const user = await authenticateUser(supabase);

  const { data: connections } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .limit(1);

  if (!connections || connections.length === 0) {
    return {
      success: false,
      error: 'No Zoom connection found',
      hasConnection: false,
    };
  }

  const connection = connections[0];

  // Test API connection
  try {
    const response = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const userData = await response.json();

    return {
      success: true,
      hasConnection: true,
      connection: {
        id: connection.id,
        zoom_email: connection.zoom_email,
        zoom_account_type: connection.zoom_account_type,
        connection_status: connection.connection_status,
      },
      userData: {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      hasConnection: true,
      connection: {
        id: connection.id,
        zoom_email: connection.zoom_email,
        connection_status: 'error',
      },
    };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    let result;
    switch (action) {
      case 'oauth-exchange':
        result = await handleOAuthExchange(req);
        break;
      case 'validate-credentials':
        result = await handleCredentialsValidation(req);
        break;
      case 'sync':
        result = await handleZoomSync(req);
        break;
      case 'test':
        result = await handleZoomTest(req);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Zoom API Gateway error:', error);
    
    const status = error.message === 'Unauthorized' ? 401 : 500;
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
});
