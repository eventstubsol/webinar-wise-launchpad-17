
import { ZoomCredentials, ZoomConnection } from '@/types/zoom';

export interface RenderZoomAuthResponse {
  success: boolean;
  connection?: ZoomConnection;
  error?: string;
  message?: string;
}

export interface RenderZoomSyncResponse {
  success: boolean;
  syncId?: string;
  error?: string;
  message?: string;
}

export interface RenderZoomProgressResponse {
  success: boolean;
  progress?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'no_data';
  currentOperation?: string;
  error?: string;
}

export interface RenderZoomTestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface RenderZoomHealthResponse {
  success: boolean;
  message?: string;
  status?: string;
  uptime?: number;
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

  static async testConnection(): Promise<RenderZoomTestResponse> {
    try {
      console.log('RenderZoomService: Testing connection...');
      
      const response = await fetch(`${this.RENDER_API_BASE}/test-connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Connection test failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return {
        success: result.success || false,
        message: result.message || 'Connection test completed',
        error: result.error
      };
    } catch (error) {
      console.error('RenderZoomService: Connection test error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during connection test',
        message: 'Connection test failed'
      };
    }
  }

  static async healthCheck(): Promise<RenderZoomHealthResponse> {
    try {
      const response = await fetch(`${this.RENDER_API_BASE}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message || 'Service is healthy',
        status: result.status || 'healthy',
        uptime: result.uptime
      };
    } catch (error) {
      console.error('RenderZoomService: Health check error:', error);
      return {
        success: false,
        message: 'Service unavailable',
        status: 'unhealthy'
      };
    }
  }

  static async startSync(connectionId: string, syncType: 'initial' | 'incremental'): Promise<RenderZoomSyncResponse> {
    try {
      console.log('RenderZoomService: Starting sync...');
      
      const response = await fetch(`${this.RENDER_API_BASE}/start-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_id: connectionId,
          sync_type: syncType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sync start failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return {
        success: result.success || false,
        syncId: result.syncId || result.sync_id,
        message: result.message || 'Sync started successfully',
        error: result.error
      };
    } catch (error) {
      console.error('RenderZoomService: Start sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during sync start',
        message: 'Failed to start sync'
      };
    }
  }

  static async getSyncProgress(syncId: string): Promise<RenderZoomProgressResponse> {
    try {
      const response = await fetch(`${this.RENDER_API_BASE}/sync-progress/${syncId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Progress check failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return {
        success: result.success || false,
        progress: result.progress || 0,
        status: result.status || 'pending',
        currentOperation: result.currentOperation || result.current_operation,
        error: result.error
      };
    } catch (error) {
      console.error('RenderZoomService: Get sync progress error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during progress check'
      };
    }
  }

  static async cancelSync(syncId: string): Promise<RenderZoomSyncResponse> {
    try {
      const response = await fetch(`${this.RENDER_API_BASE}/cancel-sync/${syncId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cancel sync failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return {
        success: result.success || false,
        message: result.message || 'Sync cancelled successfully',
        error: result.error
      };
    } catch (error) {
      console.error('RenderZoomService: Cancel sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during sync cancellation',
        message: 'Failed to cancel sync'
      };
    }
  }

  static async syncWebinars(connectionId: string, options: {
    type?: 'manual' | 'incremental' | 'progressive';
    webinarId?: string;
    debug?: boolean;
    testMode?: boolean;
    priority?: 'low' | 'normal' | 'high';
  } = {}): Promise<RenderZoomSyncResponse> {
    try {
      console.log('RenderZoomService: Syncing webinars...');
      
      const response = await fetch(`${this.RENDER_API_BASE}/sync-webinars`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_id: connectionId,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webinar sync failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return {
        success: result.success || false,
        syncId: result.syncId || result.sync_id,
        message: result.message || 'Webinar sync started successfully',
        error: result.error
      };
    } catch (error) {
      console.error('RenderZoomService: Sync webinars error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during webinar sync',
        message: 'Failed to sync webinars'
      };
    }
  }

  static async runPerformanceTest(connectionId: string): Promise<RenderZoomTestResponse> {
    try {
      const response = await fetch(`${this.RENDER_API_BASE}/performance-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_id: connectionId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Performance test failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return {
        success: result.success || false,
        message: result.message || 'Performance test completed',
        error: result.error
      };
    } catch (error) {
      console.error('RenderZoomService: Performance test error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during performance test',
        message: 'Performance test failed'
      };
    }
  }

  static async disconnectAccount(connectionId: string): Promise<RenderZoomSyncResponse> {
    try {
      const response = await fetch(`${this.RENDER_API_BASE}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_id: connectionId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Disconnect failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return {
        success: result.success || false,
        message: result.message || 'Account disconnected successfully',
        error: result.error
      };
    } catch (error) {
      console.error('RenderZoomService: Disconnect error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during disconnect',
        message: 'Failed to disconnect account'
      };
    }
  }
}
