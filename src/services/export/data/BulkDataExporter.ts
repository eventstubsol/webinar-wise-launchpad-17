
import { supabase } from '@/integrations/supabase/client';

export class BulkDataExporter {
  static async exportWebinarData(filters: any = {}) {
    let query = supabase
      .from('zoom_webinars')
      .select(`
        *,
        zoom_participants(*),
        zoom_polls(*),
        zoom_qna(*)
      `);

    if (filters.webinarIds?.length > 0) {
      query = query.in('id', filters.webinarIds);
    }

    if (filters.dateRange) {
      query = query
        .gte('start_time', filters.dateRange.start)
        .lte('start_time', filters.dateRange.end);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('start_time', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async exportParticipantData(filters: any = {}) {
    let query = supabase
      .from('zoom_participants')
      .select(`
        *,
        zoom_webinars(topic, start_time, duration)
      `);

    if (filters.webinarIds?.length > 0) {
      query = query.in('webinar_id', filters.webinarIds);
    }

    if (filters.engagementLevel) {
      switch (filters.engagementLevel) {
        case 'high':
          query = query.gte('attentiveness_score', 80);
          break;
        case 'medium':
          query = query.gte('attentiveness_score', 50).lt('attentiveness_score', 80);
          break;
        case 'low':
          query = query.lt('attentiveness_score', 50);
          break;
      }
    }

    const { data, error } = await query.order('join_time', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
}
