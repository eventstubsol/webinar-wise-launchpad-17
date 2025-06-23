
import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { toast } from 'sonner';
import { WebinarSelectionCard } from './participant-sync/WebinarSelectionCard';
import { SyncControlsCard } from './participant-sync/SyncControlsCard';
import { SyncResultsCard } from './participant-sync/SyncResultsCard';

interface WebinarForSync {
  id: string;
  webinar_id: string;
  topic: string;
  start_time: string;
  participant_sync_status: string;
  participant_sync_attempted_at?: string;
}

interface SyncReport {
  webinarId: string;
  webinarDbId: string;
  title: string;
  success: boolean;
  participantsFetched: number;
  participantsBefore: number;
  participantsAfter: number;
  apiResponseTime: number | null;
  dbOperationTime: number | null;
  errorMessage?: string;
}

export function ParticipantSyncTester() {
  const { connection } = useZoomConnection();
  const [selectedWebinars, setSelectedWebinars] = useState<string[]>([]);
  const [syncResults, setSyncResults] = useState<SyncReport[] | null>(null);

  // Fetch webinars for selection
  const { data: webinars, isLoading: webinarsLoading } = useQuery({
    queryKey: ['webinars-for-participant-sync', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return [];

      const { data, error } = await supabase
        .from('zoom_webinars')
        .select('id, webinar_id, topic, start_time, participant_sync_status, participant_sync_attempted_at')
        .eq('connection_id', connection.id)
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WebinarForSync[];
    },
    enabled: !!connection?.id,
  });

  // Participant sync mutation
  const syncMutation = useMutation({
    mutationFn: async (webinarIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId: connection?.id,
          syncType: 'participants_only',
          webinarIds: webinarIds,
          options: {
            forceSync: true,
            skipEligibilityCheck: true
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Participant sync started successfully');
      
      // Poll for results
      const pollForResults = async () => {
        const syncId = data.syncId;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max

        const poll = async () => {
          try {
            const { data: syncLog } = await supabase
              .from('zoom_sync_logs')
              .select('*, error_details')
              .eq('id', syncId)
              .single();

            if (syncLog?.sync_status === 'completed') {
              // Get detailed results from error_details.participantsOnlyReport
              const errorDetails = syncLog.error_details as any;
              const report = errorDetails?.participantsOnlyReport;
              if (report?.results) {
                setSyncResults(report.results);
              }
              return;
            } else if (syncLog?.sync_status === 'failed') {
              toast.error('Participant sync failed');
              return;
            }

            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(poll, 5000); // Poll every 5 seconds
            }
          } catch (error) {
            console.error('Error polling sync results:', error);
          }
        };

        poll();
      };

      pollForResults();
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  const handleWebinarToggle = (webinarId: string) => {
    setSelectedWebinars(prev => 
      prev.includes(webinarId) 
        ? prev.filter(id => id !== webinarId)
        : [...prev, webinarId]
    );
  };

  const handleSelectAll = () => {
    if (selectedWebinars.length === webinars?.length) {
      setSelectedWebinars([]);
    } else {
      setSelectedWebinars(webinars?.map(w => w.webinar_id) || []);
    }
  };

  const handleStartSync = () => {
    if (selectedWebinars.length === 0) {
      toast.error('Please select at least one webinar');
      return;
    }
    setSyncResults(null);
    syncMutation.mutate(selectedWebinars);
  };

  if (!connection) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please connect your Zoom account first to use the participant sync tester.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WebinarSelectionCard
        webinars={webinars}
        webinarsLoading={webinarsLoading}
        selectedWebinars={selectedWebinars}
        onWebinarToggle={handleWebinarToggle}
        onSelectAll={handleSelectAll}
      />

      <SyncControlsCard
        selectedWebinars={selectedWebinars}
        syncInProgress={syncMutation.isPending}
        onStartSync={handleStartSync}
      />

      <SyncResultsCard syncResults={syncResults} />
    </div>
  );
}
