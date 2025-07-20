
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  connection_id: string;
  sync_type?: string;
  options?: any;
}

interface ZoomConnection {
  id: string;
  zoom_user_id: string;
  access_token: string;
  connection_status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[ZOOM-SYNC] Missing environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error('[ZOOM-SYNC] Invalid JSON in request body:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { connection_id, sync_type = 'manual', options = {} }: SyncRequest = requestBody;

    console.log(`[ZOOM-SYNC] Starting ${sync_type} sync for connection: ${connection_id}`);

    if (!connection_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'connection_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the connection details
    const { data: connection, error: connectionError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('id', connection_id)
      .single();

    if (connectionError || !connection) {
      console.error(`[ZOOM-SYNC] Connection not found: ${connection_id}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Connection not found or invalid' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: connection_id,
        sync_type: sync_type,
        sync_status: 'started',
        started_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0,
        metadata: { sync_type, options }
      })
      .select()
      .single();

    if (syncLogError || !syncLog) {
      console.error(`[ZOOM-SYNC] Failed to create sync log:`, syncLogError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create sync log' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const syncId = syncLog.id;
    console.log(`[ZOOM-SYNC] Created sync log: ${syncId}`);

    // Start background sync process
    const backgroundSync = async () => {
      try {
        await performZoomSync(supabase, connection, syncId, sync_type);
      } catch (error) {
        console.error(`[ZOOM-SYNC] Background sync failed:`, error);
        try {
          await supabase
            .from('zoom_sync_logs')
            .update({
              sync_status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date().toISOString()
            })
            .eq('id', syncId);
        } catch (updateError) {
          console.error(`[ZOOM-SYNC] Failed to update sync log with error:`, updateError);
        }
      }
    };

    // Use EdgeRuntime.waitUntil for proper background task handling
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(backgroundSync());
    } else {
      // Fallback for environments without EdgeRuntime
      backgroundSync().catch(error => 
        console.error('[ZOOM-SYNC] Background sync error:', error)
      );
    }

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        success: true, 
        syncId: syncId,
        message: 'Sync started successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ZOOM-SYNC] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function performZoomSync(supabase: any, connection: ZoomConnection, syncId: string, syncType: string) {
  console.log(`[ZOOM-SYNC] Starting sync process for ${syncId}`);
  
  try {
    // Update sync status to running
    await supabase
      .from('zoom_sync_logs')
      .update({ sync_status: 'running' })
      .eq('id', syncId);

    // Fetch webinars from Zoom API
    const webinars = await fetchZoomWebinars(connection.access_token, connection.zoom_user_id);
    
    console.log(`[ZOOM-SYNC] Fetched ${webinars.length} webinars`);

    // Update total items
    await supabase
      .from('zoom_sync_logs')
      .update({ 
        total_items: webinars.length,
        sync_status: 'running'
      })
      .eq('id', syncId);

    let processedCount = 0;

    // Process each webinar
    for (const webinar of webinars) {
      try {
        await processWebinar(supabase, webinar, connection.id);
        processedCount++;
        
        // Update progress
        await supabase
          .from('zoom_sync_logs')
          .update({ 
            processed_items: processedCount,
            stage_progress_percentage: Math.round((processedCount / webinars.length) * 100)
          })
          .eq('id', syncId);

        console.log(`[ZOOM-SYNC] Processed webinar ${processedCount}/${webinars.length}`);
      } catch (webinarError) {
        console.error(`[ZOOM-SYNC] Failed to process webinar ${webinar.id}:`, webinarError);
        // Continue with next webinar
      }
    }

    // Mark sync as completed
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: processedCount,
        stage_progress_percentage: 100
      })
      .eq('id', syncId);

    console.log(`[ZOOM-SYNC] Sync completed successfully: ${syncId}`);

  } catch (error) {
    console.error(`[ZOOM-SYNC] Sync failed:`, error);
    
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', syncId);
    
    throw error;
  }
}

async function fetchZoomWebinars(accessToken: string, userId: string) {
  const webinars = [];
  let nextPageToken = '';
  
  do {
    const url = `https://api.zoom.us/v2/users/${userId}/webinars?page_size=100${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    webinars.push(...(data.webinars || []));
    nextPageToken = data.next_page_token || '';
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } while (nextPageToken);
  
  return webinars;
}

async function processWebinar(supabase: any, webinar: any, connectionId: string) {
  // Transform webinar data for database
  const webinarData = {
    connection_id: connectionId,
    zoom_webinar_id: webinar.id,
    uuid: webinar.uuid,
    host_id: webinar.host_id,
    topic: webinar.topic || 'Untitled Webinar',
    type: webinar.type || 5,
    status: webinar.status || 'scheduled',
    start_time: webinar.start_time ? new Date(webinar.start_time).toISOString() : null,
    duration: webinar.duration || 0,
    timezone: webinar.timezone || 'UTC',
    agenda: webinar.agenda || '',
    join_url: webinar.join_url || '',
    settings: webinar.settings || {},
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Upsert webinar
  const { error } = await supabase
    .from('zoom_webinars')
    .upsert(
      webinarData,
      {
        onConflict: 'connection_id,zoom_webinar_id',
        ignoreDuplicates: false
      }
    );

  if (error) {
    console.error(`[ZOOM-SYNC] Failed to upsert webinar ${webinar.id}:`, error);
    throw error;
  }
}
