
import { ZoomCredentials } from '@/types/zoomCredentials';
import { ZoomConnection } from '@/types/zoom';

interface RenderZoomAuthResponse {
  success: boolean;
  connection?: ZoomConnection;
  error?: string;
}

/**
 * Service for handling Zoom authentication via Render instead of Supabase Edge Functions
 */
export class RenderZoomService {
  private static RENDER_API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://your-render-service.onrender.com' 
    : 'http://localhost:3001';

  /**
   * Validate Zoom credentials via Render service
   */
  static async validateCredentials(credentials: ZoomCredentials): Promise<RenderZoomAuthResponse> {
    try {
      const response = await fetch(`${this.RENDER_API_URL}/api/zoom/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: credentials.account_id,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          user_id: credentials.user_id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error validating Zoom credentials via Render:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Test API connection via Render service
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.RENDER_API_URL}/api/zoom/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error testing Zoom connection via Render:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Start sync via Render service
   */
  static async startSync(connectionId: string, syncType: 'initial' | 'incremental' = 'incremental'): Promise<{ success: boolean; syncId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.RENDER_API_URL}/api/zoom/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_id: connectionId,
          sync_type: syncType
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error starting sync via Render:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
