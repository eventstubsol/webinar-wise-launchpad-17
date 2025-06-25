
import { supabase } from '@/integrations/supabase/client';

export class EmailReputationService {
  static async getReputationHistory(userId: string) {
    console.warn('EmailReputationService: email_reputation_history table not implemented yet');
    return [];
  }
}
