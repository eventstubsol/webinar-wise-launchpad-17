import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { EmailDeliveryService } from './EmailDeliveryService';

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

  // Launch campaign with new delivery system
  static async launchCampaign(campaignId: string) {
    try {
      // Update campaign status to launching
      await this.updateCampaign(campaignId, { status: 'launching' });

      // Use new email delivery service
      const result = await EmailDeliveryService.launchCampaign(campaignId);

      return result;
    } catch (error: any) {
      // Revert status on error
      await this.updateCampaign(campaignId, { status: 'draft' });
      throw error;
    }
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

  static async getCampaignDeliveryStats(campaignId: string) {
    return EmailDeliveryService.getCampaignDeliveryStats(campaignId);
  }

  static async getCampaignAnalytics(campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_analytics')
      .select('*')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    // Aggregate metrics
    const metrics = data.reduce((acc: any, event: any) => {
      acc[event.metric_type] = (acc[event.metric_type] || 0) + event.metric_value;
      return acc;
    }, {});

    // Calculate rates
    const sent = metrics.sent || 0;
    const delivered = metrics.delivered || sent; // Assume delivered = sent for now
    const opened = metrics.opened || 0;
    const clicked = metrics.clicked || 0;

    return {
      ...metrics,
      open_rate: delivered > 0 ? (opened / delivered) * 100 : 0,
      click_rate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      click_through_rate: opened > 0 ? (clicked / opened) * 100 : 0
    };
  }
}
