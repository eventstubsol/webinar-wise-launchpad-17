import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WebinarEngagementService } from '@/services/zoom/analytics';

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
      // Fetch webinar details with metrics
      const { data: webinar, error: webinarError } = await supabase
        .from('zoom_webinars')
        .select(`
          *,
          metrics:webinar_metrics(
            total_attendees,
            unique_attendees,
            total_absentees,
            actual_participant_count,
            total_minutes,
            avg_attendance_duration,
            participant_sync_status,
            participant_sync_attempted_at,
            participant_sync_completed_at,
            participant_sync_error
          )
        `)
        .eq('id', webinarId)
        .eq('connection_id', connectionId)
        .single();

      if (webinarError) throw webinarError;

      // Transform webinar data to flatten metrics
      const transformedWebinar = webinar ? {
        ...webinar,
        // Add metrics fields at root level for backward compatibility
        total_attendees: webinar.metrics?.total_attendees || 0,
        unique_attendees: webinar.metrics?.unique_attendees || 0,
        total_absentees: webinar.metrics?.total_absentees || 0,
        actual_participant_count: webinar.metrics?.actual_participant_count || 0,
        total_minutes: webinar.metrics?.total_minutes || 0,
        avg_attendance_duration: webinar.metrics?.avg_attendance_duration || 0,
        participant_sync_status: webinar.metrics?.participant_sync_status || 'pending',
        participant_sync_attempted_at: webinar.metrics?.participant_sync_attempted_at,
        participant_sync_completed_at: webinar.metrics?.participant_sync_completed_at,
        participant_sync_error: webinar.metrics?.participant_sync_error,
        // Rename for backward compatibility
        total_registrants: webinar.registrants_count || 0
      } : {};

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
      const analytics = await WebinarEngagementService.getWebinarEngagement(webinarId);

      return {
        webinar: transformedWebinar,
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
