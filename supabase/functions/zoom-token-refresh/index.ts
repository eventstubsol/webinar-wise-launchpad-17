
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ResponseUtils, CORS_HEADERS } from './response-utils.ts';
import { RefreshTokenRequest, TokenResponse } from './types.ts';
import { DatabaseService } from './database.ts';
import { ZoomApiService } from './zoom-api.ts';
import { SimpleTokenEncryption } from './encryption.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return ResponseUtils.createCorsResponse();
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return ResponseUtils.createErrorResponse('Missing Authorization header', 401);
    }
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
        return ResponseUtils.createErrorResponse('Invalid token', 401);
    }

    const { connectionId } = await req.json() as RefreshTokenRequest;
    if (!connectionId) {
      return ResponseUtils.createErrorResponse('Missing connectionId in request body', 400);
    }

    const dbService = new DatabaseService(authHeader);

    // 1. Get connection and decrypt refresh token
    const connection = await dbService.getConnection(connectionId, user.id);
    const refreshToken = await SimpleTokenEncryption.decryptToken(connection.refresh_token, user.id);

    // 2. Call Zoom to refresh tokens
    let newTokens: TokenResponse;
    try {
        newTokens = await ZoomApiService.refreshTokens(refreshToken);
    } catch(e) {
        if(e.status === 401 || e.status === 400) { // Zoom uses 400 for invalid grant
            await dbService.updateConnection(connectionId, { connection_status: 'expired' });
        }
        throw e;
    }


    // 3. Encrypt new tokens
    const encryptedAccessToken = await SimpleTokenEncryption.encryptToken(newTokens.access_token, user.id);
    const encryptedRefreshToken = await SimpleTokenEncryption.encryptToken(newTokens.refresh_token, user.id);
    const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString();

    // 4. Update connection in DB
    const updatedConnection = await dbService.updateConnection(connectionId, {
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: newExpiresAt,
      connection_status: 'active',
      updated_at: new Date().toISOString(),
    });

    return ResponseUtils.createSuccessResponse({ 
        message: 'Token refreshed successfully',
        connection: updatedConnection,
    });

  } catch (error) {
    console.error('Token refresh function error:', error);
    return ResponseUtils.createErrorResponse(error.message, error.status || 500);
  }
});
