const express = require('express');
const router = express.Router();
const { supabaseService } = require('../services/supabaseService');
const { extractUser } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client for calling edge functions
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to run sync locally instead of calling edge function
async function runSyncAsync(syncLogId, connectionId, syncType, requestId) {
  try {
    console.log(`[ASYNC] Starting local sync process for sync ${syncLogId}`);
    
    // Get the connection details
    const connection = await supabaseService.getZoomConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Get credentials
    const credentials = await supabaseService.getCredentialsByUserId(connection.user_id);
    if (!credentials) {
      throw new Error('No active Zoom credentials found');
    }

    // Import zoom service
    const { syncWebinars } = require('../services/zoomSyncService');
    
    // Update sync log to indicate we're processing
    await supabaseService.updateSyncLog(syncLogId, {
      sync_status: 'running',
      current_operation: 'Fetching webinars from Zoom API...',
      sync_progress: 10
    });

    // Run the sync
    const result = await syncWebinars({
      connection,
      credentials,
      syncLogId,
      syncType,
      onProgress: async (progress, operation) => {
        await supabaseService.updateSyncLog(syncLogId, {
          sync_progress: progress,
          current_operation: operation,
          updated_at: new Date().toISOString()
        });
      }
    });

    // Update sync log with completion
    await supabaseService.updateSyncLog(syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      total_items: result.totalWebinars || 0,
      processed_items: result.processedWebinars || 0,
      webinars_synced: result.processedWebinars || 0,
      sync_progress: 100,
      current_operation: 'Sync completed successfully',
      metadata: {
        totalWebinars: result.totalWebinars || 0,
        processedWebinars: result.processedWebinars || 0,
        errors: result.errors || [],
        completedAt: new Date().toISOString()
      }
    });

    console.log(`[ASYNC] Local sync completed successfully for sync ${syncLogId}:`, result);
    
  } catch (error) {
    console.error(`[ASYNC] Failed to run local sync for ${syncLogId}:`, error);
    
    // Update sync log with error
    try {
      await supabaseService.updateSyncLog(syncLogId, {
        sync_status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: `Sync error: ${error.message}`,
        sync_progress: 0,
        current_operation: 'Sync failed'
      });
    } catch (updateError) {
      console.error(`[ASYNC] Failed to update sync log:`, updateError);
    }
  }
}

router.post('/start-sync', extractUser, async (req, res) => {
  const requestId = req.requestId || Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  console.log(`\n=== START SYNC ENDPOINT (ASYNC) [${requestId}] ===`);
  console.log('Request body:', req.body);
  console.log('User from auth:', { id: req.userId, email: req.user?.email });

  try {
    // Check if Supabase service is properly initialized
    if (supabaseService.initializationError) {
      console.error(`❌ [${requestId}] Supabase service not initialized:`, supabaseService.initializationError);
      return res.status(503).json({
        success: false,
        error: 'Database service is not available',
        details: supabaseService.initializationError,
        requestId
      });
    }

    const { connection_id, sync_type = 'incremental' } = req.body;
    const userId = req.userId;

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing connection_id parameter',
        requestId
      });
    }

    console.log(`🔄 [${requestId}] Starting sync for user ${userId}, connection ${connection_id}`);

    // Test Supabase connection first
    console.log(`🔍 [${requestId}] Testing Supabase Service Role access...`);
    const isServiceHealthy = await supabaseService.testConnection();
    
    if (!isServiceHealthy) {
      console.error(`❌ [${requestId}] Supabase service is not accessible`);
      return res.status(503).json({
        success: false,
        error: 'Database service is currently unavailable',
        requestId
      });
    }

    // Get and verify connection ownership using Service Role
    console.log(`🔍 [${requestId}] Verifying connection ownership...`);
    const connection = await supabaseService.getConnectionById(connection_id, userId);
    
    if (!connection) {
      console.error(`❌ [${requestId}] Connection not found or access denied`);
      return res.status(404).json({
        success: false,
        error: 'Connection not found or access denied',
        requestId
      });
    }

    console.log(`✅ [${requestId}] Connection verified:`, {
      id: connection.id,
      status: connection.connection_status,
      type: connection.connection_type,
      lastSync: connection.last_sync_at
    });

    // Check if token needs refresh
    const tokenExpiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const isTokenExpired = tokenExpiresAt <= now;
    const willExpireSoon = tokenExpiresAt <= new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes buffer

    if (isTokenExpired || willExpireSoon) {
      console.log(`⚠️ [${requestId}] Access token ${isTokenExpired ? 'is expired' : 'expires soon'}, attempting refresh...`);
      
      try {
        // Refresh token based on connection type
        let refreshResult;
        
        if (connection.connection_type === 'server_to_server') {
          console.log(`🔄 [${requestId}] Refreshing server-to-server token...`);
          refreshResult = await refreshServerToServerToken(connection, userId);
        } else {
          console.log(`🔄 [${requestId}] Refreshing OAuth token...`);
          refreshResult = await refreshOAuthToken(connection);
        }

        if (!refreshResult.success) {
          console.log(`❌ [${requestId}] Token refresh failed:`, refreshResult.error);
          
          // Update connection status to expired
          await updateConnectionStatus(connection_id, 'expired', refreshResult.error);
          
          return res.status(401).json({
            success: false,
            error: 'Token refresh failed. Please reconnect your Zoom account.',
            details: refreshResult.error,
            requiresReconnection: true,
            requestId
          });
        }

        console.log(`✅ [${requestId}] Token refreshed successfully`);
        
        // Update connection with new token
        connection.access_token = refreshResult.access_token;
        connection.token_expires_at = refreshResult.token_expires_at;
        connection.connection_status = 'active';
        
      } catch (refreshError) {
        console.error(`💥 [${requestId}] Token refresh error:`, {
          message: refreshError.message,
          stack: refreshError.stack,
          name: refreshError.name
        });
        
        await updateConnectionStatus(connection_id, 'expired', refreshError.message);
        
        return res.status(401).json({
          success: false,
          error: 'Failed to refresh access token. Please reconnect your Zoom account.',
          details: refreshError.message,
          requiresReconnection: true,
          requestId
        });
      }
    }

    // Create sync log using Service Role
    console.log(`📝 [${requestId}] Creating sync log...`);
    const syncLogData = {
      connection_id: connection_id,
      sync_type: sync_type,
      sync_status: 'started',
      started_at: new Date().toISOString(),
      total_items: 0,
      processed_items: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const syncLog = await supabaseService.createSyncLog(syncLogData);
    console.log(`✅ [${requestId}] Created sync log:`, syncLog.id);

    // Update sync log to running
    await supabaseService.updateSyncLog(syncLog.id, {
      sync_status: 'running',
      started_at: new Date().toISOString()
    });

    // Start the sync asynchronously - don't wait for it
    console.log(`🚀 [${requestId}] Starting async sync process...`);
    
    // Run the sync in the background
    runSyncAsync(syncLog.id, connection_id, sync_type, requestId)
      .then(() => {
        console.log(`✅ [${requestId}] Async sync completed for sync ${syncLog.id}`);
      })
      .catch((error) => {
        console.error(`❌ [${requestId}] Async sync failed for sync ${syncLog.id}:`, error);
      });
    
    const duration = Date.now() - startTime;
    console.log(`✅ [${requestId}] Sync initiated successfully (${duration}ms)`);

    // Return immediately with sync ID
    res.json({
      success: true,
      message: 'Sync started successfully',
      syncId: syncLog.id,
      connectionId: connection_id,
      syncType: sync_type,
      syncStatus: 'running',
      duration,
      requestId
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`💥 [${requestId}] Start sync error (${duration}ms):`, {
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? 'Hidden in production' : error.stack,
      name: error.name
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      syncId: req.syncLogId || null,
      duration,
      requestId
    });
  }
});

