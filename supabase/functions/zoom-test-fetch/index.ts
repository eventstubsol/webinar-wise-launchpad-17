
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateUser } from './auth.ts';
import { getUserZoomConnections, getPrimaryConnection } from './database.ts';
import { testZoomAPIConnection } from './zoom-api.ts';
import { 
  createCorsResponse, 
  createErrorResponse, 
  createNoConnectionsResponse,
  createTokenExpiredResponse,
  createConnectedResponse,
  createApiErrorResponse,
  createNetworkErrorResponse,
  createServerToServerErrorResponse
} from './response-utils.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  try {
    console.log('=== Zoom Test Fetch Started ===');
    console.log('Environment check:', {
      hasEncryptionSalt: !!Deno.env.get('ENCRYPTION_SALT'),
      encryptionSaltLength: Deno.env.get('ENCRYPTION_SALT')?.length || 0
    });
    
    // Authenticate user
    const { user, supabaseClient } = await authenticateUser(req);

    // Get user's Zoom connections
    const connections = await getUserZoomConnections(supabaseClient, user.id);

    if (!connections || connections.length === 0) {
      return createNoConnectionsResponse(user);
    }

    // Get the primary or most recent connection
    const primaryConnection = getPrimaryConnection(connections);
    console.log('Using connection:', {
      id: primaryConnection.id,
      connectionType: primaryConnection.connection_type,
      status: primaryConnection.connection_status,
      hasAccessToken: !!primaryConnection.access_token,
      hasClientId: !!primaryConnection.client_id,
      hasClientSecret: !!primaryConnection.client_secret,
      hasAccountId: !!primaryConnection.account_id,
      tokenExpiresAt: primaryConnection.token_expires_at,
      accessTokenLength: primaryConnection.access_token?.length
    });

    // For OAuth connections, check token expiration
    if (primaryConnection.connection_type === 'oauth' && primaryConnection.token_expires_at) {
      const now = new Date();
      const expiresAt = new Date(primaryConnection.token_expires_at);
      const isExpired = now >= expiresAt;

      if (isExpired) {
        console.log('OAuth token is expired');
        return createTokenExpiredResponse(primaryConnection);
      }
    }

    // Test Zoom API connection with enhanced debugging
    try {
      const apiResult = await testZoomAPIConnection(primaryConnection, supabaseClient);
      
      if (apiResult.success) {
        return createConnectedResponse(
          primaryConnection, 
          apiResult.userData!, 
          apiResult.apiTest,
          apiResult.tokenInfo
        );
      } else {
        return createApiErrorResponse(
          primaryConnection,
          apiResult.apiTest,
          apiResult.tokenInfo || { connectionType: 'unknown' }
        );
      }
    } catch (testError: any) {
      if (testError.status === 'token_error') {
        return createServerToServerErrorResponse(
          primaryConnection,
          testError.message,
          testError.tokenInfo
        );
      }
      
      return createNetworkErrorResponse(primaryConnection, {
        endpoint: '/users/me',
        success: false,
        responseStatus: 0,
        errorMessage: testError.message
      });
    }

  } catch (error: any) {
    console.error('Edge function error:', error);
    
    if (error.status) {
      return createErrorResponse(error.status, error.message, error.details);
    }
    
    return createErrorResponse(500, 'Internal server error', error.message);
  }
});
