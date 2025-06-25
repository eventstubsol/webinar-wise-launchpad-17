
import { supabase } from '@/integrations/supabase/client';

export class DeliverabilityService {
  static async getDeliverabilityMetrics(userId: string) {
    console.warn('DeliverabilityService: deliverability_metrics table not implemented yet');
    return [];
  }

  static async getDeliverabilityAlerts(userId: string) {
    console.warn('DeliverabilityService: deliverability_alerts table not implemented yet');
    return [];
  }
}
