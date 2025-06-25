
import { ZoomCredentials } from '@/types/zoomCredentials';
import { ZoomConnection } from '@/types/zoom';

interface RenderZoomAuthResponse {
  success: boolean;
  connection?: ZoomConnection;
  error?: string;
}

interface RenderSyncResponse {
  success: boolean;
  syncId?: string;
  message?: string;
  error?: string;
}

/**
 * Service for handling Zoom authentication and operations via Render instead of Supabase Edge Functions
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
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          account_id: credentials.account_id,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          user_id: credentials.user_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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
  static async startSync(connectionId: string, syncType: 'initial' | 'incremental' = 'incremental'): Promise<RenderSyncResponse> {
    try {
      const response = await fetch(`${this.RENDER_API_URL}/api/zoom/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          connection_id: connectionId,
          sync_type: syncType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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

  /**
   * Get sync progress via Render service
   */
  static async getSyncProgress(syncId: string): Promise<{
    success: boolean;
    progress?: number;
    status?: string;
    currentOperation?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.RENDER_API_URL}/api/zoom/sync/${syncId}/progress`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting sync progress via Render:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Cancel sync via Render service
   */
  static async cancelSync(syncId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.RENDER_API_URL}/api/zoom/sync/${syncId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error canceling sync via Render:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get authentication token for Render API calls
   * This would typically be a JWT token or API key
   */
  private static async getAuthToken(): Promise<string> {
    // In a real implementation, you would get this from your auth system
    // For now, we'll use a placeholder
    return 'your-api-token';
  }

  /**
   * Health check for Render service
   */
  static async healthCheck(): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const response = await fetch(`${this.RENDER_API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        status: data.status || 'healthy'
      };
    } catch (error) {
      console.error('Error checking Render service health:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Disconnect Zoom account via Render service
   */
  static async disconnectAccount(connectionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.RENDER_API_URL}/api/zoom/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          connection_id: connectionId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error disconnecting Zoom account via Render:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
