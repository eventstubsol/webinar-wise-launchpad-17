
import { ZoomCredentials, ZoomConnection } from '@/types/zoom';

export interface RenderZoomAuthResponse {
  success: boolean;
  connection?: ZoomConnection;
  error?: string;
  message?: string; // Added missing message property
}

export class RenderZoomService {
  private static readonly RENDER_API_BASE = 'https://zoom-auth-api-latest.onrender.com';

  static async validateCredentials(credentials: ZoomCredentials): Promise<RenderZoomAuthResponse> {
    try {
      console.log('RenderZoomService: Starting credential validation...');
      
      const response = await fetch(`${this.RENDER_API_BASE}/validate-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: credentials.account_id,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('RenderZoomService: API request failed:', response.status, errorText);
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('RenderZoomService: Validation response received:', result);

      return {
        success: result.success || false,
        connection: result.connection,
        error: result.error,
        message: result.message || (result.success ? 'Credentials validated successfully' : 'Validation failed')
      };
    } catch (error) {
      console.error('RenderZoomService: Validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during validation',
        message: 'Failed to validate credentials'
      };
    }
  }

  static async refreshToken(refreshToken: string): Promise<RenderZoomAuthResponse> {
    try {
      console.log('RenderZoomService: Starting token refresh...');
      
      const response = await fetch(`${this.RENDER_API_BASE}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('RenderZoomService: Token refresh failed:', response.status, errorText);
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('RenderZoomService: Token refresh response received:', result);

      return {
        success: result.success || false,
        connection: result.connection,
        error: result.error,
        message: result.message || (result.success ? 'Token refreshed successfully' : 'Token refresh failed')
      };
    } catch (error) {
      console.error('RenderZoomService: Token refresh error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during token refresh',
        message: 'Failed to refresh token'
      };
    }
  }
}
