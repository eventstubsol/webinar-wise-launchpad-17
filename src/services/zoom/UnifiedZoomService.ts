
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncResponse {
  success: boolean;
  syncId?: string;
  message?: string;
  error?: string;
}

interface ProgressResponse {
  success: boolean;
  status?: string;
  progress?: number;
  currentOperation?: string;
  processed_items?: number;
  processedCount?: number;
  total_items?: number;
  error_message?: string;
  message?: string;
}

/**
 * Unified Zoom Service using only Supabase Edge Functions
 * Uses the streamlined set of edge functions after cleanup
 */
export class UnifiedZoomService {
  /**
   * Start a sync process
   */
  static async startSync(connectionId: string, syncType: string = 'incremental', webinarId?: string): Promise<SyncResponse> {
    try {
      console.log(`🚀 Starting unified sync:`, { connectionId, syncType, webinarId });
      
      const { data, error } = await supabase.functions.invoke('zoom-sync-unified', {
        body: {
          action: 'start',
          connectionId,
          syncType,
          webinarId
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to start sync');
      }

      if (!data.success) {
        throw new Error(data.error || 'Sync failed to start');
      }

      return {
        success: true,
        syncId: data.syncId,
        message: data.message || 'Sync started successfully'
      };

    } catch (error) {
      console.error('Start sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get sync progress
   */
  static async getSyncProgress(syncId: string): Promise<ProgressResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-sync-unified', {
        body: {
          action: 'progress',
          syncId
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get sync progress');
      }

      return data;

    } catch (error) {
      console.error('Get progress error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cancel a sync
   */
  static async cancelSync(syncId: string): Promise<SyncResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-sync-unified', {
        body: {
          action: 'cancel',
          syncId
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to cancel sync');
      }

      return {
        success: true,
        message: data.message || 'Sync cancelled successfully'
      };

    } catch (error) {
      console.error('Cancel sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test connection using zoom-test-fetch function
   */
  static async testConnection(connectionId: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-test-fetch');

      if (error) {
        return {
          success: false,
          message: error.message || 'Connection test failed'
        };
      }

      if (!data.success) {
        return {
          success: false,
          message: data.message || 'Connection test failed',
          details: data.details
        };
      }

      return {
        success: true,
        message: data.message || 'Connection is valid',
        details: data.details
      };

    } catch (error) {
      console.error('Test connection error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Refresh zoom token using zoom-token-refresh function
   */
  static async refreshToken(connectionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-token-refresh', {
        body: { connectionId }
      });

      if (error) {
        return {
          success: false,
          message: error.message || 'Token refresh failed'
        };
      }

      return {
        success: data.success,
        message: data.success ? 'Token refreshed successfully' : 'Token refresh failed'
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }
}
