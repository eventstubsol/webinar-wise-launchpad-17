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
        zoom_participants(count)
      `)
      .eq('connection_id', connectionId);

    if (error) throw error;
    
    // Add registrant count from the webinar data itself
    return (webinars || []).map(webinar => ({
      ...webinar,
      zoom_registrants: [{ count: webinar.registrants_count || 0 }]
    }));
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
    const { count } = await supabase
      .from('zoom_participants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarId);

    return count || 0;
  }
}
