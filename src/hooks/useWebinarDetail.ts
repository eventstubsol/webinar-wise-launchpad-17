
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ParticipantAnalyticsService } from '@/services/zoom/analytics';

interface WebinarDetailData {
  webinar: any;
  participants: any[];
  polls: any[];
  qna: any[];
  recordings: any[];
  registrants: any[];
  analytics: any;
}

export const useWebinarDetail = (webinarId: string, connectionId: string) => {
  return useQuery({
    queryKey: ['webinar-detail', webinarId],
    queryFn: async (): Promise<WebinarDetailData> => {
      // Fetch webinar details
      const { data: webinar, error: webinarError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('id', webinarId)
        .eq('connection_id', connectionId)
        .single();

      if (webinarError) throw webinarError;

      // Fetch participants
      const { data: participants, error: participantsError } = await supabase
        .from('zoom_participants')
        .select('*')
        .eq('webinar_id', webinarId);

      if (participantsError) throw participantsError;

      // Fetch polls
      const { data: polls, error: pollsError } = await supabase
        .from('zoom_polls')
        .select(`
          *,
          zoom_poll_responses(*)
        `)
        .eq('webinar_id', webinarId);

      if (pollsError) throw pollsError;

      // Fetch Q&A
      const { data: qna, error: qnaError } = await supabase
        .from('zoom_qna')
        .select('*')
        .eq('webinar_id', webinarId);

      if (qnaError) throw qnaError;

      // Fetch recordings
      const { data: recordings, error: recordingsError } = await supabase
        .from('zoom_recordings')
        .select('*')
        .eq('webinar_id', webinarId);

      if (recordingsError) throw recordingsError;

      // Fetch registrants
      const { data: registrants, error: registrantsError } = await supabase
        .from('zoom_registrants')
        .select('*')
        .eq('webinar_id', webinarId);

      if (registrantsError) throw registrantsError;

      // Calculate analytics
      const analytics = await ParticipantAnalyticsService.calculateWebinarEngagement(webinarId);

      return {
        webinar: webinar || {},
        participants: participants || [],
        polls: polls || [],
        qna: qna || [],
        recordings: recordings || [],
        registrants: registrants || [],
        analytics
      };
    },
    enabled: !!webinarId && !!connectionId,
  });
};
