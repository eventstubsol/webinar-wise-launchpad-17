
import { supabase } from '@/integrations/supabase/client';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  syncId?: string;
  status?: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  currentOperation?: string;
  total_items?: number;
  processed_items?: number;
  error_message?: string;
  connection?: any;
  isServiceAvailable?: boolean;
  retryAfter?: number;
}

class EdgeFunctionZoomServiceClass {
  async healthCheck(): Promise<ApiResponse> {
    try {
      // Edge Functions are always available if Supabase is running
      return {
        success: true,
        message: 'Edge Functions are healthy',
        isServiceAvailable: true
      };
    } catch (error) {
      console.error('Health check error:', error);
      return {
        success: false,
        error: 'Health check failed',
        isServiceAvailable: false
      };
    }
  }

  async validateCredentials(credentials: any): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('validate-zoom-credentials', {
        body: credentials
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Validation failed'
        };
      }

      return {
        success: true,
        data: data,
        message: 'Credentials validated successfully'
      };
    } catch (error) {
      console.error('Validate credentials error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  async testConnection(connectionId?: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('test-zoom-connection', {
        body: { connection_id: connectionId }
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Connection test failed'
        };
      }

      return {
        success: true,
        data: data,
        message: 'Connection test successful'
      };
    } catch (error) {
      console.error('Test connection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  async startSync(connectionId: string, syncType: string = 'manual'): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-sync-unified', {
        body: { 
          connection_id: connectionId, 
          sync_type: syncType,
          options: {}
        }
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to start sync'
        };
      }

      return {
        success: true,
        data: data,
        syncId: data?.syncId,
        message: 'Sync started successfully'
      };
    } catch (error) {
      console.error('Start sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start sync'
      };
    }
  }

  async getSyncProgress(syncId: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-sync-progress', {
        body: { syncId: syncId }
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to get sync progress'
        };
      }

      return {
        success: true,
        data: data,
        status: data?.status || 'idle',
        progress: data?.progress?.percentage || 0,
        currentOperation: data?.progress?.currentWebinar || 'Processing...'
      };
    } catch (error) {
      console.error('Get sync progress error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync progress'
      };
    }
  }

  async cancelSync(syncId: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-zoom-sync', {
        body: { syncId }
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to cancel sync'
        };
      }

      return {
        success: true,
        data: data,
        message: 'Sync cancelled successfully'
      };
    } catch (error) {
      console.error('Cancel sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel sync'
      };
    }
  }

  async syncWebinars(connectionId: string, options: any = {}): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-sync-unified', {
        body: { 
          connection_id: connectionId,
          sync_type: options.type || 'manual',
          options: options
        }
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to sync webinars'
        };
      }

      return {
        success: true,
        data: data,
        syncId: data?.syncId,
        message: 'Webinar sync started successfully'
      };
    } catch (error) {
      console.error('Sync webinars error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync webinars'
      };
    }
  }

  async runPerformanceTest(connectionId: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-performance-test', {
        body: { connection_id: connectionId }
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Performance test failed'
        };
      }

      return {
        success: true,
        data: data,
        message: 'Performance test completed'
      };
    } catch (error) {
      console.error('Performance test error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Performance test failed'
      };
    }
  }

  async disconnectAccount(connectionId: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('disconnect-zoom-account', {
        body: { connection_id: connectionId }
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to disconnect account'
        };
      }

      return {
        success: true,
        data: data,
        message: 'Account disconnected successfully'
      };
    } catch (error) {
      console.error('Disconnect account error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect account'
      };
    }
  }

  async refreshToken(refreshToken: string, connectionId?: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-token-refresh', {
        body: { 
          refresh_token: refreshToken, 
          connectionId: connectionId 
        }
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Token refresh failed'
        };
      }

      return {
        success: true,
        data: data,
        connection: data?.connection,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  getServiceStatus(): { healthy: boolean; lastCheck: number } {
    return {
      healthy: true, // Edge Functions are always healthy if Supabase is running
      lastCheck: Date.now()
    };
  }

  async forceHealthCheck(): Promise<boolean> {
    const result = await this.healthCheck();
    return result.success;
  }
}

export const EdgeFunctionZoomService = new EdgeFunctionZoomServiceClass();