// Helper function to refresh server-to-server token using Service Role
async function refreshServerToServerToken(connection, userId) {
  try {
    console.log(`🔄 Getting user credentials for user: ${userId}`);
    
    const credentials = await supabaseService.getCredentialsByUserId(userId);

    if (!credentials) {
      throw new Error('No active Zoom credentials found for user');
    }

    console.log(`✅ Retrieved credentials for user ${userId}`);

    // Get new token using client credentials flow
    const zoomService = require('../services/zoomService');
    const tokenData = await zoomService.getServerToServerToken(
      credentials.client_id,
      credentials.client_secret,
      credentials.account_id
    );

    // Update connection in database using Service Role
    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    
    const updatedConnection = await supabaseService.updateConnection(connection.id, {
      access_token: tokenData.access_token,
      token_expires_at: newExpiresAt,
      connection_status: 'active'
    });

    if (!updatedConnection) {
      throw new Error('Failed to update connection with new token');
    }

    console.log(`✅ Connection updated with new token`);

    return {
      success: true,
      access_token: tokenData.access_token,
      token_expires_at: newExpiresAt
    };

  } catch (error) {
    console.error('Server-to-server token refresh failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to refresh server-to-server token'
    };
  }
}

async function refreshOAuthToken(connection) {
  try {
    if (!connection.refresh_token) {
      throw new Error('No refresh token available');
    }

    const zoomService = require('../services/zoomService');
    const tokenData = await zoomService.refreshOAuthToken(connection.refresh_token);
    
    // Update connection in database using Service Role
    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    
    const updatedConnection = await supabaseService.updateConnection(connection.id, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || connection.refresh_token,
      token_expires_at: newExpiresAt,
      connection_status: 'active'
    });

    if (!updatedConnection) {
      throw new Error('Failed to update connection with refreshed token');
    }

    return {
      success: true,
      access_token: tokenData.access_token,
      token_expires_at: newExpiresAt
    };

  } catch (error) {
    console.error('OAuth token refresh failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to refresh OAuth token'
    };
  }
}

async function updateConnectionStatus(connectionId, status, errorMessage = null) {
  try {
    const updateData = {
      connection_status: status
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await supabaseService.updateConnection(connectionId, updateData);
    console.log(`✅ Updated connection ${connectionId} status to ${status}`);

  } catch (error) {
    console.error('Failed to update connection status:', error);
  }
}

module.exports = router;
