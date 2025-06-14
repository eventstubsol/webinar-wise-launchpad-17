
import { supabase } from '@/integrations/supabase/client';

export class DeliverabilityService {
  static async getDeliverabilityMetrics(userId: string) {
    const { data, error } = await supabase
      .from('deliverability_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getDeliverabilityAlerts(userId: string) {
    const { data, error } = await supabase
      .from('deliverability_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
