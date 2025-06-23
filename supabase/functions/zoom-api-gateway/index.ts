
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

const handleCredentialsValidation = async (authHeader: string) => {
  console.log('Starting credentials validation');
  
  const supabaseClient = createSupabaseClient(authHeader);
  const user = await authenticateUser(supabaseClient);
  console.log('User authenticated:', user.id);

  const { data: credentials, error: credentialsError } = await supabaseClient
    .from('zoom_credentials')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (credentialsError || !credentials) {
    console.log('No credentials found:', credentialsError);
    throw new Error('No active Zoom credentials configured');
  }

  console.log('Found credentials for validation');
  const serviceClient = createSupabaseClient();

  // Request Server-to-Server OAuth token
  const tokenRequestBody = new URLSearchParams({
    grant_type: 'account_credentials',
    account_id: credentials.account_id
  });

  console.log('Requesting Zoom token...');
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
    console.log('Token request failed:', errorText);
    throw new Error('Invalid Zoom credentials');
  }
  
  const tokenData = await tokenResponse.json();
  console.log('Got token, testing API...');

  // Validate token with Zoom API
  const userTestResponse = await fetch('https://api.zoom.us/v2/users/me', {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
  });

  if (!userTestResponse.ok) {
    console.log('API test failed:', userTestResponse.status, userTestResponse.statusText);
    throw new Error('Failed to validate token with Zoom API');
  }
  
  const accountData = await userTestResponse.json();
  console.log('API test successful, creating/updating connection...');

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
      console.log('Update error:', updateError);
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
      console.log('Insert error:', insertError);
      throw new Error('Failed to save connection');
    }
    connection = newConnection;
  }

  console.log('Connection saved successfully');
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

const handleZoomTest = async (authHeader: string) => {
  const supabase = createSupabaseClient(authHeader);
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
    const requestBody = await req.json();
    const action = requestBody?.action;
    
    console.log(`Processing action: ${action}`);

    if (!action) {
      throw new Error('Missing action parameter');
    }

    let result;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    switch (action) {
      case 'validate-credentials':
        result = await handleCredentialsValidation(authHeader);
        break;
      case 'test':
        result = await handleZoomTest(authHeader);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge function error:', error);
    
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
