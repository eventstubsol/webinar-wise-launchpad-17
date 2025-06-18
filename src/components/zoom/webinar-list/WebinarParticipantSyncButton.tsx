
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, RefreshCw, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WebinarParticipantSyncButtonProps {
  webinar: {
    id: string;
    webinar_id: string;
    title: string;
    status: string;
    participant_sync_status: string | null;
    participant_sync_error: string | null;
    participant_sync_attempted_at: string | null;
  };
  connectionId: string;
  onSyncComplete?: () => void;
}

export const WebinarParticipantSyncButton: React.FC<WebinarParticipantSyncButtonProps> = ({
  webinar,
  connectionId,
  onSyncComplete
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetrySyncParticipants = async () => {
    if (!webinar.webinar_id || !connectionId) {
      toast.error('Missing webinar ID or connection ID');
      return;
    }

    setIsRetrying(true);
    
    try {
      console.log(`🔄 Manually retrying participant sync for webinar ${webinar.webinar_id}`);
      
      // Reset status to pending before retry
      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'pending',
          participant_sync_error: null,
          participant_sync_attempted_at: new Date().toISOString()
        })
        .eq('id', webinar.id);

      if (updateError) {
        console.error('Failed to reset sync status:', updateError);
        toast.error('Failed to reset sync status');
        return;
      }

      // Trigger participant sync via edge function
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId: connectionId,
          syncType: 'single',
          webinarId: webinar.webinar_id,
          options: {
            forceParticipantSync: true,
            verboseLogging: true
          }
        }
      });

      if (error) {
        console.error('Failed to trigger participant sync:', error);
        toast.error(`Failed to sync participants: ${error.message}`);
        return;
      }

      console.log('✅ Participant sync triggered successfully:', data);
      toast.success('Participant sync started - check back in a few moments');
      
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Error during participant sync retry:', error);
      toast.error('Failed to retry participant sync');
    } finally {
      setIsRetrying(false);
    }
  };

  const getSyncStatusInfo = () => {
    const status = webinar.participant_sync_status;
    const hasError = !!webinar.participant_sync_error;
    
    switch (status) {
      case 'synced':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          badge: <Badge variant="secondary" className="text-xs">Synced</Badge>,
          color: 'text-green-600',
          showRetry: false,
          tooltip: 'Participants successfully synced'
        };
      case 'failed':
        return {
          icon: <XCircle className="h-3 w-3" />,
          badge: <Badge variant="destructive" className="text-xs">Failed</Badge>,
          color: 'text-red-600',
          showRetry: true,
          tooltip: webinar.participant_sync_error || 'Participant sync failed'
        };
      case 'no_participants':
        return {
          icon: <Users className="h-3 w-3" />,
          badge: <Badge variant="outline" className="text-xs">No Participants</Badge>,
          color: 'text-gray-500',
          showRetry: true,
          tooltip: 'No participants found - retry if webinar had attendees'
        };
      case 'pending':
        return {
          icon: <Clock className="h-3 w-3" />,
          badge: <Badge variant="default" className="text-xs">Pending</Badge>,
          color: 'text-blue-600',
          showRetry: false,
          tooltip: 'Participant sync is pending'
        };
      case 'not_applicable':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          badge: <Badge variant="outline" className="text-xs">N/A</Badge>,
          color: 'text-gray-400',
          showRetry: webinar.status?.toLowerCase() === 'finished',
          tooltip: webinar.status?.toLowerCase() === 'finished' 
            ? 'Finished webinar - retry participant sync' 
            : 'Future webinar - no participants yet'
        };
      default:
        return {
          icon: <Users className="h-3 w-3" />,
          badge: <Badge variant="outline" className="text-xs">Unknown</Badge>,
          color: 'text-gray-400',
          showRetry: true,
          tooltip: 'Unknown sync status - retry sync'
        };
    }
  };

  const syncInfo = getSyncStatusInfo();

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 ${syncInfo.color}`}>
              {syncInfo.icon}
              {syncInfo.badge}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>{syncInfo.tooltip}</p>
              {webinar.participant_sync_attempted_at && (
                <p className="text-xs text-muted-foreground">
                  Last attempt: {new Date(webinar.participant_sync_attempted_at).toLocaleString()}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {syncInfo.showRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetrySyncParticipants}
          disabled={isRetrying}
          className="h-7 px-2"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Syncing...' : 'Retry'}
        </Button>
      )}
    </div>
  );
};
