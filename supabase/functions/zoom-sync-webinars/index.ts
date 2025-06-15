
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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { user, connection, requestBody } = await validateRequest(req, supabase);

    const syncLogId = await createSyncLog(supabase, requestBody.connectionId, requestBody.syncType, requestBody.webinarId);
    
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
    
    queueMicrotask(() => processSequentialSync(supabase, syncOperation, connection, syncLogId));

    return new Response(
      JSON.stringify({
        success: true,
        syncId: syncLogId,
        status: 'started',
        message: `Sequential ${requestBody.syncType} sync initiated successfully.`,
      }),
      { status: 202, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync function error:', error);
    const status = error.status || 500;
    const message = error.message || 'Internal server error';
    const body = error.body ? JSON.stringify({ error: message, ...error.body }) : JSON.stringify({ error: message });

    return new Response(body, { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }
});
