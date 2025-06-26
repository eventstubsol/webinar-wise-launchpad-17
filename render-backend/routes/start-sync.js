
const express = require('express');
const router = express.Router();
const { supabaseService } = require('../services/supabaseService');
const { zoomService } = require('../services/zoomService');

router.post('/start-sync', async (req, res) => {
  console.log('=== START SYNC ENDPOINT ===');
  console.log('Request body:', req.body);
  console.log('User ID from auth:', req.user?.id);

  let syncLogId = null;

  try {
    const { connection_id, sync_type = 'manual' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.error('No user ID found in request');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!connection_id) {
      console.error('No connection_id provided');
      return res.status(400).json({
        success: false,
        error: 'connection_id is required'
      });
    }

    console.log(`Starting sync for user ${userId}, connection ${connection_id}`);

    // Verify connection exists and belongs to user
    const { data: connection, error: connError } = await supabaseService.client
      .from('zoom_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('user_id', userId)
      .single();

    if (connError) {
      console.error('Connection query error:', connError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify connection',
        details: connError.message
      });
    }

    if (!connection) {
      console.error('Connection not found or not owned by user');
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    console.log('Connection verified:', connection.id);

    // Check if connection has valid credentials
    if (!connection.access_token) {
      console.error('Connection missing access token');
      return res.status(400).json({
        success: false,
        error: 'Connection is missing access token. Please reconnect your Zoom account.'
      });
    }

    // Create sync log
    const { data: syncLog, error: syncLogError } = await supabaseService.client
      .from('zoom_sync_logs')
      .insert({
        connection_id: connection_id,
        sync_type: sync_type,
        sync_status: 'started',
        started_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('Failed to create sync log:', syncLogError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create sync log',
        details: syncLogError.message
      });
    }

    syncLogId = syncLog.id;
    console.log('Created sync log:', syncLogId);

    // Update sync log to in_progress
    await supabaseService.client
      .from('zoom_sync_logs')
      .update({
        sync_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);

    // Start the actual sync process
    console.log('Starting webinar sync...');
    
    try {
      // Get webinars from Zoom API
      const webinars = await zoomService.getWebinars(connection.access_token);
      console.log(`Fetched ${webinars.length} webinars from Zoom`);

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

      // Process each webinar
      for (const webinar of webinars) {
        try {
          console.log(`Processing webinar: ${webinar.topic}`);
          
          // Transform webinar data for database
          const webinarData = {
            connection_id: connection_id,
            zoom_webinar_id: webinar.id.toString(),
            zoom_uuid: webinar.uuid,
            topic: webinar.topic,
            agenda: webinar.agenda || null,
            start_time: webinar.start_time,
            duration: webinar.duration,
            timezone: webinar.timezone,
            status: webinar.status || 'scheduled',
            host_id: webinar.host_id,
            host_email: webinar.host_email,
            webinar_type: webinar.type,
            join_url: webinar.join_url,
            registration_url: webinar.registration_url || null,
            password: webinar.password || null,
            settings: webinar.settings || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            synced_at: new Date().toISOString()
          };

          // Upsert webinar
          const { error: upsertError } = await supabaseService.client
            .from('zoom_webinars')
            .upsert(webinarData, {
              onConflict: 'connection_id,zoom_webinar_id'
            });

          if (upsertError) {
            console.error(`Failed to upsert webinar ${webinar.id}:`, upsertError);
            errors.push(`Webinar ${webinar.id}: ${upsertError.message}`);
          } else {
            processedCount++;
            console.log(`Successfully processed webinar: ${webinar.topic}`);
          }

          // Update progress
          await supabaseService.client
            .from('zoom_sync_logs')
            .update({
              processed_items: processedCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', syncLogId);

        } catch (webinarError) {
          console.error(`Error processing webinar ${webinar.id}:`, webinarError);
          errors.push(`Webinar ${webinar.id}: ${webinarError.message}`);
        }
      }

      // Complete sync log
      await supabaseService.client
        .from('zoom_sync_logs')
        .update({
          sync_status: 'completed',
          completed_at: new Date().toISOString(),
          processed_items: processedCount,
          error_message: errors.length > 0 ? `${errors.length} errors occurred` : null,
          error_details: errors.length > 0 ? { errors } : null,
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

      console.log(`Sync completed successfully. Processed: ${processedCount}, Errors: ${errors.length}`);

      res.json({
        success: true,
        syncId: syncLogId,
        message: `Sync completed successfully. Processed ${processedCount} webinars.`,
        processedCount,
        totalCount: webinars.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (syncError) {
      console.error('Sync process error:', syncError);
      
      // Update sync log with error
      if (syncLogId) {
        await supabaseService.client
          .from('zoom_sync_logs')
          .update({
            sync_status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: syncError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', syncLogId);
      }

      throw syncError;
    }

  } catch (error) {
    console.error('Start sync error:', error);
    
    // Update sync log if we have one
    if (syncLogId) {
      try {
        await supabaseService.client
          .from('zoom_sync_logs')
          .update({
            sync_status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', syncLogId);
      } catch (logError) {
        console.error('Failed to update sync log with error:', logError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      syncId: syncLogId,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
