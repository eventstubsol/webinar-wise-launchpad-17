import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, zoom_connection_id, test_mode',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req: Request): Promise<Response> => {
  console.log('🚀 Edge Function called:', new Date().toISOString());
  console.log('Method:', req.method);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  
  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing environment variables');
    }
    
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    console.log('Has auth header:', !!authHeader);
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Create client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Get user
    console.log('Getting user...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('User error:', userError);
      throw new Error(`Auth error: ${userError.message}`);
    }
    
    console.log('User ID:', userData.user.id);
    
    // Get connection ID
    const connectionId = req.headers.get('zoom_connection_id');
    console.log('Connection ID:', connectionId);
    
    if (!connectionId) {
      return new Response(JSON.stringify({ error: 'Missing zoom_connection_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Test database query
    console.log('Testing database connection...');
    const { data: connData, error: connError } = await supabase
      .from('zoom_connections')
      .select('id, zoom_email, access_token')
      .eq('id', connectionId)
      .eq('user_id', userData.user.id)
      .single();
    
    if (connError) {
      console.error('Connection query error:', connError);
      throw new Error(`Database error: ${connError.message}`);
    }
    
    console.log('Connection found:', !!connData);
    console.log('Has access token:', !!connData?.access_token);
    
    // If we get here, basic functionality works
    // Now let's test importing the processor
    console.log('Testing imports...');
    
    try {
      // Test importing the simple processor
      const { processSimpleWebinarSync } = await import('./simple-sync-processor.ts');
      console.log('Import successful');
      
      // Return success for now
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Edge Function is working',
        debug: {
          userId: userData.user.id,
          connectionId: connectionId,
          hasConnection: !!connData,
          hasAccessToken: !!connData?.access_token
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (importError) {
      console.error('Import error:', importError);
      throw new Error(`Import failed: ${importError.message}`);
    }
    
  } catch (error) {
    console.error('Edge Function error:', error);
    
    const errorResponse = {
      error: 'Internal Server Error',
      details: error.message || 'Unknown error',
      type: error.constructor?.name || 'Error'
    };
    
    if (error.stack) {
      errorResponse.stack = error.stack.split('\n').slice(0, 5);
    }
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
