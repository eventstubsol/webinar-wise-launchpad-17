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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { connection_id, sync_type = 'manual', options = {} }: SyncRequest = await req.json();

    if (!connection_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'connection_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[SYNC-UNIFIED] Starting sync for connection: ${connection_id}, type: ${sync_type}`);

    // Verify the connection exists and is valid
    const { data: connection, error: connectionError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('id', connection_id)
      .single();

    if (connectionError || !connection) {
      console.error(`[SYNC-UNIFIED] Connection not found: ${connection_id}`);
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

    // Create a sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: connection_id,
        sync_type: sync_type,
        sync_status: 'pending',
        started_at: new Date().toISOString(),
        metadata: options
      })
      .select()
      .single();

    if (syncLogError || !syncLog) {
      console.error(`[SYNC-UNIFIED] Failed to create sync log:`, syncLogError);
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
    console.log(`[SYNC-UNIFIED] Created sync log: ${syncId}`);

    // Call the zoom-sync-webinars-v2 function to perform the actual sync
    const { data: syncResult, error: syncError } = await supabase.functions.invoke('zoom-sync-webinars-v2', {
      body: {
        connection_id: connection_id,
        sync_type: sync_type,
        sync_id: syncId,
        mode: 'full',
        options: options
      }
    });

    if (syncError) {
      console.error(`[SYNC-UNIFIED] Sync failed:`, syncError);
      
      // Update sync log status to failed
      await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'failed',
          error_message: syncError.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: syncError.message || 'Sync failed',
          syncId: syncId
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update sync log status to started/running
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'running'
      })
      .eq('id', syncId);

    console.log(`[SYNC-UNIFIED] Sync started successfully: ${syncId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        syncId: syncId,
        message: 'Sync started successfully',
        data: syncResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[SYNC-UNIFIED] Unexpected error:', error);
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
})