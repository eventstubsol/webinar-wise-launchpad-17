
const express = require('express');
const router = express.Router();
const { supabaseService } = require('../services/supabaseService');
const { zoomService } = require('../services/zoomService');

router.post('/start-sync', async (req, res) => {
  const requestId = req.requestId || Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  console.log(`\n=== START SYNC ENDPOINT [${requestId}] ===`);
  console.log(`Request body:`, JSON.stringify(req.body, null, 2));
  console.log(`User from auth:`, req.user ? { id: req.user.id, email: req.user.email } : 'none');

  let syncLogId = null;

  try {
    // Input validation
    const { connection_id, sync_type = 'manual' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.error(`❌ [${requestId}] No user ID found in request`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        details: 'No user found in authenticated request',
        requestId
      });
    }

    if (!connection_id) {
      console.error(`❌ [${requestId}] No connection_id provided`);
      return res.status(400).json({
        success: false,
        error: 'connection_id is required',
        details: 'connection_id must be provided in request body',
        requestId
      });
    }

    console.log(`🔄 [${requestId}] Starting sync for user ${userId}, connection ${connection_id}`);

    // Enhanced connection verification with detailed logging
    console.log(`🔍 [${requestId}] Verifying connection ownership...`);
    const { data: connection, error: connError } = await supabaseService.client
      .from('zoom_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('user_id', userId)
      .single();

    if (connError) {
      console.error(`❌ [${requestId}] Connection query error:`, {
        message: connError.message,
        details: connError.details,
        hint: connError.hint,
        code: connError.code
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to verify connection',
        details: `Database error: ${connError.message}`,
        requestId
      });
    }

    if (!connection) {
      console.error(`❌ [${requestId}] Connection not found or not owned by user`);
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
        details: 'Connection does not exist or you do not have access to it',
        requestId
      });
    }

    console.log(`✅ [${requestId}] Connection verified:`, {
      id: connection.id,
      status: connection.connection_status,
      type: connection.connection_type,
      lastSync: connection.last_sync_at
    });

    // Enhanced credential validation
    if (!connection.access_token) {
      console.error(`❌ [${requestId}] Connection missing access token`);
      return res.status(400).json({
        success: false,
        error: 'Connection is missing access token',
        details: 'Please reconnect your Zoom account to refresh credentials',
        requestId
      });
    }

    // Check token expiration
    if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
      console.log(`⚠️ [${requestId}] Access token appears expired, attempting refresh...`);
      // For server-to-server connections, tokens should auto-refresh
      if (connection.connection_type === 'server_to_server') {
        console.log(`🔄 [${requestId}] Server-to-server connection should auto-refresh token`);
      }
    }

    // Create sync log with enhanced error handling
    console.log(`📝 [${requestId}] Creating sync log...`);
    const { data: syncLog, error: syncLogError } = await supabaseService.client
      .from('zoom_sync_logs')
      .insert({
        connection_id: connection_id,
        sync_type: sync_type,
        sync_status: 'started',
        started_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0,
        metadata: {
          requestId,
          userAgent: req.get('User-Agent'),
          origin: req.get('Origin')
        }
      })
      .select()
      .single();

    if (syncLogError) {
      console.error(`❌ [${requestId}] Failed to create sync log:`, {
        message: syncLogError.message,
        details: syncLogError.details,
        hint: syncLogError.hint
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to create sync log',
        details: `Database error: ${syncLogError.message}`,
        requestId
      });
    }

    syncLogId = syncLog.id;
    console.log(`✅ [${requestId}] Created sync log: ${syncLogId}`);

    // Update sync log to in_progress
    await supabaseService.client
      .from('zoom_sync_logs')
      .update({
        sync_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);

    // Start the actual sync process with enhanced error handling
    console.log(`🚀 [${requestId}] Starting webinar sync process...`);
    
    try {
      // Test Zoom API connection first
      console.log(`🔍 [${requestId}] Testing Zoom API connection...`);
      const testResult = await zoomService.validateToken(connection.access_token);
      
      if (!testResult) {
        throw new Error('Zoom API connection test failed - token may be invalid or expired');
      }
      
      console.log(`✅ [${requestId}] Zoom API connection verified`);

      // Get webinars from Zoom API
      console.log(`📥 [${requestId}] Fetching webinars from Zoom API...`);
      const webinars = await zoomService.getWebinars(connection.access_token);
      console.log(`📊 [${requestId}] Fetched ${webinars.length} webinars from Zoom`);

      // Update sync log with total count
      await supabaseService.client
        .from('zoom_sync_logs')
        .update({
          total_items: webinars.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', syncLogId);

      let processedCount = 0;
      const errors = [];

      // Process each webinar with enhanced error handling
      for (const [index, webinar] of webinars.entries()) {
        try {
          console.log(`🔄 [${requestId}] Processing webinar ${index + 1}/${webinars.length}: ${webinar.topic}`);
          
          // Validate required webinar fields
          if (!webinar.id || !webinar.topic) {
            throw new Error(`Webinar missing required fields: ${JSON.stringify({ id: webinar.id, topic: webinar.topic })}`);
          }

          // Transform webinar data for database
          const webinarData = {
            connection_id: connection_id,
            zoom_webinar_id: webinar.id.toString(),
            zoom_uuid: webinar.uuid || null,
            topic: webinar.topic,
            agenda: webinar.agenda || null,
            start_time: webinar.start_time,
            duration: webinar.duration || 60,
            timezone: webinar.timezone || 'UTC',
            status: webinar.status || 'scheduled',
            host_id: webinar.host_id || 'unknown',
            host_email: webinar.host_email || 'unknown@example.com',
            webinar_type: webinar.type || 5,
            join_url: webinar.join_url || '',
            registration_url: webinar.registration_url || null,
            password: webinar.password || null,
            settings: webinar.settings || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            synced_at: new Date().toISOString()
          };

          // Upsert webinar with conflict resolution
          const { error: upsertError } = await supabaseService.client
            .from('zoom_webinars')
            .upsert(webinarData, {
              onConflict: 'connection_id,zoom_webinar_id',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error(`❌ [${requestId}] Failed to upsert webinar ${webinar.id}:`, upsertError);
            errors.push(`Webinar ${webinar.id} (${webinar.topic}): ${upsertError.message}`);
          } else {
            processedCount++;
            console.log(`✅ [${requestId}] Successfully processed webinar: ${webinar.topic}`);
          }

          // Update progress every 10 webinars or on last webinar
          if ((index + 1) % 10 === 0 || index === webinars.length - 1) {
            await supabaseService.client
              .from('zoom_sync_logs')
              .update({
                processed_items: processedCount,
                updated_at: new Date().toISOString()
              })
              .eq('id', syncLogId);
          }

        } catch (webinarError) {
          console.error(`❌ [${requestId}] Error processing webinar ${webinar.id}:`, webinarError);
          errors.push(`Webinar ${webinar.id}: ${webinarError.message}`);
        }
      }

      // Complete sync log with comprehensive results
      const syncDuration = Date.now() - startTime;
      await supabaseService.client
        .from('zoom_sync_logs')
        .update({
          sync_status: 'completed',
          completed_at: new Date().toISOString(),
          processed_items: processedCount,
          duration_seconds: Math.round(syncDuration / 1000),
          error_message: errors.length > 0 ? `${errors.length} errors occurred during sync` : null,
          error_details: errors.length > 0 ? { errors, totalErrors: errors.length } : null,
          metadata: {
            ...syncLog.metadata,
            completedAt: new Date().toISOString(),
            totalDuration: syncDuration,
            successRate: ((processedCount / webinars.length) * 100).toFixed(2) + '%'
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', syncLogId);

      // Update connection last sync time
      await supabaseService.client
        .from('zoom_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', connection_id);

      console.log(`🎉 [${requestId}] Sync completed successfully in ${syncDuration}ms:`);
      console.log(`   📊 Processed: ${processedCount}/${webinars.length} webinars`);
      console.log(`   ❌ Errors: ${errors.length}`);
      console.log(`   ✅ Success Rate: ${((processedCount / webinars.length) * 100).toFixed(2)}%`);

      res.json({
        success: true,
        syncId: syncLogId,
        message: `Sync completed successfully. Processed ${processedCount} out of ${webinars.length} webinars.`,
        results: {
          processedCount,
          totalCount: webinars.length,
          errorCount: errors.length,
          successRate: ((processedCount / webinars.length) * 100).toFixed(2) + '%',
          duration: syncDuration
        },
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error details in response
        requestId
      });

    } catch (syncError) {
      console.error(`💥 [${requestId}] Sync process error:`, {
        message: syncError.message,
        stack: syncError.stack
      });
      
      // Update sync log with error
      if (syncLogId) {
        await supabaseService.client
          .from('zoom_sync_logs')
          .update({
            sync_status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: syncError.message,
            duration_seconds: Math.round((Date.now() - startTime) / 1000),
            updated_at: new Date().toISOString()
          })
          .eq('id', syncLogId);
      }

      throw syncError;
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`💥 [${requestId}] Start sync error (${duration}ms):`, {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : 'Hidden in production'
    });
    
    // Update sync log if we have one
    if (syncLogId) {
      try {
        await supabaseService.client
          .from('zoom_sync_logs')
          .update({
            sync_status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message,
            duration_seconds: Math.round(duration / 1000),
            updated_at: new Date().toISOString()
          })
          .eq('id', syncLogId);
      } catch (logError) {
        console.error(`❌ [${requestId}] Failed to update sync log with error:`, logError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      syncId: syncLogId,
      duration,
      requestId,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        timestamp: new Date().toISOString()
      } : undefined
    });
  }
});

module.exports = router;
