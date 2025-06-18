

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { processSimpleWebinarSync } from './simple-sync-processor';
import { createZoomAPIClient } from './zoom-api-client';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
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

    const testModeHeader = req.headers.get('test_mode');
    const testMode = testModeHeader === 'true';
    console.log(`🧪 Test Mode: ${testMode}`);

    // Create sync operation object for the simple processor
    const syncOperation = {
      id: connectionId,
      connection_id: connectionId,
      sync_type: 'full_sync',
      status: 'pending',
      options: {
        debug: false,
        testMode: testMode,
        forceRegistrantSync: false
      }
    };

    // Create sync log ID (simplified for this context)
    const syncLogId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📝 Sync Log ID: ${syncLogId}`);

    // Use the simple webinar sync processor
    await processSimpleWebinarSync(
      supabaseAdmin,
      syncOperation,
      connection,
      syncLogId
    );

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

    return new Response(JSON.stringify({ error: 'Webinar sync failed', details: error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

