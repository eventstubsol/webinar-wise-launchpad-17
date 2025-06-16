
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
  return createSuccessResponse(
    'api_error',
    'Zoom API call failed',
    {
      connection: {
        id: connection.id,
        status: connection.connection_status
      },
      apiTest,
      tokenInfo,
      troubleshooting: {
        possibleCauses: [
          'Token may be expired despite database timestamp',
          'Token scope may not include required permissions',
          'Token type mismatch (OAuth vs Server-to-Server)',
          'Zoom account may be suspended or restricted'
        ],
        suggestions: [
          'Try re-authorizing the Zoom connection',
          'Check Zoom app permissions and scopes',
          'Verify Zoom account is active and in good standing'
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
        status: connection.connection_status
      },
      apiTest,
      tokenInfo
    }
  );
}

export function createCorsResponse() {
  return new Response(null, { headers: corsHeaders });
}
