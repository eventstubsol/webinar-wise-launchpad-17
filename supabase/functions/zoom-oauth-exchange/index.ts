
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OAuthRequest, TokenResponse, ZoomUser, ConnectionData } from './types.ts';
import { SimpleTokenEncryption } from './encryption.ts';
import { RequestValidator } from './validation.ts';
import { ZoomApiService } from './zoom-api.ts';
import { DatabaseService } from './database.ts';
import { ResponseUtils } from './response-utils.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseUtils.createCorsResponse();
  }

  try {
    // Validate environment
    const envError = RequestValidator.validateEnvironment();
    if (envError) {
      console.error('Environment validation failed:', envError);
      return ResponseUtils.createErrorResponse(envError.message, 500);
    }

    // Parse and validate request
    const request: OAuthRequest = await req.json();
    console.log('OAuth exchange request received', { 
      code: request.code?.substring(0, 10) + '...', 
      state: request.state 
    });

    const requestError = RequestValidator.validateOAuthRequest(request);
    if (requestError) {
      return ResponseUtils.createErrorResponse(requestError, 400);
    }

    // Initialize database service and validate user
    const dbService = new DatabaseService();
    const authHeader = req.headers.get('Authorization');
    
    let user;
    try {
      user = await dbService.validateUser(authHeader);
    } catch (error) {
      return ResponseUtils.createErrorResponse(error.message, 401);
    }

    // Exchange code for tokens
    const redirectUri = Deno.env.get('ZOOM_REDIRECT_URI') || request.redirectUri;
    if (!redirectUri) {
      return ResponseUtils.createErrorResponse('Redirect URI is not configured.', 500);
    }
    
    let tokenData: TokenResponse;
    try {
      tokenData = await ZoomApiService.exchangeCodeForTokens(request.code, redirectUri);
      console.log('Token exchange successful');
    } catch (error) {
      return ResponseUtils.createErrorResponse(error.message, 400);
    }

    // Get user info from Zoom
    let zoomUser: ZoomUser;
    try {
      zoomUser = await ZoomApiService.getUserInfo(tokenData.access_token);
      console.log('Got Zoom user info:', { email: zoomUser.email, id: zoomUser.id });
    } catch (error) {
      return ResponseUtils.createErrorResponse(error.message, 400);
    }

    // Encrypt tokens and prepare connection data
    const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    const userKey = user.id + user.email;
    
    const encryptedAccessToken = await SimpleTokenEncryption.encryptToken(tokenData.access_token, userKey);
    const encryptedRefreshToken = await SimpleTokenEncryption.encryptToken(tokenData.refresh_token, userKey);

    const connectionData: ConnectionData = {
      user_id: user.id,
      zoom_user_id: zoomUser.id,
      zoom_account_id: zoomUser.account_id || zoomUser.id,
      zoom_email: zoomUser.email,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: tokenExpiresAt,
      connection_status: 'active',
      scopes: tokenData.scope ? tokenData.scope.split(' ') : ['webinar:read:admin', 'user:read:admin'],
      is_primary: true,
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
      zoom_account_type: zoomUser.type === 1 ? 'Basic' : zoomUser.type === 2 ? 'Pro' : 'Business'
    };

    // Save connection to database
    try {
      await dbService.unsetPrimaryConnections(user.id);
      const connection = await dbService.saveConnection(connectionData);
      
      console.log('Connection saved successfully:', connection.id);

      return ResponseUtils.createSuccessResponse({ 
        success: true, 
        connection: {
          id: connection.id,
          zoom_email: connection.zoom_email,
          zoom_account_type: connection.zoom_account_type
        }
      });
    } catch (error) {
      return ResponseUtils.createErrorResponse(error.message, 500);
    }

  } catch (error) {
    console.error('Unexpected error in OAuth exchange:', error);
    return ResponseUtils.createErrorResponse('Internal server error', 500);
  }
});
