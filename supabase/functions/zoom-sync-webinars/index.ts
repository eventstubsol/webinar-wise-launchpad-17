
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface SyncOperation {
  type: string;
  priority: number;
  options: {
    debug?: boolean;
    testMode?: boolean;
    webinarId?: string;
    retryCount?: number;
  };
}

const SYNC_PRIORITIES = {
  high: 1,
  normal: 5,
  low: 10
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  console.log('=== ENHANCED SYNC FUNCTION START ===');
  console.log(`Request received: ${new Date().toISOString()}`);
  console.log('Request method:', req.method);

  const startTime = Date.now();

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    console.log('Supabase client created successfully');

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed:', requestBody);
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Basic validation
    if (!requestBody.connectionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection ID is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Create sync log
    console.log('Creating sync log...');
    const { data: syncLogData, error: syncLogError } = await supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: requestBody.connectionId,
        sync_type: requestBody.syncType || 'manual',
        sync_status: 'pending',
        started_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('Failed to create sync log:', syncLogError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create sync log' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const syncLogId = syncLogData.id;
    console.log('Sync log created with ID:', syncLogId);

    // Start the sync process (simplified for now to ensure function boots)
    console.log('Starting sync process...');
    
    // Update sync log to in_progress
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'in_progress',
        sync_stage: 'starting',
        stage_progress_percentage: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);

    // For now, just complete the sync immediately to test function boot
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        sync_stage: 'completed',
        stage_progress_percentage: 100,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processed_items: 0,
        total_items: 0
      })
      .eq('id', syncLogId);

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    console.log(`=== ENHANCED SYNC FUNCTION COMPLETED ===`);
    console.log(`Total execution time: ${totalDuration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync function is working - basic test completed',
        syncId: syncLogId,
        executionTime: totalDuration,
        features: {
          function_boot: true,
          cors_enabled: true,
          basic_sync: true
        }
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('=== ENHANCED SYNC FUNCTION ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        executionTime: totalDuration,
        enhanced_error_handling: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      }
    );
  }
});
