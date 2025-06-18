
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, AlertCircle, CheckCircle, Info } from 'lucide-react';
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

interface WebinarSyncCandidate {
  id: string;
  webinar_id: string;
  topic: string;
  status: string;
  participant_sync_status: string;
  participant_sync_error?: string;
  start_time?: string;
}

interface SyncStrategy {
  syncType: 'participants_only' | 'incremental' | 'full_sync';
  webinarIds?: string[];
  description: string;
  webinars: WebinarSyncCandidate[];
}

export const ParticipantSyncRetryButton: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStrategy, setSyncStrategy] = useState<SyncStrategy | null>(null);
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  const { connection } = useZoomConnection();

  const analyzeSyncOptions = async (): Promise<SyncStrategy | null> => {
    if (!connection?.id) {
      toast.error('No Zoom connection found');
      return null;
    }

    setIsAnalyzing(true);
    
    try {
      console.log('🔍 Analyzing sync options for all webinars');
      
      // Get all webinars regardless of status
      const { data: allWebinars, error } = await supabase
        .from('zoom_webinars')
        .select('id, webinar_id, topic, status, participant_sync_status, participant_sync_error, start_time')
        .eq('connection_id', connection.id)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Failed to query webinars:', error);
        toast.error('Failed to analyze webinars');
        return null;
      }

      if (!allWebinars || allWebinars.length === 0) {
        toast.info('No webinars found. Try syncing webinars first.');
        return null;
      }

      // Analyze different categories of webinars
      const finishedWithFailedSync = allWebinars.filter(w => 
        w.status === 'finished' && 
        ['failed', 'no_participants'].includes(w.participant_sync_status || '')
      );

      const finishedWithoutParticipantData = allWebinars.filter(w => 
        w.status === 'finished' && 
        ['not_applicable', 'pending', null].includes(w.participant_sync_status)
      );

      const scheduledWebinars = allWebinars.filter(w => 
        w.status === 'scheduled'
      );

      console.log(`📊 Webinar Analysis:`);
      console.log(`  - Total webinars: ${allWebinars.length}`);
      console.log(`  - Finished with failed sync: ${finishedWithFailedSync.length}`);
      console.log(`  - Finished without participant data: ${finishedWithoutParticipantData.length}`);
      console.log(`  - Scheduled: ${scheduledWebinars.length}`);

      // Determine best sync strategy
      if (finishedWithFailedSync.length > 0) {
        return {
          syncType: 'participants_only',
          webinarIds: finishedWithFailedSync.map(w => w.webinar_id),
          description: `Retry participant sync for ${finishedWithFailedSync.length} finished webinar(s) with failed sync`,
          webinars: finishedWithFailedSync
        };
      }

      if (finishedWithoutParticipantData.length > 0) {
        return {
          syncType: 'participants_only',
          webinarIds: finishedWithoutParticipantData.map(w => w.webinar_id),
          description: `Sync participants for ${finishedWithoutParticipantData.length} finished webinar(s) without participant data`,
          webinars: finishedWithoutParticipantData
        };
      }

      if (scheduledWebinars.length > 0) {
        return {
          syncType: 'incremental',
          description: `Refresh ${scheduledWebinars.length} scheduled webinar(s) (participants will be available after webinars finish)`,
          webinars: scheduledWebinars
        };
      }

      // Fallback to incremental sync for all webinars
      return {
        syncType: 'incremental',
        description: `Refresh all ${allWebinars.length} webinar(s) and sync any available participant data`,
        webinars: allWebinars
      };
      
    } catch (error) {
      console.error('Error analyzing sync options:', error);
      toast.error('Failed to analyze sync options');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAndShow = async () => {
    const strategy = await analyzeSyncOptions();
    if (strategy) {
      setSyncStrategy(strategy);
      setShowStrategyDialog(true);
    }
  };

  const executeSync = async (strategy: SyncStrategy) => {
    setIsSyncing(true);
    setShowStrategyDialog(false);
    
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
      
      // Clear strategy
      setSyncStrategy(null);
      
    } catch (error) {
      console.error('Error during sync execution:', error);
      toast.error('Failed to execute sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <>
      <Dialog open={showStrategyDialog} onOpenChange={setShowStrategyDialog}>
        <DialogTrigger asChild>
          <Button
            onClick={handleAnalyzeAndShow}
            disabled={isAnalyzing || isSyncing}
            className="mb-4"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <Users className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Smart Participant Sync'}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Smart Sync Strategy
            </DialogTitle>
            <DialogDescription>
              {syncStrategy?.description}
            </DialogDescription>
          </DialogHeader>
          
          {syncStrategy && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Sync Type:</strong> {syncStrategy.syncType.replace('_', ' ')}
                  <br />
                  <strong>Webinars:</strong> {syncStrategy.webinars.length}
                  {syncStrategy.webinarIds && (
                    <>
                      <br />
                      <strong>Specific webinar IDs:</strong> {syncStrategy.webinarIds.length} webinars
                    </>
                  )}
                </AlertDescription>
              </Alert>

              <div className="max-h-60 overflow-y-auto">
                <h4 className="font-medium mb-2">Webinars to be processed:</h4>
                <div className="space-y-2">
                  {syncStrategy.webinars.slice(0, 10).map(webinar => (
                    <div key={webinar.id} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex-1 truncate">
                        <div className="font-medium truncate">{webinar.topic}</div>
                        <div className="text-muted-foreground text-xs">
                          Status: {webinar.status} | Sync: {webinar.participant_sync_status || 'none'}
                        </div>
                      </div>
                      <div className="ml-2">
                        {getStatusIcon(webinar.participant_sync_status || 'none')}
                      </div>
                    </div>
                  ))}
                  {syncStrategy.webinars.length > 10 && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      ... and {syncStrategy.webinars.length - 10} more webinars
                    </div>
                  )}
                </div>
              </div>

              {syncStrategy.syncType === 'incremental' && syncStrategy.webinars.some(w => w.status === 'scheduled') && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> Scheduled webinars don't have participants yet. 
                    This sync will refresh webinar data and check for any that have finished since last sync.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowStrategyDialog(false)}
              disabled={isSyncing}
            >
              Cancel
            </Button>
            {syncStrategy && (
              <Button 
                onClick={() => executeSync(syncStrategy)}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Execute Sync'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
