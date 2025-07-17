
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { validateEnhancedRequest } from "./enhanced-validation.ts";
import { processComprehensiveWebinarSync } from "./fixes/comprehensive-sync-processor-fixed.ts";

serve(async (req: Request): Promise<Response> => {
  console.log('=== ENHANCED SYNC FUNCTION START ===');
  console.log('Request received:', new Date().toISOString());
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client created, validating enhanced request...');

    // Validate request and authenticate
    const { user, connection, requestBody } = await validateEnhancedRequest(req, supabase);
    
    console.log(`🔄 Starting ${requestBody.syncType} sync for user ${user.id}, connection ${connection.id}`);
    
    // Update sync log to running if syncLogId is provided
    if (requestBody.syncLogId) {
      console.log(`📝 Updating sync log ${requestBody.syncLogId} to running status`);
      
      const { error: updateError } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'running',
          started_at: new Date().toISOString(),
          metadata: {
            ...requestBody.options,
            requestId: requestBody.requestId,
            authType: 'service_role'
          }
        })
        .eq('id', requestBody.syncLogId);

      if (updateError) {
        console.error('Failed to update sync log:', updateError);
      } else {
        console.log('✅ Sync log updated to running status');
      }
    }

    // Use the real sync processor instead of simulation
    console.log('🚀 Starting real webinar sync process...');
    
    try {
      // Create sync operation object for the processor
      const syncOperation = {
        id: requestBody.syncLogId || 'unknown',
        connection_id: connection.id,
        sync_type: requestBody.syncType,
        status: 'running',
        options: requestBody.options || {}
      };

      // Call the comprehensive sync processor
      await processComprehensiveWebinarSync(
        supabase,
        syncOperation,
        connection,
        requestBody.syncLogId!
      );

      console.log('🎉 Real sync process completed successfully');

    } catch (syncError) {
      console.error('❌ Sync processor error:', syncError);
      
      // Update sync log with failure
      if (requestBody.syncLogId) {
        await supabase
          .from('zoom_sync_logs')
          .update({
            sync_status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: syncError.message || 'Sync processing failed'
          })
          .eq('id', requestBody.syncLogId);
      }
      
      throw syncError;
    }

    // Update connection last sync time
    await supabase
      .from('zoom_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed successfully',
        syncType: requestBody.syncType,
        connectionId: connection.id,
        processedItems: 'See sync log for details',
        totalItems: 'See sync log for details'
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.log('=== ENHANCED SYNC FUNCTION ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        status: error.status || 500
      }),
      { 
        status: error.status || 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
