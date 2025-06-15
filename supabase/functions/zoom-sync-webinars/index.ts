
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, SYNC_PRIORITIES, SyncOperation } from './types.ts';
import { validateRequest } from './validation.ts';
import { createSyncLog } from './database-operations.ts';
import { processSequentialSync } from './sync-processor.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  console.log('=== Starting Zoom Sync Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    console.log('Supabase client created, validating request...');
    const { user, connection, requestBody } = await validateRequest(req, supabase);
    console.log('Request validated successfully');

    console.log('Creating sync log...');
    const syncLogId = await createSyncLog(supabase, requestBody.connectionId, requestBody.syncType, requestBody.webinarId);
    console.log(`Sync log created: ${syncLogId}`);
    
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
    
    console.log('Starting background sync process...');
    queueMicrotask(() => processSequentialSync(supabase, syncOperation, connection, syncLogId));

    console.log('=== Sync Request Successful ===');
    return new Response(
      JSON.stringify({
        success: true,
        syncId: syncLogId,
        status: 'started',
        message: `Sequential ${requestBody.syncType} sync initiated successfully.`,
        debug: {
          connectionId: requestBody.connectionId,
          userId: user.id,
          syncType: requestBody.syncType
        }
      }),
      { status: 202, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Sync Function Error ===');
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
