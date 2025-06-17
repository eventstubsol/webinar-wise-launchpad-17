
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, SYNC_PRIORITIES, SyncOperation } from './types.ts';
import { validateEnhancedRequest } from './enhanced-validation.ts';
import { createSyncLog } from './database-operations.ts';
import { processSequentialSync } from './sync-processor.ts';
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
    const syncLogId = await createSyncLog(supabase, requestBody.connectionId, requestBody.syncType, requestBody.webinarId);
    const syncLogTime = Date.now();
    console.log(`Sync log created: ${syncLogId} in ${syncLogTime - validationTime}ms`);
    
    const syncOperation: SyncOperation = {
      id: `enhanced_sync_${Date.now()}`,
      connectionId: requestBody.connectionId,
      userId: user.id,
      syncType: requestBody.syncType,
      webinarId: requestBody.webinarId,
      webinarIds: requestBody.webinarIds,
      options: requestBody.options || {},
      priority: SYNC_PRIORITIES[requestBody.syncType] || 3,
      createdAt: new Date()
    };
    
    console.log('Starting enhanced background sync process...');
    console.log('Sync options:', JSON.stringify(syncOperation.options, null, 2));
    
    // Use enhanced processor for better handling
    queueMicrotask(() => {
      if (syncOperation.options?.testMode || syncOperation.options?.dryRun || syncOperation.options?.verboseLogging) {
        console.log('Using enhanced sync processor due to advanced options');
        processEnhancedWebinarSync(supabase, syncOperation, connection, syncLogId);
      } else {
        console.log('Using standard sync processor');
        processSequentialSync(supabase, syncOperation, connection, syncLogId);
      }
    });

    console.log(`=== Enhanced Sync Request Successful (Total time: ${Date.now() - startTime}ms) ===`);
    return new Response(
      JSON.stringify({
        success: true,
        syncId: syncLogId,
        status: 'started',
        message: `Enhanced ${requestBody.syncType} sync initiated successfully.`,
        configuration: {
          testMode: syncOperation.options?.testMode || false,
          dryRun: syncOperation.options?.dryRun || false,
          maxWebinars: syncOperation.options?.maxWebinars || 'unlimited',
          verboseLogging: syncOperation.options?.verboseLogging || false
        },
        debug: {
          connectionId: requestBody.connectionId,
          userId: user.id,
          syncType: requestBody.syncType,
          enhancedOptions: Object.keys(syncOperation.options || {})
        }
      }),
      { status: 202, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Enhanced Sync Function Error ===');
    console.error(`Error occurred after ${Date.now() - startTime}ms`);
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    
    const status = error.status || 500;
    const message = error.message || 'Internal server error';

    const responseBody: { error: string, isAuthError?: boolean, details?: any } = { 
      error: message,
      details: error.details || null
    };
    
    if (error.isAuthError) {
      responseBody.isAuthError = true;
    }
    
    const body = JSON.stringify(responseBody);

    return new Response(body, { 
      status, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    });
  }
});
