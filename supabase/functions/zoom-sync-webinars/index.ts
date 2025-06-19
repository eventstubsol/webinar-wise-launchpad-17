
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, zoom_connection_id, test_mode',
  'Access-Control-Max-Age': '86400',
};

// Simple Zoom API client
class ZoomAPIClient {
  constructor(private accessToken: string) {}
  
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`https://api.zoom.us/v2${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async getWebinars() {
    console.log('📡 Fetching webinars from Zoom API...');
    const response = await this.makeRequest('/users/me/webinars?page_size=100&type=all');
    console.log(`✅ Found ${response.webinars?.length || 0} webinars`);
    return response.webinars || [];
  }
  
  async getWebinarDetails(webinarId: string) {
    console.log(`📡 Fetching details for webinar ${webinarId}...`);
    return await this.makeRequest(`/webinars/${webinarId}`);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  console.log('🚀 ZOOM SYNC WEBINARS: Function started');
  console.log(`📡 Request method: ${req.method}`);
  console.log(`🌐 Request URL: ${req.url}`);
  
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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('📦 Environment check - SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
    console.log('🔑 Environment check - SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }
    
    // Check authorization
    const authorizationHeader = req.headers.get('Authorization');
    if (!authorizationHeader) {
      console.log('❌ Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const bearerToken = authorizationHeader.replace('Bearer ', '');
    if (!bearerToken) {
      console.log('❌ Invalid Authorization header format');
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
      return new Response(JSON.stringify({ error: 'Failed to get user', details: userError.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.user.id;
    console.log(`👤 User ID: ${userId}`);

    // Get connection ID
    const connectionId = req.headers.get('zoom_connection_id');
    if (!connectionId) {
      console.log('❌ Missing zoom_connection_id header');
      return new Response(JSON.stringify({ error: 'Missing zoom_connection_id header' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔗 Zoom Connection ID: ${connectionId}`);

    // Fetch Zoom connection
    console.log('🔍 Fetching Zoom connection from database...');
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connectionError || !connection) {
      console.error('❌ Error fetching Zoom connection:', connectionError);
      return new Response(JSON.stringify({ 
        error: 'Zoom connection not found', 
        details: connectionError?.message || 'No connection found'
      }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Zoom Connection Email: ${connection.zoom_email}`);

    // Verify we have access token
    if (!connection.access_token) {
      console.error('❌ No access token in connection');
      return new Response(JSON.stringify({ 
        error: 'No access token available', 
        details: 'Connection missing access token'
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test mode check
    const testModeHeader = req.headers.get('test_mode');
    const testMode = testModeHeader === 'true';
    console.log(`🧪 Test Mode: ${testMode}`);

    // Create sync log entry - USING CORRECT sync_type VALUE
    console.log('📝 Creating sync log entry...');
    const syncData = {
      connection_id: connectionId,
      sync_type: 'initial', // ✅ CORRECT VALUE - matches database constraint
      sync_status: 'started',
      started_at: new Date().toISOString(),
      total_items: 0,
      processed_items: 0,
      resource_type: 'webinars'
    };
    
    console.log('📝 Sync log data:', JSON.stringify(syncData, null, 2));
    
    const { data: syncLogData, error: syncLogError } = await supabaseAdmin
      .from('zoom_sync_logs')
      .insert(syncData)
      .select('id')
      .single();

    if (syncLogError) {
      console.error('❌ Failed to create sync log:', syncLogError);
      return new Response(JSON.stringify({ 
        error: 'Failed to initialize sync operation',
        details: syncLogError.message,
        code: syncLogError.code
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    syncLogId = syncLogData.id;
    console.log(`✅ Sync log created with ID: ${syncLogId}`);

    // Update sync status to in_progress
    console.log('📊 Updating sync status to in_progress...');
    await supabaseAdmin
      .from('zoom_sync_logs')
      .update({
        sync_status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', syncLogId);

    // Create Zoom API client
    console.log('🔧 Creating Zoom API client...');
    const zoomClient = new ZoomAPIClient(connection.access_token);
    
    // Fetch webinars from Zoom
    console.log('📡 Fetching webinars from Zoom API...');
    const webinars = await zoomClient.getWebinars();
    
    const totalWebinars = webinars.length;
    console.log(`📊 Found ${totalWebinars} webinars to sync`);
    
    // Update total items count
    await supabaseAdmin
      .from('zoom_sync_logs')
      .update({
        total_items: totalWebinars,
        processed_items: 0
      })
      .eq('id', syncLogId);
    
    if (totalWebinars === 0) {
      console.log('📭 No webinars found - completing sync');
      await supabaseAdmin
        .from('zoom_sync_logs')
        .update({
          sync_status: 'completed',
          completed_at: new Date().toISOString(),
          processed_items: 0
        })
        .eq('id', syncLogId);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Sync completed - no webinars found',
        syncId: syncLogId,
        stats: { totalWebinars: 0, processedWebinars: 0 }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let processedCount = 0;
    
    // Process each webinar
    for (let i = 0; i < webinars.length; i++) {
      const webinar = webinars[i];
      
      try {
        console.log(`🔄 Processing webinar ${i + 1}/${totalWebinars}: ${webinar.id} - ${webinar.topic}`);
        
        // Get detailed webinar data
        const webinarDetails = await zoomClient.getWebinarDetails(webinar.id);
        
        // Store webinar in database
        console.log(`💾 Storing webinar ${webinar.id} in database...`);
        const { error: upsertError } = await supabaseAdmin
          .from('zoom_webinars')
          .upsert({
            webinar_id: webinar.id.toString(),
            webinar_uuid: webinarDetails.uuid,
            connection_id: connectionId,
            topic: webinar.topic,
            type: webinar.type,
            start_time: webinar.start_time,
            duration: webinar.duration,
            timezone: webinar.timezone,
            status: webinar.status,
            host_id: webinar.host_id,
            host_email: webinar.host_email,
            total_registrants: webinar.registrants_count || 0,
            webinar_created_at: webinar.created_at,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'webinar_id,connection_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error(`❌ Error storing webinar ${webinar.id}:`, upsertError);
          throw upsertError;
        }
        
        processedCount++;
        console.log(`✅ Processed webinar ${i + 1}/${totalWebinars} (${webinar.id})`);
        
        // Update progress
        await supabaseAdmin
          .from('zoom_sync_logs')
          .update({
            processed_items: processedCount
          })
          .eq('id', syncLogId);
        
      } catch (error) {
        console.error(`❌ Error processing webinar ${webinar.id}:`, error);
        // Continue with next webinar even if one fails
      }
    }
    
    // Mark sync as completed
    console.log('🎯 Finalizing sync operation...');
    await supabaseAdmin
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: processedCount
      })
      .eq('id', syncLogId);
    
    console.log(`🎉 Sync completed successfully! Processed ${processedCount}/${totalWebinars} webinars`);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webinar sync completed successfully',
      syncId: syncLogId,
      stats: {
        totalWebinars: totalWebinars,
        processedWebinars: processedCount,
        failedWebinars: totalWebinars - processedCount
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error during sync operation:', error);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    
    // Update sync log with error if we have syncLogId
    if (syncLogId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        if (supabaseUrl && supabaseAnonKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);
          await supabaseAdmin
            .from('zoom_sync_logs')
            .update({
              sync_status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: error.message || 'Unknown error occurred'
            })
            .eq('id', syncLogId);
        }
      } catch (logError) {
        console.error('Failed to update sync log with error:', logError);
      }
    }

    return new Response(JSON.stringify({ 
      error: 'Webinar sync failed', 
      details: error.message || 'Unknown error occurred',
      syncId: syncLogId,
      stack: error.stack?.split('\n').slice(0, 3) // First 3 lines of stack for debugging
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
