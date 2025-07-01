
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

router.post('/start-sync', extractUser, async (req, res) => {
  const requestId = req.requestId || Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  console.log(`\n=== START SYNC ENDPOINT [${requestId}] ===`);
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
    const syncLog = await supabaseService.createSyncLog(connection_id, sync_type);
    console.log(`✅ [${requestId}] Created sync log:`, syncLog.id);

    // Test Zoom API connection with current token
    console.log(`🚀 [${requestId}] Starting webinar sync process...`);
    console.log(`🔍 [${requestId}] Testing Zoom API connection...`);
    
    try {
      const { zoomService } = require('../services/zoomService');
      const isValidToken = await zoomService.validateAccessToken(connection.access_token);
      
      if (!isValidToken) {
        throw new Error('Token validation failed after refresh attempt');
      }
      
      console.log(`✅ [${requestId}] Zoom API connection test successful`);
      
    } catch (testError) {
      console.log(`💥 [${requestId}] Zoom API connection test failed:`, {
        message: testError.message,
        stack: testError.stack,
        name: testError.name
      });
      
      await supabaseService.updateSyncLog(syncLog.id, {
        sync_status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'Zoom API connection test failed - token may be invalid or expired'
      });
      
      await updateConnectionStatus(connection_id, 'error', testError.message);
      
      throw new Error('Zoom API connection test failed - token may be invalid or expired');
    }

    // Update sync log to running
    await supabaseService.updateSyncLog(syncLog.id, {
      sync_status: 'running',
      started_at: new Date().toISOString()
    });

    // Call the zoom-sync-webinars edge function to start the actual sync
    console.log(`🔄 [${requestId}] Calling zoom-sync-webinars edge function...`);
    
    try {
      const { data: edgeFunctionResult, error: edgeFunctionError } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId: connection_id,
          syncLogId: syncLog.id,
          syncType: sync_type,
          requestId: requestId
        },
        headers: {
          'zoom_connection_id': connection_id,
          'sync_type': 'webinars'
        }
      });

      if (edgeFunctionError) {
        console.error(`❌ [${requestId}] Edge function error:`, edgeFunctionError);
        
        // Update sync log with error
        await supabaseService.updateSyncLog(syncLog.id, {
          sync_status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: `Edge function error: ${edgeFunctionError.message}`
        });
        
        throw new Error(`Edge function failed: ${edgeFunctionError.message}`);
      }

      console.log(`✅ [${requestId}] Edge function called successfully:`, edgeFunctionResult);
      
    } catch (edgeError) {
      console.error(`💥 [${requestId}] Failed to call edge function:`, {
        message: edgeError.message,
        stack: edgeError.stack,
        name: edgeError.name
      });
      
      // Update sync log with error
      await supabaseService.updateSyncLog(syncLog.id, {
        sync_status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: `Failed to start sync process: ${edgeError.message}`
      });
      
      throw new Error(`Failed to start sync process: ${edgeError.message}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ [${requestId}] Sync started successfully (${duration}ms)`);

    res.json({
      success: true,
      message: 'Sync started successfully',
      syncId: syncLog.id,
      connectionId: connection_id,
      syncType: sync_type,
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
    const { zoomService } = require('../services/zoomService');
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

    const { zoomService } = require('../services/zoomService');
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
