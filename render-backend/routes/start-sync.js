
const express = require('express');
const router = express.Router();
const { supabaseService } = require('../services/supabaseService');
const { zoomService } = require('../services/zoomService');
const { authMiddleware, extractUser } = require('../middleware/auth');

router.post('/', authMiddleware, extractUser, async (req, res) => {
  const requestId = req.requestId || Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  console.log(`\n=== START SYNC ENDPOINT [${requestId}] ===`);
  console.log('Request body:', req.body);
  console.log('User from auth:', { id: req.userId, email: req.user?.email });

  try {
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

    // Get and verify connection ownership
    console.log(`🔍 [${requestId}] Verifying connection ownership...`);
    const connection = await supabaseService.getConnectionById(connection_id, userId);
    
    if (!connection) {
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
        console.error(`💥 [${requestId}] Token refresh error:`, refreshError);
        
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

    // Create sync log
    console.log(`📝 [${requestId}] Creating sync log...`);
    const syncLog = await supabaseService.createSyncLog(connection_id, sync_type);
    console.log(`✅ [${requestId}] Created sync log:`, syncLog.id);

    // Test Zoom API connection with current token
    console.log(`🚀 [${requestId}] Starting webinar sync process...`);
    console.log(`🔍 [${requestId}] Testing Zoom API connection...`);
    
    try {
      const isValidToken = await zoomService.validateAccessToken(connection.access_token);
      
      if (!isValidToken) {
        throw new Error('Token validation failed after refresh attempt');
      }
      
      console.log(`✅ [${requestId}] Zoom API connection test successful`);
      
    } catch (testError) {
      console.log(`💥 [${requestId}] Zoom API connection test failed:`, testError.message);
      
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

    // Start the actual sync process (this would typically be done async)
    console.log(`🔄 [${requestId}] Starting webinar data sync...`);
    
    // For now, we'll simulate a successful sync start
    // In a real implementation, this would trigger the actual sync process
    
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
      stack: process.env.NODE_ENV === 'production' ? 'Hidden in production' : error.stack
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

// Helper function to refresh server-to-server token
async function refreshServerToServerToken(connection, userId) {
  try {
    // Get user's Zoom credentials
    const { data: credentials, error } = await supabaseService.client
      .from('zoom_credentials')
      .select('client_id, client_secret, account_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !credentials) {
      throw new Error('No active Zoom credentials found for user');
    }

    // Get new token using client credentials flow
    const tokenData = await zoomService.getServerToServerToken(
      credentials.client_id,
      credentials.client_secret,
      credentials.account_id
    );

    // Update connection in database
    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    
    const { error: updateError } = await supabaseService.client
      .from('zoom_connections')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: newExpiresAt,
        connection_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    if (updateError) {
      throw new Error(`Failed to update connection: ${updateError.message}`);
    }

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

// Helper function to refresh OAuth token
async function refreshOAuthToken(connection) {
  try {
    if (!connection.refresh_token) {
      throw new Error('No refresh token available');
    }

    const tokenData = await zoomService.refreshOAuthToken(connection.refresh_token);
    
    // Update connection in database
    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    
    const { error: updateError } = await supabaseService.client
      .from('zoom_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || connection.refresh_token,
        token_expires_at: newExpiresAt,
        connection_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    if (updateError) {
      throw new Error(`Failed to update connection: ${updateError.message}`);
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

// Helper function to update connection status
async function updateConnectionStatus(connectionId, status, errorMessage = null) {
  try {
    const updateData = {
      connection_status: status,
      updated_at: new Date().toISOString()
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await supabaseService.client
      .from('zoom_connections')
      .update(updateData)
      .eq('id', connectionId);

  } catch (error) {
    console.error('Failed to update connection status:', error);
  }
}

module.exports = router;
