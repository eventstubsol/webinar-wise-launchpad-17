
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import type { SyncStrategy, WebinarSyncCandidate } from './types';

export const useSyncAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  return {
    isAnalyzing,
    analyzeSyncOptions
  };
};
