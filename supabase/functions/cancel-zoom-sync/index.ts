
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { syncId } = await req.json();

    if (!syncId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing syncId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get sync log and verify ownership through connection
    const { data: syncLog, error: syncError } = await serviceClient
      .from('zoom_sync_logs')
      .select(`
        *,
        zoom_connections!zoom_sync_logs_connection_id_fkey (
          user_id
        )
      `)
      .eq('id', syncId)
      .single();

    if (syncError || !syncLog) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sync operation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (syncLog.zoom_connections.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied to this sync operation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update sync log to cancelled status
    const { error: updateError } = await serviceClient
      .from('zoom_sync_logs')
      .update({
        sync_status: 'cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', syncId);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to cancel sync' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync operation cancelled',
        syncId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cancel sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Failed to cancel sync' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
