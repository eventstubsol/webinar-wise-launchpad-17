
import { ZoomCredentials } from '@/types/zoomCredentials';
import { ZoomConnection } from '@/types/zoom';
import { supabase } from '@/integrations/supabase/client';

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

interface RenderSyncProgressResponse {
  success: boolean;
  progress?: number;
  status?: string;
  currentOperation?: string;
  error?: string;
}

interface RenderHealthResponse {
  success: boolean;
  status?: string;
  error?: string;
}

interface RenderTestResponse {
  success: boolean;
  message: string;
}

/**
 * Service for handling Zoom authentication and operations via Render.com API
 */
export class RenderZoomService {
  private static RENDER_API_URL = 'https://webinar-wise-api.onrender.com';

  /**
   * Get authentication token for Render API calls
   */
  private static async getAuthToken(): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication session found');
      }
      return session.access_token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw new Error('Authentication required');
    }
  }

  /**
   * Make authenticated request to Render API
   */
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.RENDER_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Validate Zoom credentials via Render service
   */
  static async validateCredentials(credentials: ZoomCredentials): Promise<RenderZoomAuthResponse> {
    try {
      const data = await this.makeRequest('/api/zoom/validate', {
        method: 'POST',
        body: JSON.stringify({
          account_id: credentials.account_id,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          user_id: credentials.user_id
        }),
      });
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
  static async testConnection(): Promise<RenderTestResponse> {
    try {
      const data = await this.makeRequest('/api/zoom/test');
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
      const data = await this.makeRequest('/api/zoom/sync', {
        method: 'POST',
        body: JSON.stringify({
          connection_id: connectionId,
          sync_type: syncType
        }),
      });
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
  static async getSyncProgress(syncId: string): Promise<RenderSyncProgressResponse> {
    try {
      const data = await this.makeRequest(`/api/zoom/sync/${syncId}/progress`);
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
      const data = await this.makeRequest(`/api/zoom/sync/${syncId}/cancel`, {
        method: 'POST',
      });
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
   * Health check for Render service
   */
  static async healthCheck(): Promise<RenderHealthResponse> {
    try {
      const response = await fetch(`${this.RENDER_API_URL}/health`);
      
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
      const data = await this.makeRequest('/api/zoom/disconnect', {
        method: 'POST',
        body: JSON.stringify({
          connection_id: connectionId
        }),
      });
      return data;
    } catch (error) {
      console.error('Error disconnecting Zoom account via Render:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Sync webinars via Render service
   */
  static async syncWebinars(connectionId: string, options: {
    type?: 'manual' | 'progressive' | 'incremental';
    webinarId?: string;
    debug?: boolean;
    testMode?: boolean;
    priority?: 'low' | 'normal' | 'high';
  } = {}): Promise<RenderSyncResponse> {
    try {
      const data = await this.makeRequest('/api/zoom/sync/webinars', {
        method: 'POST',
        body: JSON.stringify({
          connection_id: connectionId,
          sync_type: options.type || 'manual',
          webinar_id: options.webinarId,
          debug: options.debug || false,
          test_mode: options.testMode || false,
          priority: options.priority || 'normal'
        }),
      });
      return data;
    } catch (error) {
      console.error('Error syncing webinars via Render:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Run performance test via Render service
   */
  static async runPerformanceTest(connectionId: string): Promise<RenderSyncResponse> {
    try {
      const data = await this.makeRequest('/api/zoom/test/performance', {
        method: 'POST',
        body: JSON.stringify({
          connection_id: connectionId
        }),
      });
      return data;
    } catch (error) {
      console.error('Error running performance test via Render:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
