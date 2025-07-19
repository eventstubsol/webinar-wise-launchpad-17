
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
 * Replaces all render.com functionality with a single, simple service
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
   * Test connection by attempting to validate credentials
   */
  static async testConnection(connectionId: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Get connection from database
      const { data: connection, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (error || !connection) {
        return {
          success: false,
          message: 'Connection not found'
        };
      }

      // Simple validation - check if we have required fields
      if (!connection.access_token || !connection.zoom_user_id) {
        return {
          success: false,
          message: 'Invalid connection - missing required fields'
        };
      }

      // Check token expiration
      const tokenExpiresAt = new Date(connection.token_expires_at);
      const now = new Date();
      const isExpired = tokenExpiresAt <= now;

      if (isExpired) {
        return {
          success: false,
          message: 'Access token has expired. Please reconnect your Zoom account.'
        };
      }

      return {
        success: true,
        message: 'Connection is valid',
        details: {
          connectionType: connection.connection_type,
          accountId: connection.zoom_account_id,
          email: connection.zoom_email,
          tokenExpiresAt: connection.token_expires_at
        }
      };

    } catch (error) {
      console.error('Test connection error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}
