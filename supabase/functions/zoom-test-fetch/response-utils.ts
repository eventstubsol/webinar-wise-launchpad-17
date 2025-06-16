
import { ZoomConnectionInfo, ZoomUserData, ApiTestResult } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function createSuccessResponse(status: string, message: string, data: any) {
  return new Response(
    JSON.stringify({
      success: true,
      status,
      message,
      data
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

export function createErrorResponse(statusCode: number, message: string, details?: any) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message, 
      details 
    }),
    { 
      status: statusCode, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

export function createNoConnectionsResponse(userInfo: any) {
  return createSuccessResponse(
    'no_connections',
    'No Zoom connections found for this user',
    {
      userInfo: {
        id: userInfo.id,
        email: userInfo.email
      },
      connectionCount: 0
    }
  );
}

export function createTokenExpiredResponse(connection: any) {
  return createSuccessResponse(
    'token_expired',
    'Zoom access token has expired',
    {
      connection: {
        id: connection.id,
        status: connection.connection_status,
        connectionType: connection.connection_type,
        expiresAt: connection.token_expires_at,
        isExpired: true
      }
    }
  );
}

export function createConnectedResponse(connection: any, userData: ZoomUserData, apiTest: ApiTestResult, tokenInfo?: any) {
  return createSuccessResponse(
    'connected',
    'Zoom API connection successful',
    {
      connection: {
        id: connection.id,
        status: connection.connection_status,
        connectionType: connection.connection_type,
        expiresAt: connection.token_expires_at,
        isExpired: false
      },
      zoomUser: userData,
      apiTest,
      tokenInfo
    }
  );
}

export function createApiErrorResponse(connection: any, apiTest: ApiTestResult, tokenInfo: any) {
  const isServerToServer = connection.connection_type === 'server_to_server';
  
  return createSuccessResponse(
    'api_error',
    'Zoom API call failed',
    {
      connection: {
        id: connection.id,
        status: connection.connection_status,
        connectionType: connection.connection_type
      },
      apiTest,
      tokenInfo,
      troubleshooting: {
        possibleCauses: isServerToServer ? [
          'Server-to-Server app credentials may be invalid',
          'Account ID may be incorrect',
          'App may not be activated in Zoom Marketplace',
          'Zoom account may be suspended or restricted'
        ] : [
          'Token may be expired despite database timestamp',
          'Token scope may not include required permissions',
          'Token type mismatch (OAuth vs Server-to-Server)',
          'Zoom account may be suspended or restricted'
        ],
        suggestions: isServerToServer ? [
          'Verify Client ID, Client Secret, and Account ID are correct',
          'Check that the Server-to-Server app is published and activated',
          'Verify Zoom account is active and in good standing'
        ] : [
          'Try re-authorizing the Zoom connection',
          'Check Zoom app permissions and scopes',
          'Verify Zoom account is active and in good standing'
        ]
      }
    }
  );
}

export function createServerToServerErrorResponse(connection: any, errorMessage: string, tokenInfo: any) {
  return createSuccessResponse(
    'server_to_server_error',
    'Server-to-Server authentication failed',
    {
      connection: {
        id: connection.id,
        status: connection.connection_status,
        connectionType: connection.connection_type
      },
      error: errorMessage,
      tokenInfo,
      troubleshooting: {
        possibleCauses: [
          'Missing or invalid Server-to-Server credentials',
          'Client ID, Client Secret, or Account ID is incorrect',
          'Server-to-Server app is not activated in Zoom',
          'Account does not have permission for Server-to-Server apps'
        ],
        suggestions: [
          'Verify all Server-to-Server credentials are correctly configured',
          'Check that the app is published and activated in Zoom Marketplace',
          'Ensure the account has the necessary permissions',
          'Re-configure the Zoom integration with correct credentials'
        ]
      }
    }
  );
}

export function createNetworkErrorResponse(connection: any, apiTest: ApiTestResult, tokenInfo?: any) {
  return createSuccessResponse(
    'network_error',
    'Failed to connect to Zoom API',
    {
      connection: {
        id: connection.id,
        status: connection.connection_status,
        connectionType: connection.connection_type
      },
      apiTest,
      tokenInfo
    }
  );
}

export function createCorsResponse() {
  return new Response(null, { headers: corsHeaders });
}
