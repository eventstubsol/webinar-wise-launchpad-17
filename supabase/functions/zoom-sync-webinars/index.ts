
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, SYNC_PRIORITIES, SyncOperation } from './types.ts';
import { validateRequestEnhanced } from './enhanced-validation.ts';
import { createSyncLog } from './database-operations.ts';
import { processBackgroundSync } from './background-sync-processor.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  console.log('=== ENHANCED SYNC FUNCTION START ===');
  console.log(`Request received: ${new Date().toISOString()}`);
  console.log('Environment check:', {
    hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
    hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    hasZoomClientId: !!Deno.env.get('ZOOM_CLIENT_ID'),
    hasZoomClientSecret: !!Deno.env.get('ZOOM_CLIENT_SECRET'),
    hasEncryptionSalt: !!Deno.env.get('ENCRYPTION_SALT')
  });

  const startTime = Date.now();

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Supabase client created, starting enhanced validation...');
    const { user, connection, requestBody } = await validateRequestEnhanced(req, supabase);
    const validationTime = Date.now();
    console.log(`Enhanced validation completed in ${validationTime - startTime}ms`);

    console.log('Creating sync log...');
    const syncLogId = await createSyncLog(supabase, requestBody.connectionId, requestBody.syncType, requestBody.webinarId);
    const syncLogTime = Date.now();
    console.log(`Sync log created: ${syncLogId} in ${syncLogTime - validationTime}ms`);
    
    const syncOperation: SyncOperation = {
      id: `sync_${Date.now()}`,
      connectionId: requestBody.connectionId,
      userId: user.id,
      syncType: requestBody.syncType,
      webinarId: requestBody.webinarId,
      options: requestBody.options || {},
      priority: SYNC_PRIORITIES[requestBody.syncType] || 3,
      createdAt: new Date()
    };
    
    console.log('Starting background sync process with EdgeRuntime.waitUntil...');
    
    // Use EdgeRuntime.waitUntil to ensure sync continues even if connection drops
    EdgeRuntime.waitUntil(
      processBackgroundSync(supabase, syncOperation, connection, syncLogId)
        .catch(error => {
          console.error('Background sync failed:', error);
          // Background sync errors are already handled in processBackgroundSync
        })
    );

    console.log(`=== Enhanced Sync Request Successful (Total time: ${Date.now() - startTime}ms) ===`);
    return new Response(
      JSON.stringify({
        success: true,
        syncId: syncLogId,
        status: 'started',
        message: `Enhanced background ${requestBody.syncType} sync initiated successfully.`,
        backgroundProcessing: true,
        debug: {
          connectionId: requestBody.connectionId,
          userId: user.id,
          syncType: requestBody.syncType,
          processingMethod: 'background'
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
    
    if (error.isAuthError || status === 401) {
      responseBody.isAuthError = true;
    }
    
    const body = JSON.stringify(responseBody);

    return new Response(body, { 
      status, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    });
  }
});
