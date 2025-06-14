
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type CampaignInsert = Database['public']['Tables']['email_campaigns']['Insert'];
type CampaignRow = Database['public']['Tables']['email_campaigns']['Row'];

export class CampaignService {
  // Campaign CRUD operations
  static async createCampaign(campaignData: CampaignInsert) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert(campaignData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getCampaigns(userId: string) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        campaign_schedules(*),
        campaign_performance_summaries(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getCampaign(id: string) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        campaign_schedules(*),
        campaign_variants(*),
        campaign_performance_summaries(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCampaign(id: string, updates: Partial<CampaignRow>) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteCampaign(id: string) {
    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Launch campaign
  static async launchCampaign(campaignId: string) {
    const { data, error } = await supabase.functions.invoke('launch-campaign', {
      body: { campaign_id: campaignId }
    });

    if (error) throw error;
    return data;
  }

  // Pause/Resume campaign
  static async pauseCampaign(campaignId: string) {
    return this.updateCampaign(campaignId, { status: 'paused' });
  }

  static async resumeCampaign(campaignId: string) {
    return this.updateCampaign(campaignId, { status: 'active' });
  }

  // Duplicate campaign
  static async duplicateCampaign(campaignId: string, newName: string) {
    const original = await this.getCampaign(campaignId);
    
    const { id, created_at, updated_at, last_run_at, ...campaignData } = original;
    
    return this.createCampaign({
      ...campaignData,
      campaign_type: newName,
      status: 'draft'
    });
  }
}
