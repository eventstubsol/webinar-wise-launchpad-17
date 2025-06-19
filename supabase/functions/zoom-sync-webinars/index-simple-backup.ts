import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, zoom_connection_id, test_mode',
  'Access-Control-Max-Age': '86400',
};

// Simple console log function for Deno
const log = (message: string, data?: any) => {
  if (data) {
    console.log(`${new Date().toISOString()} - ${message}`, JSON.stringify(data));
  } else {
    console.log(`${new Date().toISOString()} - ${message}`);
  }
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  
  let syncLogId = null;
  
  try {
    log('🚀 ZOOM SYNC: Function called');
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing environment variables');
    }
    
    // Check auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Get user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error(`Auth failed: ${userError.message}`);
    
    const userId = userData.user.id;
    log('User authenticated', { userId });
    
    // Get connection ID
    const connectionId = req.headers.get('zoom_connection_id');
    if (!connectionId) {
      return new Response(JSON.stringify({ error: 'Missing zoom_connection_id header' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Fetch connection
    const { data: connection, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();
    
    if (connError || !connection) {
      throw new Error('Zoom connection not found');
    }
    
    log('Connection found', { 
      connectionId, 
      email: connection.zoom_email,
      hasToken: !!connection.access_token 
    });
    
    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: 'initial',
        sync_status: 'started',
        started_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0
      })
      .select('id')
      .single();
    
    if (logError) {
      throw new Error(`Failed to create sync log: ${logError.message}`);
    }
    
    syncLogId = syncLog.id;
    log('Sync log created', { syncLogId });
    
    // For now, just mark as completed to test basic flow
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        completed_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0
      })
      .eq('id', syncLogId);
    
    return new Response(JSON.stringify({ 
      success: true,
      data: 'Test sync completed',
      syncId: syncLogId 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    log('ERROR:', error);
    
    // Update sync log if exists
    if (syncLogId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        await supabase
          .from('zoom_sync_logs')
          .update({
            sync_status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', syncLogId);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: 'Sync failed',
      details: error.message,
      syncId: syncLogId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
