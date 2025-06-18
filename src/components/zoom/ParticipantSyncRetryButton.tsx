
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useZoomConnection } from '@/hooks/useZoomConnection';

export const ParticipantSyncRetryButton: React.FC = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const { connection } = useZoomConnection();

  const handleRetryAllFailedParticipants = async () => {
    if (!connection?.id) {
      toast.error('No Zoom connection found');
      return;
    }

    setIsRetrying(true);
    
    try {
      console.log('🔄 Retrying all failed participant syncs after RLS fix');
      
      // Reset all failed participant sync statuses to pending
      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'pending',
          participant_sync_error: null,
          participant_sync_attempted_at: new Date().toISOString()
        })
        .eq('connection_id', connection.id)
        .in('participant_sync_status', ['failed', 'no_participants'])
        .eq('status', 'finished');

      if (updateError) {
        console.error('Failed to reset sync statuses:', updateError);
        toast.error('Failed to reset sync statuses');
        return;
      }

      // Trigger bulk participant sync
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId: connection.id,
          syncType: 'participants_only',
          options: {
            forceSync: true,
            verboseLogging: true,
            skipEligibilityCheck: true
          }
        }
      });

      if (error) {
        console.error('Failed to trigger bulk participant sync:', error);
        toast.error(`Failed to sync participants: ${error.message}`);
        return;
      }

      console.log('✅ Bulk participant sync triggered successfully:', data);
      toast.success('Participant sync started for all finished webinars - participants should appear shortly!');
      
    } catch (error) {
      console.error('Error during bulk participant sync retry:', error);
      toast.error('Failed to retry participant sync');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleRetryAllFailedParticipants}
      disabled={isRetrying}
      className="mb-4"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
      <Users className="h-4 w-4 mr-2" />
      {isRetrying ? 'Syncing Participants...' : 'Retry All Participant Syncs'}
    </Button>
  );
};
