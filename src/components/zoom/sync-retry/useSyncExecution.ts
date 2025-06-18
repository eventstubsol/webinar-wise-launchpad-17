
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import type { SyncStrategy } from './types';

export const useSyncExecution = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { connection } = useZoomConnection();

  const executeSync = async (strategy: SyncStrategy) => {
    setIsSyncing(true);
    
    try {
      console.log('🚀 Executing sync strategy:', strategy.syncType);
      
      // Prepare sync request based on strategy
      const syncRequest: any = {
        connectionId: connection.id,
        syncType: strategy.syncType,
        options: {
          forceSync: true,
          verboseLogging: true
        }
      };

      // Add webinarIds only if we have them and it's a participants_only sync
      if (strategy.syncType === 'participants_only' && strategy.webinarIds && strategy.webinarIds.length > 0) {
        syncRequest.webinarIds = strategy.webinarIds;
        
        // Reset sync statuses for these specific webinars
        const { error: updateError } = await supabase
          .from('zoom_webinars')
          .update({
            participant_sync_status: 'pending',
            participant_sync_error: null,
            participant_sync_attempted_at: new Date().toISOString()
          })
          .eq('connection_id', connection.id)
          .in('webinar_id', strategy.webinarIds);

        if (updateError) {
          console.error('Failed to reset sync statuses:', updateError);
          toast.error('Failed to reset sync statuses');
          return;
        }
      }

      console.log('Sync request payload:', JSON.stringify(syncRequest, null, 2));

      // Execute the sync
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: syncRequest
      });

      if (error) {
        console.error('Sync failed:', error);
        toast.error(`Sync failed: ${error.message}`);
        return;
      }

      console.log('✅ Sync started successfully:', data);
      toast.success(`${strategy.description} - Check back in a few moments!`);
      
    } catch (error) {
      console.error('Error during sync execution:', error);
      toast.error('Failed to execute sync');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    executeSync
  };
};
