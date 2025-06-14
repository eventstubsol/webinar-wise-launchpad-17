
import { supabase } from '@/integrations/supabase/client';

export class EmailReputationService {
  static async getReputationHistory(userId: string) {
    const { data, error } = await supabase
      .from('email_reputation_history')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_date', { ascending: false })
      .limit(30);

    if (error) throw error;
    return data;
  }
}
