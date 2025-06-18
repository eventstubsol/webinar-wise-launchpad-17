
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const ParticipantSyncRetryButton: React.FC = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [eligibleWebinars, setEligibleWebinars] = useState<any[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { connection } = useZoomConnection();

  const findEligibleWebinars = async () => {
    if (!connection?.id) {
      toast.error('No Zoom connection found');
      return [];
    }

    setIsQuerying(true);
    
    try {
      console.log('🔍 Finding webinars eligible for participant sync retry');
      
      // Query for finished webinars that need participant sync
      const { data: webinars, error } = await supabase
        .from('zoom_webinars')
        .select('id, webinar_id, topic, status, participant_sync_status, participant_sync_error')
        .eq('connection_id', connection.id)
        .eq('status', 'finished')
        .in('participant_sync_status', ['failed', 'no_participants', 'not_applicable']);

      if (error) {
        console.error('Failed to query eligible webinars:', error);
        toast.error('Failed to find webinars for sync');
        return [];
      }

      console.log(`Found ${webinars?.length || 0} webinars eligible for participant sync`);
      return webinars || [];
      
    } catch (error) {
      console.error('Error finding eligible webinars:', error);
      toast.error('Error finding webinars for sync');
      return [];
    } finally {
      setIsQuerying(false);
    }
  };

  const handleFindAndConfirm = async () => {
    const webinars = await findEligibleWebinars();
    setEligibleWebinars(webinars);
    
    if (webinars.length === 0) {
      toast.info('No webinars found that need participant sync retry');
      return;
    }
    
    setShowConfirmDialog(true);
  };

  const handleConfirmedRetry = async () => {
    if (eligibleWebinars.length === 0) {
      toast.error('No webinars selected for sync');
      return;
    }

    setIsRetrying(true);
    setShowConfirmDialog(false);
    
    try {
      console.log('🔄 Starting bulk participant sync with webinar IDs');
      
      // Extract Zoom webinar IDs for the sync request
      const webinarIds = eligibleWebinars.map(w => w.webinar_id);
      console.log('Webinar IDs for sync:', webinarIds);
      
      // Reset sync statuses to pending before retry
      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'pending',
          participant_sync_error: null,
          participant_sync_attempted_at: new Date().toISOString()
        })
        .eq('connection_id', connection.id)
        .in('webinar_id', webinarIds);

      if (updateError) {
        console.error('Failed to reset sync statuses:', updateError);
        toast.error('Failed to reset sync statuses');
        return;
      }

      // Trigger participant sync with webinar IDs
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId: connection.id,
          syncType: 'participants_only',
          webinarIds: webinarIds, // Include the required webinar IDs
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
      toast.success(`Participant sync started for ${webinarIds.length} webinars - participants should appear shortly!`);
      
      // Clear the eligible webinars list
      setEligibleWebinars([]);
      
    } catch (error) {
      console.error('Error during bulk participant sync retry:', error);
      toast.error('Failed to retry participant sync');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <>
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogTrigger asChild>
          <Button
            onClick={handleFindAndConfirm}
            disabled={isQuerying || isRetrying}
            className="mb-4"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isQuerying ? 'animate-spin' : ''}`} />
            <Users className="h-4 w-4 mr-2" />
            {isQuerying ? 'Finding Webinars...' : 'Retry All Participant Syncs'}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Confirm Bulk Participant Sync
            </DialogTitle>
            <DialogDescription>
              You are about to retry participant sync for {eligibleWebinars.length} webinar(s).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Webinars to sync:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  {eligibleWebinars.slice(0, 5).map(webinar => (
                    <li key={webinar.id} className="truncate">
                      • {webinar.topic} ({webinar.participant_sync_status})
                    </li>
                  ))}
                  {eligibleWebinars.length > 5 && (
                    <li className="text-muted-foreground">
                      ... and {eligibleWebinars.length - 5} more
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isRetrying}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmedRetry}
              disabled={isRetrying}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Syncing...' : `Sync ${eligibleWebinars.length} Webinars`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
