
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
  createNetworkErrorResponse
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
      status: primaryConnection.connection_status,
      hasAccessToken: !!primaryConnection.access_token,
      tokenExpiresAt: primaryConnection.token_expires_at,
      accessTokenLength: primaryConnection.access_token?.length
    });

    // Check token expiration
    const now = new Date();
    const expiresAt = new Date(primaryConnection.token_expires_at);
    const isExpired = now >= expiresAt;

    if (isExpired) {
      console.log('Token is expired');
      return createTokenExpiredResponse(primaryConnection);
    }

    // Test Zoom API connection with enhanced debugging
    try {
      const apiResult = await testZoomAPIConnection(primaryConnection);
      
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
          apiResult.tokenInfo || { wasDecrypted: false }
        );
      }
    } catch (testError: any) {
      if (testError.status === 'token_error') {
        return createErrorResponse(200, testError.message, {
          connection: { id: primaryConnection.id, status: primaryConnection.connection_status },
          decryptionError: testError.decryptionError,
          tokenInfo: testError.tokenInfo
        });
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
