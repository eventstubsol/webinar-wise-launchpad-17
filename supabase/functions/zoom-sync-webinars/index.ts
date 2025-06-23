
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, SYNC_PRIORITIES, SyncOperation } from './types.ts';
import { validateEnhancedRequest } from './enhanced-validation.ts';
import { createSyncLog } from './database-operations.ts';
import { processEnhancedWebinarSync } from './enhanced-sync-processor.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  console.log('=== ENHANCED SYNC FUNCTION START ===');
  console.log(`Request received: ${new Date().toISOString()}`);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    console.log('Supabase client created, validating enhanced request...');
    const { user, connection, requestBody } = await validateEnhancedRequest(req, supabase);
    const validationTime = Date.now();
    console.log(`Enhanced request validated successfully in ${validationTime - startTime}ms`);

    console.log('Creating sync log...');
    const syncLogId = await createSyncLog(
      supabase,
      connection.id,
      requestBody.syncType || 'manual',
      requestBody.webinarId
    );

    const syncOperation: SyncOperation = {
      type: requestBody.syncType || 'manual',
      priority: SYNC_PRIORITIES[requestBody.priority] || SYNC_PRIORITIES.normal,
      options: {
        debug: requestBody.debug || false,
        testMode: requestBody.testMode || false,
        webinarId: requestBody.webinarId,
        retryCount: 0
      }
    };

    console.log(`Starting enhanced sync operation: ${syncOperation.type}`);
    console.log(`Enhanced sync options:`, syncOperation.options);
    console.log(`Enhanced verification: ENABLED`);
    console.log(`Field validation: COMPREHENSIVE (39 fields)`);
    console.log(`Timeout protection: ENABLED`);

    // Execute the enhanced sync with comprehensive verification
    await processEnhancedWebinarSync(supabase, syncOperation, connection, syncLogId);

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    console.log(`=== ENHANCED SYNC FUNCTION COMPLETED ===`);
    console.log(`Total execution time: ${totalDuration}ms`);
    console.log(`Enhanced verification: SUCCESS`);
    console.log(`Field validation: COMPREHENSIVE`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Enhanced sync completed successfully with comprehensive verification',
        syncId: syncLogId,
        executionTime: totalDuration,
        features: {
          enhanced_verification: true,
          comprehensive_field_validation: true,
          timeout_protection: true,
          real_time_progress: true
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
