import { supabase } from '@/integrations/supabase/client';
import type { SyncHistoryData, WebinarData } from './types';

export class WebinarMetricsDataService {
  static async fetchSyncHistory(connectionId: string): Promise<{ lastSync: SyncHistoryData | null; syncHistoryCount: number }> {
    const { data: syncHistory } = await supabase
      .from('zoom_sync_logs')
      .select('completed_at, sync_status')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      lastSync: syncHistory?.[0] || null,
      syncHistoryCount: syncHistory?.length || 0,
    };
  }

  static async fetchWebinars(connectionId: string): Promise<WebinarData[]> {
    // Fetch webinars with metrics using the new structure
    const { data: webinars, error } = await supabase
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
          participant_sync_status
        )
      `)
      .eq('connection_id', connectionId);

    if (error) throw error;

    // Transform the data to include metrics at the root level for backward compatibility
    const transformedWebinars = (webinars || []).map(webinar => {
      const metrics = Array.isArray(webinar.metrics) ? webinar.metrics[0] : webinar.metrics;
      return {
        ...webinar,
        // Add participant and registrant counts from metrics
        zoom_participants: [{ count: metrics?.actual_participant_count || 0 }],
        zoom_registrants: [{ count: webinar.registrants_count || 0 }],
        // Include metrics fields at root level
        total_attendees: metrics?.total_attendees || 0,
        unique_attendees: metrics?.unique_attendees || 0,
        total_absentees: metrics?.total_absentees || 0,
        participant_sync_status: metrics?.participant_sync_status || 'pending'
      };
    });

    return transformedWebinars;
  }

  static async getRegistrantCount(webinarId: string): Promise<number> {
    // Get registrant count from the webinar record itself
    const { data: webinar } = await supabase
      .from('zoom_webinars')
      .select('registrants_count')
      .eq('id', webinarId)
      .single();

    return webinar?.registrants_count || 0;
  }

  static async getParticipantCount(webinarId: string): Promise<number> {
    // Get participant count from the metrics table
    const { data: metrics } = await supabase
      .from('webinar_metrics')
      .select('actual_participant_count')
      .eq('webinar_id', webinarId)
      .single();

    return metrics?.actual_participant_count || 0;
  }
}
