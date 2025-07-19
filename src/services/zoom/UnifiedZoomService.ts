
import { supabase } from '@/integrations/supabase/client';

export interface SyncResult {
  success: boolean;
  syncId?: string;
  error?: string;
  requiresReconnection?: boolean;
}

export interface SyncProgressResult {
  success: boolean;
  progress?: number;
  status?: string;
  currentOperation?: string;
  error?: string;
}

export interface TestConnectionResult {
  success: boolean;
  userInfo?: any;
  error?: string;
  requiresReconnection?: boolean;
}

/**
 * Unified service for Zoom operations using Supabase Edge Functions
 */
export class UnifiedZoomService {
  /**
   * Start a sync operation with enhanced error handling
   */
  static async startSync(
    connectionId: string, 
    syncType: 'initial' | 'incremental' | 'manual',
    webinarId?: string
  ): Promise<SyncResult> {
    try {
      console.log(`🚀 Starting unified sync: ${JSON.stringify({ connectionId, syncType, webinarId })}`);
      
      const requestBody = {
        connectionId,
        syncType,
        webinarId,
        requestId: crypto.randomUUID()
      };

      const { data, error } = await supabase.functions.invoke('zoom-sync-unified', {
        body: requestBody
      });

      if (error) {
        console.error('❌ Unified sync error:', error);
        
        // Check for token-related errors
        if (error.message?.includes('Access token is expired') || 
            error.message?.includes('401') ||
            error.message?.includes('token')) {
          return {
            success: false,
            error: 'Access token expired. Please reconnect your Zoom account.',
            requiresReconnection: true
          };
        }
        
        return {
          success: false,
          error: error.message || 'Failed to start sync'
        };
      }

      if (!data.success) {
        console.error('❌ Sync failed:', data.error);
        
        // Check for token-related errors in response
        if (data.error?.includes('Access token is expired') || 
            data.error?.includes('401') ||
            data.error?.includes('token')) {
          return {
            success: false,
            error: 'Access token expired. Please reconnect your Zoom account.',
            requiresReconnection: true
          };
        }
        
        return {
          success: false,
          error: data.error || 'Sync failed'
        };
      }

      console.log('✅ Sync started successfully:', data.syncId);
      return {
        success: true,
        syncId: data.syncId
      };

    } catch (error) {
      console.error('❌ Start sync error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Access token is expired') || 
            error.message.includes('401')) {
          return {
            success: false,
            error: 'Access token expired. Please reconnect your Zoom account.',
            requiresReconnection: true
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Cancel a sync operation
   */
  static async cancelSync(syncId: string): Promise<SyncResult> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-sync-unified', {
        body: { action: 'cancel', syncId }
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to cancel sync'
        };
      }

      return {
        success: data.success,
        error: data.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get sync progress
   */
  static async getSyncProgress(syncId: string): Promise<SyncProgressResult> {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-sync-progress', {
        body: { syncId }
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to get sync progress'
        };
      }

      return {
        success: true,
        progress: data.progress,
        status: data.status,
        currentOperation: data.currentOperation
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Test Zoom connection with enhanced error handling
   */
  static async testConnection(connectionId: string): Promise<TestConnectionResult> {
    try {
      console.log(`🔍 Testing connection: ${connectionId}`);
      
      const { data, error } = await supabase.functions.invoke('zoom-test-fetch', {
        body: { connectionId, action: 'test' }
      });

      if (error) {
        console.error('❌ Connection test error:', error);
        
        // Check for token-related errors
        if (error.message?.includes('Access token is expired') || 
            error.message?.includes('401') ||
            error.message?.includes('token')) {
          return {
            success: false,
            error: 'Access token expired. Please reconnect your Zoom account.',
            requiresReconnection: true
          };
        }
        
        return {
          success: false,
          error: error.message || 'Connection test failed'
        };
      }

      if (!data.success) {
        console.error('❌ Connection test failed:', data.error);
        
        // Check for token-related errors in response
        if (data.error?.includes('Access token is expired') || 
            data.error?.includes('401') ||
            data.error?.includes('token')) {
          return {
            success: false,
            error: 'Access token expired. Please reconnect your Zoom account.',
            requiresReconnection: true
          };
        }
        
        return {
          success: false,
          error: data.error || 'Connection test failed'
        };
      }

      console.log('✅ Connection test successful');
      return {
        success: true,
        userInfo: data.userInfo
      };

    } catch (error) {
      console.error('❌ Test connection error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Access token is expired') || 
            error.message.includes('401')) {
          return {
            success: false,
            error: 'Access token expired. Please reconnect your Zoom account.',
            requiresReconnection: true
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
