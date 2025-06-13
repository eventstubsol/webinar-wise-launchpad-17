
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types for the request and sync operations
interface SyncRequest {
  connectionId: string;
  syncType: 'initial' | 'incremental' | 'single';
  webinarId?: string;
  options?: {
    fromDate?: string;
    toDate?: string;
    includeRecordings?: boolean;
  };
}

interface SyncOperation {
  id: string;
  connectionId: string;
  userId: string;
  syncType: 'initial' | 'incremental' | 'single';
  webinarId?: string;
  options: Record<string, any>;
  priority: number;
  createdAt: Date;
}

// Priority levels for sync operations
const SYNC_PRIORITIES = {
  single: 1,      // CRITICAL - single webinar sync
  incremental: 2, // HIGH - incremental sync
  initial: 3      // NORMAL - initial sync
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract and validate JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse and validate request body
    const requestBody: SyncRequest = await req.json();
    
    if (!requestBody.connectionId || !requestBody.syncType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: connectionId, syncType' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (requestBody.syncType === 'single' && !requestBody.webinarId) {
      return new Response(
        JSON.stringify({ error: 'webinarId is required for single webinar sync' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate connection ownership and status
    const { data: connection, error: connectionError } = await supabase
      .from('zoom_connections')
      .select('id, user_id, connection_status, access_token, refresh_token, token_expires_at')
      .eq('id', requestBody.connectionId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Connection not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (connection.connection_status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Connection is not active' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check for existing active syncs to prevent duplicates
    const { data: activeSyncs } = await supabase
      .from('zoom_sync_logs')
      .select('id')
      .eq('connection_id', requestBody.connectionId)
      .in('sync_status', ['started', 'in_progress'])
      .limit(1);

    if (activeSyncs && activeSyncs.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Sync already in progress for this connection',
          activeSyncId: activeSyncs[0].id
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate unique sync ID
    const syncId = `sync_${Date.now()}_${requestBody.connectionId.slice(-8)}`;
    
    // Create sync operation
    const syncOperation: SyncOperation = {
      id: syncId,
      connectionId: requestBody.connectionId,
      userId: user.id,
      syncType: requestBody.syncType,
      webinarId: requestBody.webinarId,
      options: requestBody.options || {},
      priority: SYNC_PRIORITIES[requestBody.syncType],
      createdAt: new Date()
    };

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('zoom_sync_logs')
      .insert({
        id: syncId,
        connection_id: requestBody.connectionId,
        sync_type: requestBody.syncType,
        sync_status: 'started',
        resource_type: requestBody.syncType === 'single' ? 'webinar' : 'webinars',
        resource_id: requestBody.webinarId || null,
        started_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0,
        failed_items: 0
      })
      .select('id')
      .single();

    if (syncLogError) {
      console.error('Failed to create sync log:', syncLogError);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize sync operation' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Start background sync process
    EdgeRuntime.waitUntil(processSyncOperation(supabase, syncOperation, connection));

    // Return immediate response with sync ID
    return new Response(
      JSON.stringify({
        success: true,
        syncId: syncId,
        status: 'started',
        estimatedDuration: getEstimatedDuration(requestBody.syncType),
        message: `${requestBody.syncType} sync initiated successfully`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Sync function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Background sync processing function
async function processSyncOperation(
  supabase: any, 
  operation: SyncOperation, 
  connection: any
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000); // 30 minute timeout

  try {
    console.log(`Starting background sync: ${operation.id}`);
    
    // Update sync status to in_progress
    await updateSyncStatus(supabase, operation.id, 'in_progress');

    // Perform the actual sync based on type
    let result;
    switch (operation.syncType) {
      case 'single':
        result = await syncSingleWebinar(supabase, operation, connection, controller.signal);
        break;
      case 'incremental':
        result = await syncIncrementalWebinars(supabase, operation, connection, controller.signal);
        break;
      case 'initial':
        result = await syncInitialWebinars(supabase, operation, connection, controller.signal);
        break;
      default:
        throw new Error(`Unknown sync type: ${operation.syncType}`);
    }

    // Update final sync status
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        completed_at: new Date().toISOString(),
        total_items: result.total || 0,
        processed_items: result.processed || 0,
        failed_items: result.failed || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', operation.id);

    // Update connection last_sync_at
    await supabase
      .from('zoom_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', operation.connectionId);

    console.log(`Sync completed successfully: ${operation.id}`);

  } catch (error) {
    console.error(`Sync failed: ${operation.id}`, error);
    
    // Update sync status to failed
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_details: { error: error instanceof Error ? error.stack : error },
        updated_at: new Date().toISOString()
      })
      .eq('id', operation.id);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Sync operation implementations
async function syncSingleWebinar(
  supabase: any, 
  operation: SyncOperation, 
  connection: any, 
  signal: AbortSignal
): Promise<{ total: number; processed: number; failed: number }> {
  if (!operation.webinarId) {
    throw new Error('Webinar ID is required for single webinar sync');
  }

  // Update progress
  await updateSyncProgress(supabase, operation.id, 1, 0, 'Fetching webinar details...');

  // Mock sync for now - in real implementation, this would call Zoom API
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
  
  if (signal.aborted) {
    throw new Error('Sync operation was cancelled');
  }

  // Update progress
  await updateSyncProgress(supabase, operation.id, 1, 1, 'Webinar sync completed');

  return { total: 1, processed: 1, failed: 0 };
}

async function syncIncrementalWebinars(
  supabase: any, 
  operation: SyncOperation, 
  connection: any, 
  signal: AbortSignal
): Promise<{ total: number; processed: number; failed: number }> {
  // Update progress
  await updateSyncProgress(supabase, operation.id, 0, 0, 'Starting incremental sync...');

  // Mock sync for now - in real implementation, this would call Zoom API
  const totalWebinars = 5; // This would come from Zoom API
  
  for (let i = 0; i < totalWebinars; i++) {
    if (signal.aborted) {
      throw new Error('Sync operation was cancelled');
    }

    await updateSyncProgress(
      supabase, 
      operation.id, 
      totalWebinars, 
      i, 
      `Processing webinar ${i + 1} of ${totalWebinars}...`
    );

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await updateSyncProgress(supabase, operation.id, totalWebinars, totalWebinars, 'Incremental sync completed');

  return { total: totalWebinars, processed: totalWebinars, failed: 0 };
}

async function syncInitialWebinars(
  supabase: any, 
  operation: SyncOperation, 
  connection: any, 
  signal: AbortSignal
): Promise<{ total: number; processed: number; failed: number }> {
  // Update progress
  await updateSyncProgress(supabase, operation.id, 0, 0, 'Starting initial sync...');

  // Mock sync for now - in real implementation, this would call Zoom API
  const totalWebinars = 20; // This would come from Zoom API
  
  for (let i = 0; i < totalWebinars; i++) {
    if (signal.aborted) {
      throw new Error('Sync operation was cancelled');
    }

    await updateSyncProgress(
      supabase, 
      operation.id, 
      totalWebinars, 
      i, 
      `Processing webinar ${i + 1} of ${totalWebinars}...`
    );

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  await updateSyncProgress(supabase, operation.id, totalWebinars, totalWebinars, 'Initial sync completed');

  return { total: totalWebinars, processed: totalWebinars, failed: 0 };
}

// Helper functions
async function updateSyncStatus(supabase: any, syncId: string, status: string): Promise<void> {
  await supabase
    .from('zoom_sync_logs')
    .update({
      sync_status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', syncId);
}

async function updateSyncProgress(
  supabase: any, 
  syncId: string, 
  total: number, 
  processed: number, 
  currentOperation: string
): Promise<void> {
  await supabase
    .from('zoom_sync_logs')
    .update({
      total_items: total,
      processed_items: processed,
      updated_at: new Date().toISOString()
    })
    .eq('id', syncId);

  console.log(`Sync ${syncId}: ${processed}/${total} - ${currentOperation}`);
}

function getEstimatedDuration(syncType: string): string {
  switch (syncType) {
    case 'single':
      return '30 seconds - 2 minutes';
    case 'incremental':
      return '2-5 minutes';
    case 'initial':
      return '5-15 minutes';
    default:
      return 'Unknown';
  }
}
