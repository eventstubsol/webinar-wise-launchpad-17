
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { processSimpleWebinarSync } from './simple-sync-processor.ts';
import { createSyncLog, updateSyncLog } from './database-operations.ts';

// Deployment verification timestamp: 2025-01-28T10:30:00Z
// Force fresh deployment to resolve import synchronization issues

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

console.log('🚀 ZOOM SYNC WEBINARS: Edge function deployment verified at startup');
console.log('📦 Environment check - SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
console.log('🔑 Environment check - SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');

export default async function handler(req: Request): Promise<Response> {
  console.log('🚀 ZOOM SYNC WEBINARS: Starting sync operation');
  console.log('📡 Request method:', req.method);
  console.log('🌐 Request URL:', req.url);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, zoom_connection_id, test_mode',
    'Access-Control-Max-Age': '86400',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling CORS preflight request');
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  
  let syncLogId: string | null = null;
  
  try {
    console.log('🔐 Verifying authorization header...');
    const authorizationHeader = req.headers.get('Authorization');
    if (!authorizationHeader) {
      console.error('❌ Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const bearerToken = authorizationHeader.replace('Bearer ', '');
    if (!bearerToken) {
      console.error('❌ Invalid Authorization header format');
      return new Response(JSON.stringify({ error: 'Invalid Authorization header format' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔗 Creating Supabase client...');
    const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    });

    console.log('👤 Getting user information...');
    const { data: user, error: userError } = await supabaseAdmin.auth.getUser();
    if (userError) {
      console.error('❌ Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Failed to get user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.user.id;
    console.log(`👤 User ID: ${userId}`);

    const connectionId = req.headers.get('zoom_connection_id');
    if (!connectionId) {
      console.error('❌ Missing zoom_connection_id header');
      return new Response(JSON.stringify({ error: 'Missing zoom_connection_id header' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔗 Zoom Connection ID: ${connectionId}`);

    console.log('🔍 Fetching Zoom connection from database...');
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!connection) {
      console.error('❌ Zoom connection not found');
      return new Response(JSON.stringify({ error: 'Zoom connection not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Zoom Connection Name: ${connection.connection_name}`);

    const testModeHeader = req.headers.get('test_mode');
    const testMode = testModeHeader === 'true';
    console.log(`🧪 Test Mode: ${testMode}`);

    // Create sync log entry
    console.log('📝 Creating sync log entry...');
    syncLogId = await createSyncLog(supabaseAdmin, connectionId, 'full_sync');
    console.log(`📝 Sync Log ID: ${syncLogId}`);

    // Create sync operation object
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

    console.log('🎯 Starting webinar sync process...');
    // Start the sync process
    await processSimpleWebinarSync(
      supabaseAdmin,
      syncOperation,
      connection,
      syncLogId
    );

    console.log('✅ Sync completed successfully');
    return new Response(JSON.stringify({ 
      success: true,
      data: 'Webinar sync completed successfully',
      syncId: syncLogId 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error during sync operation:', error);
    
    // Update sync log with error if we have syncLogId
    if (syncLogId) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);
        await updateSyncLog(supabaseAdmin, syncLogId, {
          sync_status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message || 'Unknown error occurred'
        });
      } catch (logError) {
        console.error('Failed to update sync log with error:', logError);
      }
    }
    
    if (error instanceof Error) {
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
    } else {
      console.error('Non-Error object caught:', error);
    }

    return new Response(JSON.stringify({ 
      error: 'Webinar sync failed', 
      details: error.message || 'Unknown error occurred',
      syncId: syncLogId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
