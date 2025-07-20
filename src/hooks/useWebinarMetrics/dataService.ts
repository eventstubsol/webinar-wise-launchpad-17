
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
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select(`
        *,
        zoom_registrants(count),
        zoom_participants(count)
      `)
      .eq('connection_id', connectionId);

    if (error) throw error;
    return webinars || [];
  }

  static async getRegistrantCount(webinarId: string): Promise<number> {
    const { count } = await supabase
      .from('zoom_registrants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarId);

    return count || 0;
  }

  static async getParticipantCount(webinarId: string): Promise<number> {
    const { count } = await supabase
      .from('zoom_participants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarId);

    return count || 0;
  }
}
