
import { supabase } from '@/integrations/supabase/client';

export class ZoomInteractionOperations {
  static async upsertPolls(webinarId: string, pollsData: any[]): Promise<void> {
    if (!pollsData || pollsData.length === 0) return;

    try {
      // Transform polls data to match database schema
      const pollsToInsert = pollsData.map(poll => ({
        webinar_id: webinarId,
        poll_id: poll.poll_id || poll.id,
        title: poll.poll_title || poll.title,
        status: poll.status || 'notstart',
        anonymous: poll.anonymous || false,
        poll_type: poll.poll_type || 1,
        questions: poll.questions || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('zoom_polls')
        .upsert(pollsToInsert, {
          onConflict: 'webinar_id,poll_id'
        });

      if (error) {
        console.error('Error upserting polls:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in upsertPolls:', error);
      throw error;
    }
  }

  static async upsertPollResponses(pollResponses: any[]): Promise<void> {
    if (!pollResponses || pollResponses.length === 0) return;

    try {
      // First, get poll IDs from poll_id references
      const pollIds = [...new Set(pollResponses.map(r => r.poll_id))];
      
      const { data: polls, error: pollError } = await supabase
        .from('zoom_polls')
        .select('id, poll_id')
        .in('poll_id', pollIds);

      if (pollError) throw pollError;

      const pollIdMap = new Map(polls?.map(p => [p.poll_id, p.id]) || []);

      const responsesToInsert = pollResponses
        .filter(response => pollIdMap.has(response.poll_id))
        .map(response => ({
          poll_id: pollIdMap.get(response.poll_id),
          participant_email: response.participant_email,
          participant_name: response.participant_name,
          question_details: response.question_details || {},
          date_time: response.date_time ? new Date(response.date_time).toISOString() : new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      if (responsesToInsert.length > 0) {
        const { error } = await supabase
          .from('zoom_poll_responses')
          .upsert(responsesToInsert, {
            onConflict: 'poll_id,participant_email,date_time'
          });

        if (error) {
          console.error('Error upserting poll responses:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in upsertPollResponses:', error);
      throw error;
    }
  }

  static async upsertQnA(webinarId: string, qnaData: any[]): Promise<void> {
    if (!qnaData || qnaData.length === 0) return;

    try {
      const qnaToInsert = qnaData.map(qna => ({
        webinar_id: webinarId,
        question_details: qna.question_details || qna,
        answer_details: qna.answer_details || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('zoom_qna')
        .upsert(qnaToInsert, {
          onConflict: 'webinar_id,question_details'
        });

      if (error) {
        console.error('Error upserting Q&A:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in upsertQnA:', error);
      throw error;
    }
  }

  static async upsertRecordings(webinarId: string, recordingsData: any[]): Promise<void> {
    if (!recordingsData || recordingsData.length === 0) return;

    try {
      const recordingsToInsert = recordingsData.map(recording => ({
        webinar_id: webinarId,
        recording_id: recording.recording_id || recording.id,
        meeting_uuid: recording.meeting_uuid,
        recording_start: recording.recording_start ? new Date(recording.recording_start).toISOString() : null,
        recording_end: recording.recording_end ? new Date(recording.recording_end).toISOString() : null,
        file_type: recording.file_type,
        file_size: recording.file_size,
        download_url: recording.download_url,
        play_url: recording.play_url,
        recording_type: recording.recording_type,
        status: recording.status || 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('zoom_recordings')
        .upsert(recordingsToInsert, {
          onConflict: 'webinar_id,recording_id'
        });

      if (error) {
        console.error('Error upserting recordings:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in upsertRecordings:', error);
      throw error;
    }
  }
}
