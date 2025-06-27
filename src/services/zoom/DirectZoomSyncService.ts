import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Temporary Direct Zoom Sync Service
 * This bypasses the Render backend and syncs directly via Supabase
 * Use this while Render backend authorization is being fixed
 */
class DirectZoomSyncService {
  async syncWebinars(connectionId: string) {
    console.log('🚀 Using Direct Sync (bypassing Render backend)...');
    
    try {
      // Show info message
      toast.info('Using direct sync mode while backend is being fixed', {
        duration: 5000
      });

      // Get the connection details
      const { data: connection, error: connError } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connError || !connection) {
        throw new Error('Failed to fetch connection details');
      }

      // Get user's Zoom credentials
      const { data: credentials, error: credError } = await supabase
        .from('zoom_credentials')
        .select('*')
        .eq('user_id', connection.user_id)
        .single();

      if (credError || !credentials) {
        throw new Error('No Zoom credentials found. Please reconnect your Zoom account.');
      }

      // Create sync log
      const { data: syncLog, error: logError } = await supabase
        .from('zoom_sync_logs')
        .insert({
          connection_id: connectionId,
          sync_type: 'manual',
          status: 'running',
          started_at: new Date().toISOString(),
          total_items: 0,
          processed_items: 0
        })
        .select()
        .single();

      if (logError || !syncLog) {
        throw new Error('Failed to create sync log');
      }

      toast.loading('Syncing webinars directly...', { id: 'direct-sync' });

      // Call the Supabase Edge Function directly
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId,
          syncType: 'webinars',
          credentials: {
            account_id: credentials.account_id,
            client_id: credentials.client_id,
            client_secret: credentials.client_secret
          }
        }
      });

      if (error) {
        // Update sync log with error
        await supabase
          .from('zoom_sync_logs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', syncLog.id);

        throw error;
      }

      // Update sync log with success
      await supabase
        .from('zoom_sync_logs')
        .update({
          status: 'completed',
          total_items: data?.webinarsCount || 0,
          processed_items: data?.webinarsCount || 0,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      toast.success(`Synced ${data?.webinarsCount || 0} webinars successfully!`, { 
        id: 'direct-sync' 
      });

      return {
        success: true,
        data: data,
        syncId: syncLog.id
      };

    } catch (error: any) {
      console.error('Direct sync error:', error);
      toast.error(error.message || 'Direct sync failed', { id: 'direct-sync' });
      
      return {
        success: false,
        error: error.message || 'Direct sync failed'
      };
    }
  }

  async testConnection(connectionId: string) {
    try {
      const { data: connection, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (error || !connection) {
        return {
          success: false,
          error: 'Connection not found'
        };
      }

      return {
        success: true,
        data: connection
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const DirectZoomSync = new DirectZoomSyncService();
