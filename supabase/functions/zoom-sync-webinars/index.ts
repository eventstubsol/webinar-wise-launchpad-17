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

    // Generate tracking ID for this sync operation
    const trackingId = `sync_${Date.now()}_${requestBody.connectionId.slice(-8)}`;
    
    // Create sync operation
    const syncOperation: SyncOperation = {
      id: trackingId,
      connectionId: requestBody.connectionId,
      userId: user.id,
      syncType: requestBody.syncType,
      webinarId: requestBody.webinarId,
      options: requestBody.options || {},
      priority: SYNC_PRIORITIES[requestBody.syncType],
      createdAt: new Date()
    };

    // Create sync log entry - let Supabase generate the UUID for id field
    const { data: syncLog, error: syncLogError } = await supabase
      .from('zoom_sync_logs')
      .insert({
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

    // Start background sync process with real API calls
    EdgeRuntime.waitUntil(processSyncOperation(supabase, syncOperation, connection, syncLog.id));

    // Return immediate response with the database-generated sync ID
    return new Response(
      JSON.stringify({
        success: true,
        syncId: syncLog.id,
        trackingId: trackingId,
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

// Background sync processing function with REAL Zoom API calls
async function processSyncOperation(
  supabase: any, 
  operation: SyncOperation, 
  connection: any,
  syncLogId: string
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000); // 30 minute timeout

  try {
    console.log(`Starting background sync: ${operation.id}`);
    
    // Update sync status to in_progress
    await updateSyncStatus(supabase, syncLogId, 'in_progress');

    // Perform the actual sync with real Zoom API calls
    let result;
    switch (operation.syncType) {
      case 'single':
        result = await syncSingleWebinarWithAPI(supabase, operation, connection, controller.signal, syncLogId);
        break;
      case 'incremental':
        result = await syncIncrementalWebinarsWithAPI(supabase, operation, connection, controller.signal, syncLogId);
        break;
      case 'initial':
        result = await syncInitialWebinarsWithAPI(supabase, operation, connection, controller.signal, syncLogId);
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
      .eq('id', syncLogId);

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
      .eq('id', syncLogId);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Real Zoom API integration functions
async function syncSingleWebinarWithAPI(
  supabase: any, 
  operation: SyncOperation, 
  connection: any, 
  signal: AbortSignal,
  syncLogId: string
): Promise<{ total: number; processed: number; failed: number }> {
  if (!operation.webinarId) {
    throw new Error('Webinar ID is required for single webinar sync');
  }

  await updateSyncProgress(supabase, syncLogId, 1, 0, 'Fetching webinar details from Zoom API...');

  try {
    // Make real API calls to Zoom
    const webinarData = await makeZoomAPICall(connection, `/webinars/${operation.webinarId}`);
    const registrants = await makeZoomAPICall(connection, `/webinars/${operation.webinarId}/registrants`);
    const participants = await makeZoomAPICall(connection, `/report/webinars/${operation.webinarId}/participants`);
    const panelists = await makeZoomAPICall(connection, `/webinars/${operation.webinarId}/panelists`);
    const trackingSources = await makeZoomAPICall(connection, `/webinars/${operation.webinarId}/tracking_sources`);
    
    if (signal.aborted) {
      throw new Error('Sync operation was cancelled');
    }

    // Save to database using DatabaseSyncOperations logic
    await saveWebinarToDatabase(supabase, webinarData, registrants, participants, panelists, trackingSources, operation.connectionId);

    await updateSyncProgress(supabase, syncLogId, 1, 1, 'Webinar sync completed');
    return { total: 1, processed: 1, failed: 0 };
  } catch (error) {
    console.error('Failed to sync single webinar:', error);
    await supabase
      .from('zoom_sync_logs')
      .update({
        failed_items: 1,
        error_message: `Failed to sync webinar ${operation.webinarId}: ${error.message}`
      })
      .eq('id', syncLogId);
    throw error;
  }
}

async function syncIncrementalWebinarsWithAPI(
  supabase: any, 
  operation: SyncOperation, 
  connection: any, 
  signal: AbortSignal,
  syncLogId: string
): Promise<{ total: number; processed: number; failed: number }> {
  await updateSyncProgress(supabase, syncLogId, 0, 0, 'Starting incremental sync...');

  try {
    // Get webinars from last sync date
    const webinars = await makeZoomAPICall(connection, '/users/me/webinars?type=past&page_size=100');
    const webinarList = webinars.webinars || [];
    
    let processed = 0;
    let failed = 0;

    for (const webinar of webinarList) {
      if (signal.aborted) {
        throw new Error('Sync operation was cancelled');
      }

      try {
        const webinarData = await makeZoomAPICall(connection, `/webinars/${webinar.id}`);
        const registrants = await makeZoomAPICall(connection, `/webinars/${webinar.id}/registrants`);
        const participants = await makeZoomAPICall(connection, `/report/webinars/${webinar.id}/participants`);
        const panelists = await makeZoomAPICall(connection, `/webinars/${webinar.id}/panelists`);
        const trackingSources = await makeZoomAPICall(connection, `/webinars/${webinar.id}/tracking_sources`);
        
        await saveWebinarToDatabase(supabase, webinarData, registrants, participants, panelists, trackingSources, operation.connectionId);
        processed++;
      } catch (error) {
        console.error(`Failed to sync webinar ${webinar.id}:`, error);
        failed++;
      }

      await updateSyncProgress(
        supabase, 
        syncLogId, 
        webinarList.length, 
        processed, 
        `Processing webinar ${processed + failed} of ${webinarList.length}...`
      );
    }

    return { total: webinarList.length, processed, failed };
  } catch (error) {
    console.error('Failed incremental sync:', error);
    throw error;
  }
}

async function syncInitialWebinarsWithAPI(
  supabase: any, 
  operation: SyncOperation, 
  connection: any, 
  signal: AbortSignal,
  syncLogId: string
): Promise<{ total: number; processed: number; failed: number }> {
  await updateSyncProgress(supabase, syncLogId, 0, 0, 'Starting initial sync...');

  try {
    // Get all webinars
    const webinars = await makeZoomAPICall(connection, '/users/me/webinars?type=past&page_size=100');
    const webinarList = webinars.webinars || [];
    
    let processed = 0;
    let failed = 0;

    for (const webinar of webinarList) {
      if (signal.aborted) {
        throw new Error('Sync operation was cancelled');
      }

      try {
        const webinarData = await makeZoomAPICall(connection, `/webinars/${webinar.id}`);
        const registrants = await makeZoomAPICall(connection, `/webinars/${webinar.id}/registrants`);
        const participants = await makeZoomAPICall(connection, `/report/webinars/${webinar.id}/participants`);
        const panelists = await makeZoomAPICall(connection, `/webinars/${webinar.id}/panelists`);
        const trackingSources = await makeZoomAPICall(connection, `/webinars/${webinar.id}/tracking_sources`);
        
        await saveWebinarToDatabase(supabase, webinarData, registrants, participants, panelists, trackingSources, operation.connectionId);
        processed++;
      } catch (error) {
        console.error(`Failed to sync webinar ${webinar.id}:`, error);
        failed++;
      }

      await updateSyncProgress(
        supabase, 
        syncLogId, 
        webinarList.length, 
        processed, 
        `Processing webinar ${processed + failed} of ${webinarList.length}...`
      );
    }

    return { total: webinarList.length, processed, failed };
  } catch (error) {
    console.error('Failed initial sync:', error);
    throw error;
  }
}

// Helper function to make Zoom API calls
async function makeZoomAPICall(connection: any, endpoint: string): Promise<any> {
  const response = await fetch(`https://api.zoom.us/v2${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Helper function to save webinar data to database
async function saveWebinarToDatabase(
  supabase: any,
  webinarData: any,
  registrants: any,
  participants: any,
  panelists: any,
  trackingSources: any,
  connectionId: string
): Promise<void> {
  // Transform and insert webinar
  const webinarInsert = {
    connection_id: connectionId,
    webinar_id: webinarData.id,
    webinar_uuid: webinarData.uuid,
    host_id: webinarData.host_id,
    host_email: webinarData.host_email,
    topic: webinarData.topic,
    agenda: webinarData.agenda,
    type: webinarData.type,
    status: webinarData.status,
    start_time: webinarData.start_time,
    duration: webinarData.duration,
    timezone: webinarData.timezone,
    synced_at: new Date().toISOString(),
    password: webinarData.password,
    h323_password: webinarData.h323_password,
    pstn_password: webinarData.pstn_password,
    encrypted_password: webinarData.encrypted_password,
    settings: webinarData.settings,
    tracking_fields: webinarData.tracking_fields,
    recurrence: webinarData.recurrence,
    occurrences: webinarData.occurrences
  };

  const { data: webinar, error: webinarError } = await supabase
    .from('zoom_webinars')
    .upsert(webinarInsert, { onConflict: 'connection_id,webinar_id' })
    .select('id')
    .single();

  if (webinarError) {
    console.error(`Error saving webinar ${webinarData.id}:`, webinarError);
    throw webinarError;
  }
  
  if (webinar) {
    const webinarDbId = webinar.id;

    // Insert panelists
    if (panelists?.panelists?.length > 0) {
      const panelistsToInsert = panelists.panelists.map((p: any) => ({
        webinar_id: webinarDbId,
        panelist_id: p.id,
        panelist_email: p.email,
        name: p.name,
        join_url: p.join_url,
      }));
      await supabase.from('zoom_panelists').delete().eq('webinar_id', webinarDbId);
      const { error: panelistError } = await supabase.from('zoom_panelists').insert(panelistsToInsert);
      if (panelistError) console.error(`Error inserting panelists for webinar ${webinarDbId}:`, panelistError);
    }
    
    // Insert tracking sources
    if (trackingSources?.tracking_sources?.length > 0) {
        const trackingToInsert = trackingSources.tracking_sources.map((ts: any) => ({
            webinar_id: webinarDbId,
            source_name: ts.source_name,
            tracking_url: ts.tracking_url,
            registration_count: ts.registration_count,
            visitor_count: ts.visitor_count,
        }));
        await supabase.from('zoom_webinar_tracking').delete().eq('webinar_id', webinarDbId);
        const { error: trackingError } = await supabase.from('zoom_webinar_tracking').insert(trackingToInsert);
        if (trackingError) console.error(`Error inserting tracking sources for webinar ${webinarDbId}:`, trackingError);
    }
    
    console.log(`Saved webinar ${webinarData.id} and related data to database with ID ${webinar.id}`);
  }
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
