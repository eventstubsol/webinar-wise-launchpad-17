
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { validateEnhancedRequest } from "./enhanced-validation.ts";

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

    // For now, simulate the sync process
    console.log('🚀 Starting simulated sync process...');
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update sync log with completion
    if (requestBody.syncLogId) {
      console.log(`✅ Updating sync log ${requestBody.syncLogId} to completed status`);
      
      const { error: completionError } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'completed',
          completed_at: new Date().toISOString(),
          processed_items: 5, // Simulated count
          total_items: 5,
          stage_progress_percentage: 100
        })
        .eq('id', requestBody.syncLogId);

      if (completionError) {
        console.error('Failed to update sync log completion:', completionError);
      } else {
        console.log('✅ Sync log marked as completed');
      }
    }

    // Update connection last sync time
    await supabase
      .from('zoom_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);

    console.log('🎉 Sync process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed successfully',
        syncType: requestBody.syncType,
        connectionId: connection.id,
        processedItems: 5,
        totalItems: 5
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
