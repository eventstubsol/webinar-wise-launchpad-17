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

// Rate limiting constants
const RATE_LIMIT_DELAY = 100; // 100ms between API calls (10 requests/second)
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second base delay

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

    // Create sync log entry with enhanced tracking fields
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
        failed_items: 0,
        current_webinar_id: null,
        sync_stage: 'initializing',
        stage_progress_percentage: 0
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

    // Start background sequential sync process
    EdgeRuntime.waitUntil(processSequentialSyncOperation(supabase, syncOperation, connection, syncLog.id));

    // Return immediate response with the database-generated sync ID
    return new Response(
      JSON.stringify({
        success: true,
        syncId: syncLog.id,
        trackingId: trackingId,
        status: 'started',
        estimatedDuration: getEstimatedDuration(requestBody.syncType),
        message: `Sequential ${requestBody.syncType} sync initiated successfully`,
        processingMode: 'sequential'
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

// Background sequential sync processing function
async function processSequentialSyncOperation(
  supabase: any, 
  operation: SyncOperation, 
  connection: any,
  syncLogId: string
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45 * 60 * 1000); // 45 minute timeout

  try {
    console.log(`Starting sequential background sync: ${operation.id}`);
    
    // Update sync status to in_progress
    await updateSyncStatus(supabase, syncLogId, 'in_progress');

    // Perform the sequential sync with real Zoom API calls
    let result;
    switch (operation.syncType) {
      case 'single':
        result = await syncSingleWebinarSequentially(supabase, operation, connection, controller.signal, syncLogId);
        break;
      case 'incremental':
        result = await syncIncrementalWebinarsSequentially(supabase, operation, connection, controller.signal, syncLogId);
        break;
      case 'initial':
        result = await syncInitialWebinarsSequentially(supabase, operation, connection, controller.signal, syncLogId);
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
        current_webinar_id: null,
        sync_stage: 'completed',
        stage_progress_percentage: 100,
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

    console.log(`Sequential sync completed successfully: ${operation.id}`);

  } catch (error) {
    console.error(`Sequential sync failed: ${operation.id}`, error);
    
    // Update sync status to failed
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_details: { error: error instanceof Error ? error.stack : error },
        sync_stage: 'failed',
        stage_progress_percentage: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Sequential processing functions with enhanced progress tracking
async function syncSingleWebinarSequentially(
  supabase: any, 
  operation: SyncOperation, 
  connection: any, 
  signal: AbortSignal,
  syncLogId: string
): Promise<{ total: number; processed: number; failed: number }> {
  if (!operation.webinarId) {
    throw new Error('Webinar ID is required for single webinar sync');
  }

  await updateSyncStageProgress(supabase, syncLogId, operation.webinarId, 'starting_webinar', 0);

  try {
    await processWebinarSequentially(supabase, operation.webinarId, connection, syncLogId, operation.connectionId, signal);
    return { total: 1, processed: 1, failed: 0 };
  } catch (error) {
    console.error('Failed to sync single webinar:', error);
    await supabase
      .from('zoom_sync_logs')
      .update({
        failed_items: 1,
        error_message: `Failed to sync webinar ${operation.webinarId}: ${error.message}`,
        sync_stage: 'webinar_failed'
      })
      .eq('id', syncLogId);
    throw error;
  }
}

async function syncIncrementalWebinarsSequentially(
  supabase: any, 
  operation: SyncOperation, 
  connection: any, 
  signal: AbortSignal,
  syncLogId: string
): Promise<{ total: number; processed: number; failed: number }> {
  await updateSyncStageProgress(supabase, syncLogId, null, 'fetching_recent_webinars', 5);

  try {
    // Get webinars from last sync date
    const webinars = await makeZoomAPICall(connection, '/users/me/webinars?type=past&page_size=50');
    const webinarList = webinars.webinars || [];
    
    await supabase
      .from('zoom_sync_logs')
      .update({ total_items: webinarList.length })
      .eq('id', syncLogId);

    let processed = 0;
    let failed = 0;

    for (let i = 0; i < webinarList.length; i++) {
      const webinar = webinarList[i];
      
      if (signal.aborted) {
        throw new Error('Sync operation was cancelled');
      }

      try {
        await processWebinarSequentially(supabase, webinar.id, connection, syncLogId, operation.connectionId, signal);
        processed++;
      } catch (error) {
        console.error(`Failed to sync webinar ${webinar.id}:`, error);
        failed++;
      }

      // Update overall progress
      const overallProgress = Math.round(((i + 1) / webinarList.length) * 100);
      await supabase
        .from('zoom_sync_logs')
        .update({
          processed_items: processed,
          failed_items: failed,
          stage_progress_percentage: overallProgress
        })
        .eq('id', syncLogId);
    }

    return { total: webinarList.length, processed, failed };
  } catch (error) {
    console.error('Failed incremental sync:', error);
    throw error;
  }
}

async function syncInitialWebinarsSequentially(
  supabase: any, 
  operation: SyncOperation, 
  connection: any, 
  signal: AbortSignal,
  syncLogId: string
): Promise<{ total: number; processed: number; failed: number }> {
  await updateSyncStageProgress(supabase, syncLogId, null, 'fetching_webinar_list', 5);

  try {
    // Get all webinars
    const webinars = await makeZoomAPICall(connection, '/users/me/webinars?type=past&page_size=100');
    const webinarList = webinars.webinars || [];
    
    await supabase
      .from('zoom_sync_logs')
      .update({ total_items: webinarList.length })
      .eq('id', syncLogId);

    let processed = 0;
    let failed = 0;
    const failedWebinars: Array<{ id: string; error: string }> = [];

    for (let i = 0; i < webinarList.length; i++) {
      const webinar = webinarList[i];
      
      if (signal.aborted) {
        throw new Error('Sync operation was cancelled');
      }

      try {
        await processWebinarSequentially(supabase, webinar.id, connection, syncLogId, operation.connectionId, signal);
        processed++;
      } catch (error) {
        console.error(`Failed to sync webinar ${webinar.id}:`, error);
        failed++;
        failedWebinars.push({ 
          id: webinar.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      // Update overall progress
      const overallProgress = Math.round(((i + 1) / webinarList.length) * 100);
      await supabase
        .from('zoom_sync_logs')
        .update({
          processed_items: processed,
          failed_items: failed,
          stage_progress_percentage: overallProgress,
          error_details: failedWebinars.length > 0 ? { failed_webinars: failedWebinars } : null
        })
        .eq('id', syncLogId);
    }

    return { total: webinarList.length, processed, failed };
  } catch (error) {
    console.error('Failed initial sync:', error);
    throw error;
  }
}

// Sequential webinar processing with all data types
async function processWebinarSequentially(
  supabase: any,
  webinarId: string,
  connection: any,
  syncLogId: string,
  connectionId: string,
  signal: AbortSignal
): Promise<void> {
  const stages = [
    { name: 'webinar_details', label: 'Fetching webinar details', progress: 15 },
    { name: 'registrants', label: 'Fetching registrants', progress: 35 },
    { name: 'participants', label: 'Fetching participants', progress: 55 },
    { name: 'polls', label: 'Fetching polls and responses', progress: 75 },
    { name: 'qa', label: 'Fetching Q&A data', progress: 90 },
    { name: 'recordings', label: 'Fetching recordings', progress: 100 }
  ];

  let webinarData: any = null;
  let registrants: any[] = [];
  let participants: any[] = [];
  let panelists: any[] = [];
  let trackingSources: any[] = [];

  for (const stage of stages) {
    if (signal.aborted) {
      throw new Error('Sync operation was cancelled');
    }

    await updateSyncStageProgress(supabase, syncLogId, webinarId, stage.name, stage.progress);
    
    try {
      switch (stage.name) {
        case 'webinar_details':
          webinarData = await retryAPICall(() => makeZoomAPICall(connection, `/webinars/${webinarId}`));
          break;
        case 'registrants':
          registrants = await retryAPICall(() => makeZoomAPICall(connection, `/webinars/${webinarId}/registrants`));
          break;
        case 'participants':
          // Only fetch participants for past webinars
          if (webinarData && new Date(webinarData.start_time) < new Date()) {
            participants = await retryAPICall(() => makeZoomAPICall(connection, `/report/webinars/${webinarId}/participants`));
          }
          break;
        case 'polls':
          // Polls are optional
          try {
            const pollData = await retryAPICall(() => makeZoomAPICall(connection, `/report/webinars/${webinarId}/polls`));
            // polls = pollData.questions || [];
          } catch (error) {
            console.log(`No polls available for webinar ${webinarId}`);
          }
          break;
        case 'qa':
          // Q&A is optional
          try {
            const qaData = await retryAPICall(() => makeZoomAPICall(connection, `/report/webinars/${webinarId}/qa`));
            // qa = qaData.questions || [];
          } catch (error) {
            console.log(`No Q&A available for webinar ${webinarId}`);
          }
          break;
        case 'recordings':
          // Recordings are optional
          try {
            await retryAPICall(() => makeZoomAPICall(connection, `/webinars/${webinarId}/recordings`));
          } catch (error) {
            console.log(`No recordings available for webinar ${webinarId}`);
          }
          break;
      }

      // Rate limiting - wait between API calls
      await delay(RATE_LIMIT_DELAY);

    } catch (error) {
      console.error(`Failed to fetch ${stage.name} for webinar ${webinarId}:`, error);
      // Continue with next stage for non-critical data
      if (stage.name === 'webinar_details') {
        throw error; // Critical data, fail the whole webinar
      }
    }
  }

  // Save webinar data to database
  if (webinarData) {
    await saveWebinarToDatabase(supabase, webinarData, registrants, participants, panelists, trackingSources, connectionId);
    await updateSyncStageProgress(supabase, syncLogId, webinarId, 'webinar_completed', 100);
  } else {
    throw new Error('Failed to fetch webinar details');
  }
}

// Helper function with retry logic and exponential backoff
async function retryAPICall<T>(apiCall: () => Promise<T>): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === MAX_RETRIES - 1) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = BASE_RETRY_DELAY * Math.pow(2, attempt);
      console.log(`API call failed, retrying in ${delayMs}ms. Attempt ${attempt + 1}/${MAX_RETRIES}`);
      await delay(delayMs);
    }
  }

  throw lastError!;
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

async function updateSyncStageProgress(
  supabase: any, 
  syncId: string, 
  webinarId: string | null,
  stage: string,
  progress: number
): Promise<void> {
  await supabase
    .from('zoom_sync_logs')
    .update({
      current_webinar_id: webinarId,
      sync_stage: stage,
      stage_progress_percentage: Math.max(0, Math.min(100, progress)),
      updated_at: new Date().toISOString()
    })
    .eq('id', syncId);

  console.log(`Sync ${syncId}: ${stage} (${progress}%) - Webinar: ${webinarId || 'N/A'}`);
}

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

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getEstimatedDuration(syncType: string): string {
  switch (syncType) {
    case 'single':
      return '1-3 minutes (sequential processing)';
    case 'incremental':
      return '3-8 minutes (sequential processing)';
    case 'initial':
      return '10-30 minutes (sequential processing)';
    default:
      return 'Unknown';
  }
}
