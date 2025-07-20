import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { corsHeaders } from './cors.ts';
import { webinarSync } from './services/webinar-sync.ts';
import { createSyncLog, updateSyncLog } from './services/sync-log.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let syncLogId: string | null = null;

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    // Check authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase clients
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get user
    const { data: user, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get connection ID from header
    const connectionId = req.headers.get('zoom_connection_id');
    if (!connectionId) {
      return new Response(JSON.stringify({ error: 'Missing zoom_connection_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get sync type from header (default to 'webinars')
    const syncType = req.headers.get('sync_type') || 'webinars';

    console.log(`🚀 Starting ${syncType} sync for user ${user.user.id}, connection ${connectionId}`);

    // Verify connection ownership
    const { data: connection, error: connError } = await supabaseAuth
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.user.id)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'Connection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create sync log
    syncLogId = await createSyncLog(supabaseAdmin, connectionId, 'manual');
    console.log(`📝 Created sync log: ${syncLogId}`);

    // Update sync status
    await updateSyncLog(supabaseAdmin, syncLogId, {
      sync_status: 'in_progress',
      started_at: new Date().toISOString()
    });

    // Execute sync based on type
    let result;
    switch (syncType) {
      case 'webinars':
        result = await webinarSync(supabaseAdmin, connection, syncLogId);
        break;
      // Future sync types can be added here
      // case 'registrants':
      //   result = await registrantSync(supabaseAdmin, connection, syncLogId);
      //   break;
      // case 'participants':
      //   result = await participantSync(supabaseAdmin, connection, syncLogId);
      //   break;
      default:
        throw new Error(`Unknown sync type: ${syncType}`);
    }

    // Update sync log with completion
    await updateSyncLog(supabaseAdmin, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      processed_items: result.processedCount,
      total_items: result.totalCount
    });

    console.log(`✅ Sync completed successfully`);

    return new Response(JSON.stringify({
      success: true,
      syncId: syncLogId,
      message: `Successfully synced ${result.processedCount} ${syncType}`,
      processedCount: result.processedCount,
      totalCount: result.totalCount
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Sync error:', error);

    // Update sync log if we have one
    if (syncLogId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        if (supabaseUrl && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          await updateSyncLog(supabaseAdmin, syncLogId, {
            sync_status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message || 'Unknown error'
          });
        }
      } catch (logError) {
        console.error('Failed to update sync log:', logError);
      }
    }

    return new Response(JSON.stringify({
      error: error.message || 'Sync failed',
      syncId: syncLogId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
