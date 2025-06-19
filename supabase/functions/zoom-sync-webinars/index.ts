import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { processSimpleWebinarSync } from './simple-sync-processor.ts';
import { createSyncLog, updateSyncLog } from './database-operations.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, zoom_connection_id, test_mode',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  
  let syncLogId: string | null = null;
  
  try {
    console.log('🚀 ZOOM SYNC WEBINARS: Starting sync operation');
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing environment variables');
    }
    
    // Check authorization
    const authorizationHeader = req.headers.get('Authorization');
    if (!authorizationHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const bearerToken = authorizationHeader.replace('Bearer ', '');
    if (!bearerToken) {
      return new Response(JSON.stringify({ error: 'Invalid Authorization header format' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Supabase client
    const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    });

    // Get user
    const { data: user, error: userError } = await supabaseAdmin.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Failed to get user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.user.id;
    console.log(`User ID: ${userId}`);

    // Get connection ID
    const connectionId = req.headers.get('zoom_connection_id');
    if (!connectionId) {
      return new Response(JSON.stringify({ error: 'Missing zoom_connection_id header' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Zoom Connection ID: ${connectionId}`);

    // Fetch Zoom connection
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connectionError || !connection) {
      console.error('Error fetching Zoom connection:', connectionError);
      return new Response(JSON.stringify({ error: 'Zoom connection not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Zoom Connection Email: ${connection.zoom_email}`);

    const testModeHeader = req.headers.get('test_mode');
    const testMode = testModeHeader === 'true';
    console.log(`Test Mode: ${testMode}`);

    // Create sync log entry with correct sync_type
    try {
      syncLogId = await createSyncLog(supabaseAdmin, connectionId, 'initial');
      console.log(`Sync Log ID: ${syncLogId}`);
    } catch (logError) {
      console.error('Failed to create sync log:', logError);
      throw new Error('Failed to create sync log');
    }

    // Create sync operation object
    const syncOperation = {
      id: connectionId,
      connection_id: connectionId,
      sync_type: 'initial', // Use 'initial' not 'full_sync'
      status: 'pending',
      options: {
        debug: false,
        testMode: testMode,
        forceRegistrantSync: false
      }
    };

    console.log('Starting webinar sync process...');
    
    // Start the sync process
    await processSimpleWebinarSync(
      supabaseAdmin,
      syncOperation,
      connection,
      syncLogId
    );

    console.log('Sync completed successfully');
    
    return new Response(JSON.stringify({ 
      success: true,
      data: 'Webinar sync completed successfully',
      syncId: syncLogId 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error during sync operation:', error);
    
    // Update sync log with error if we have syncLogId
    if (syncLogId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        if (supabaseUrl && supabaseAnonKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);
          await updateSyncLog(supabaseAdmin, syncLogId, {
            sync_status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message || 'Unknown error occurred'
          });
        }
      } catch (logError) {
        console.error('Failed to update sync log with error:', logError);
      }
    }

    return new Response(JSON.stringify({ 
      error: 'Webinar sync failed', 
      details: error.message || 'Unknown error occurred',
      syncId: syncLogId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
