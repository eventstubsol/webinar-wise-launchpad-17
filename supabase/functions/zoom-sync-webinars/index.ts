import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { processEnhancedWebinarSync } from './fixed-enhanced-sync-processor.ts';
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
  const startTime = Date.now();
  const TIMEOUT_MS = 25000; // 25 seconds to stay well under the 30-second limit
  
  try {
    console.log('🚀 ZOOM SYNC WEBINARS: Starting FIXED enhanced sync operation');
    console.log(`⏱️ Function timeout set to ${TIMEOUT_MS / 1000} seconds`);
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
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

    // Create Supabase client for user authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    });

    // Get user
    const { data: user, error: userError } = await supabaseAuth.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Failed to get user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Create admin client with service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

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

    // Fetch Zoom connection using auth client to ensure user owns it
    const { data: connection, error: connectionError } = await supabaseAuth
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

    console.log('Starting FIXED enhanced webinar sync process...');
    
    // Create a promise that will timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Function timeout approaching')), TIMEOUT_MS);
    });
    
    // Race between sync process and timeout
    try {
      await Promise.race([
        processEnhancedWebinarSync(
          supabaseAdmin,
          syncOperation,
          connection,
          syncLogId
        ),
        timeoutPromise
      ]);
      
      console.log('FIXED Enhanced sync completed successfully');
      
      return new Response(JSON.stringify({ 
        success: true,
        data: 'FIXED Enhanced webinar sync completed successfully',
        syncId: syncLogId,
        executionTime: Date.now() - startTime
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (timeoutError) {
      if (timeoutError.message === 'Function timeout approaching') {
        console.log('⏱️ Function approaching timeout, gracefully returning partial results');
        
        // Update sync log to indicate partial completion
        await updateSyncLog(supabaseAdmin, syncLogId, {
          sync_status: 'partial',
          completed_at: new Date().toISOString(),
          error_message: 'FIXED Enhanced sync partially completed due to timeout - additional syncs may be needed'
        });
        
        return new Response(JSON.stringify({ 
          success: true,
          data: 'FIXED Enhanced webinar sync partially completed due to timeout',
          syncId: syncLogId,
          executionTime: Date.now() - startTime,
          partial: true
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw timeoutError; // Re-throw if it's not a timeout error
    }

  } catch (error) {
    console.error('Error during FIXED enhanced sync operation:', error);
    
    // Update sync log with error if we have syncLogId
    if (syncLogId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        if (supabaseUrl && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          });
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
      error: 'FIXED Enhanced webinar sync failed', 
      details: error.message || 'Unknown error occurred',
      syncId: syncLogId,
      executionTime: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
