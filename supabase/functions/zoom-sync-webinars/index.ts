import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../src/types/supabase';
import { processWebinarSyncEnhanced } from './processors/simple-sync-processor';
import { createZoomAPIClient } from './zoom-api-client';
import { EnhancedSyncProgressTracker } from '../../../src/services/zoom/sync/EnhancedSyncProgressTracker';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';

export default async function handler(req: Request): Promise<Response> {
  console.log('🚀 ZOOM SYNC WEBINARS: Starting sync operation');
  
  try {
    const authorizationHeader = req.headers.get('Authorization');
    if (!authorizationHeader) {
      console.error('❌ Missing Authorization header');
      return new Response('Missing Authorization header', { status: 401 });
    }

    const bearerToken = authorizationHeader.replace('Bearer ', '');
    if (!bearerToken) {
      console.error('❌ Invalid Authorization header format');
      return new Response('Invalid Authorization header format', { status: 401 });
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    });

    const { data: user, error: userError } = await supabaseAdmin.auth.getUser();
    if (userError) {
      console.error('❌ Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Failed to get user' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = user.user.id;
    console.log(`👤 User ID: ${userId}`);

    const connectionId = req.headers.get('zoom_connection_id');
    if (!connectionId) {
      console.error('❌ Missing zoom_connection_id header');
      return new Response('Missing zoom_connection_id header', { status: 400 });
    }

    console.log(`🔗 Zoom Connection ID: ${connectionId}`);

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connectionError) {
      console.error('❌ Error fetching Zoom connection:', connectionError);
      return new Response(JSON.stringify({ error: 'Failed to fetch Zoom connection' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!connection) {
      console.error('❌ Zoom connection not found');
      return new Response('Zoom connection not found', { status: 404 });
    }

    console.log(`✅ Zoom Connection Name: ${connection.connection_name}`);

    const webinarId = req.headers.get('zoom_webinar_id');
    if (!webinarId) {
      console.error('❌ Missing zoom_webinar_id header');
      return new Response('Missing zoom_webinar_id header', { status: 400 });
    }

    console.log(`🎤 Webinar ID: ${webinarId}`);

    const webinarDbId = req.headers.get('zoom_webinar_db_id');
    if (!webinarDbId) {
      console.error('❌ Missing zoom_webinar_db_id header');
      return new Response('Missing zoom_webinar_db_id header', { status: 400 });
    }

    console.log(`🗄️  Webinar DB ID: ${webinarDbId}`);

    const testModeHeader = req.headers.get('test_mode');
    const testMode = testModeHeader === 'true';
    console.log(`🧪 Test Mode: ${testMode}`);

    const { data: webinar, error: webinarError } = await supabaseAdmin
      .from('zoom_webinars')
      .select('*')
      .eq('id', webinarDbId)
      .single();

    if (webinarError) {
      console.error('❌ Error fetching webinar:', webinarError);
      return new Response(JSON.stringify({ error: 'Failed to fetch webinar' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!webinar) {
      console.error('❌ Webinar not found');
      return new Response('Webinar not found', { status: 404 });
    }

    console.log(`🎤 Webinar Topic: ${webinar.topic}`);

    const syncType = 'single_webinar_sync';
    const progressTracker = new EnhancedSyncProgressTracker();
    const syncLogId = await progressTracker.createSyncLog(connectionId, syncType, webinarId);
    console.log(`📝 Sync Log ID: ${syncLogId}`);

    // Create the main ZoomAPIClient with proper pagination
    console.log(`🔧 CREATING MAIN ZOOM API CLIENT for connection: ${connection.id}`);
    const client = await createZoomAPIClient(connection, supabaseAdmin);
    console.log(`✅ MAIN CLIENT CREATED: ${client.constructor?.name || 'Unknown'}`);
    console.log(`🔍 CLIENT CAPABILITIES: getWebinarRegistrants=${typeof client.getWebinarRegistrants === 'function'}`);
    
    console.log(`🎯 USING MAIN CLIENT FOR ALL SYNC OPERATIONS: ${client.constructor?.name || 'Unknown'}`);
    
    // Pass the main ZoomAPIClient to all sync operations
    // This ensures registrant fetching uses the proper pagination from zoom-api-client.ts
    await processWebinarSyncEnhanced(
      webinar,
      supabaseAdmin,
      client, // Main ZoomAPIClient with proper pagination
      syncLogId,
      progressTracker,
      testMode
    );

    await progressTracker.completeSyncLog(syncLogId);

    return new Response(JSON.stringify({ data: 'Webinar sync completed successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error during sync operation:', error);
    
    if (error instanceof Error) {
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
    } else {
      console.error('Non-Error object caught:', error);
    }

    const syncLogId = req.headers.get('sync_log_id');
    if (syncLogId) {
      const progressTracker = new EnhancedSyncProgressTracker();
      await progressTracker.failSyncLog(syncLogId, error);
    }

    return new Response(JSON.stringify({ error: 'Webinar sync failed', details: error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
