
import { supabase } from '@/integrations/supabase/client';
import { ZoomDataTransformers } from '../../utils/dataTransformers';
import type {
  ZoomWebinarInsert,
  ZoomRegistrantInsert,
  ZoomParticipantInsert,
  ZoomPollInsert,
  ZoomPollResponseInsert,
  ZoomQnaInsert
} from '@/types/zoom/operationTypes';

/**
 * Database operations for syncing Zoom data
 */
export class DatabaseSyncOperations {
  /**
   * Upsert webinar data
   */
  static async upsertWebinar(webinarData: any, connectionId: string): Promise<string> {
    const transformedWebinar = ZoomDataTransformers.transformWebinarForDatabase(webinarData, connectionId);
    
    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert(
        {
          ...transformedWebinar,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'connection_id,webinar_id',
          ignoreDuplicates: false
        }
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to upsert webinar: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Upsert registrants for a webinar
   */
  static async upsertRegistrants(registrants: any[], webinarDbId: string): Promise<void> {
    if (!registrants || registrants.length === 0) return;

    const transformedRegistrants = registrants.map(registrant => 
      ZoomDataTransformers.transformRegistrant(registrant, webinarDbId)
    );

    const { error } = await supabase
      .from('zoom_registrants')
      .upsert(
        transformedRegistrants.map(reg => ({
          ...reg,
          updated_at: new Date().toISOString()
        })),
        {
          onConflict: 'webinar_id,registrant_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      throw new Error(`Failed to upsert registrants: ${error.message}`);
    }
  }

  /**
   * Upsert participants for a webinar
   */
  static async upsertParticipants(participants: any[], webinarDbId: string): Promise<void> {
    if (!participants || participants.length === 0) return;

    const transformedParticipants = participants.map(participant => 
      ZoomDataTransformers.transformParticipant(participant, webinarDbId)
    );

    const { error } = await supabase
      .from('zoom_participants')
      .upsert(
        transformedParticipants.map(part => ({
          ...part,
          updated_at: new Date().toISOString()
        })),
        {
          onConflict: 'webinar_id,participant_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      throw new Error(`Failed to upsert participants: ${error.message}`);
    }
  }

  /**
   * Upsert polls for a webinar
   */
  static async upsertPolls(polls: any[], webinarDbId: string): Promise<void> {
    if (!polls || polls.length === 0) return;

    const transformedPolls = polls.map(poll => 
      ZoomDataTransformers.transformPoll(poll, webinarDbId)
    );

    const { error } = await supabase
      .from('zoom_polls')
      .upsert(
        transformedPolls.map(poll => ({
          ...poll,
          updated_at: new Date().toISOString()
        })),
        {
          onConflict: 'webinar_id,poll_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      throw new Error(`Failed to upsert polls: ${error.message}`);
    }
  }

  /**
   * Upsert Q&A for a webinar
   */
  static async upsertQnA(qnaData: any[], webinarDbId: string): Promise<void> {
    if (!qnaData || qnaData.length === 0) return;

    const transformedQnA = qnaData.map(qna => 
      ZoomDataTransformers.transformQnA(qna, webinarDbId)
    );

    const { error } = await supabase
      .from('zoom_qna')
      .upsert(
        transformedQnA.map(qna => ({
          ...qna,
          updated_at: new Date().toISOString()
        })),
        {
          onConflict: 'webinar_id,question_id',
          ignoreDuplicates: false
        }
      );

    if (error) {
      throw new Error(`Failed to upsert Q&A: ${error.message}`);
    }
  }

  /**
   * Update webinar metrics after syncing all data
   */
  static async updateWebinarMetrics(webinarDbId: string): Promise<void> {
    // Calculate metrics from participants
    const { data: participants, error: participantsError } = await supabase
      .from('zoom_participants')
      .select('duration')
      .eq('webinar_id', webinarDbId);

    if (participantsError) {
      console.error('Failed to fetch participants for metrics:', participantsError);
      return;
    }

    // Calculate metrics from registrants
    const { data: registrants, error: registrantsError } = await supabase
      .from('zoom_registrants')
      .select('id')
      .eq('webinar_id', webinarDbId);

    if (registrantsError) {
      console.error('Failed to fetch registrants for metrics:', registrantsError);
      return;
    }

    const metrics = ZoomDataTransformers.calculateWebinarMetrics(participants || []);

    // Update webinar with calculated metrics
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: registrants?.length || 0,
        total_attendees: metrics.total_attendees,
        total_minutes: metrics.total_minutes,
        avg_attendance_duration: metrics.avg_attendance_duration,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (updateError) {
      console.error('Failed to update webinar metrics:', updateError);
    }
  }

  /**
   * Get webinar by Zoom ID and connection
   */
  static async getWebinarByZoomId(zoomWebinarId: string, connectionId: string): Promise<any> {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('id, webinar_id, updated_at')
      .eq('webinar_id', zoomWebinarId)
      .eq('connection_id', connectionId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to fetch webinar: ${error.message}`);
    }

    return data;
  }

  /**
   * Batch operation: Process all data for a webinar
   */
  static async syncCompleteWebinarData(
    webinarData: any,
    registrants: any[],
    participants: any[],
    polls: any[],
    qnaData: any[],
    connectionId: string
  ): Promise<string> {
    // Start transaction-like operation
    try {
      // 1. Upsert webinar
      const webinarDbId = await this.upsertWebinar(webinarData, connectionId);

      // 2. Upsert all related data
      await Promise.all([
        this.upsertRegistrants(registrants, webinarDbId),
        this.upsertParticipants(participants, webinarDbId),
        this.upsertPolls(polls, webinarDbId),
        this.upsertQnA(qnaData, webinarDbId)
      ]);

      // 3. Update metrics
      await this.updateWebinarMetrics(webinarDbId);

      return webinarDbId;
    } catch (error) {
      console.error('Error syncing complete webinar data:', error);
      throw error;
    }
  }
}
