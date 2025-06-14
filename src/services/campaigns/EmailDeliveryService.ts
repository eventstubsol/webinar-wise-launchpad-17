
import { supabase } from '@/integrations/supabase/client';

export class EmailDeliveryService {
  static async launchCampaign(campaignId: string) {
    const { data, error } = await supabase.functions.invoke('launch-campaign', {
      body: { campaign_id: campaignId }
    });

    if (error) throw error;
    return data;
  }

  static async processEmailQueue(campaignId?: string, batchSize = 10) {
    const { data, error } = await supabase.functions.invoke('process-email-queue', {
      body: { 
        campaign_id: campaignId,
        batch_size: batchSize
      }
    });

    if (error) throw error;
    return data;
  }

  static async getEmailTrackingEvents(emailSendId: string) {
    const { data, error } = await supabase
      .from('email_tracking_events')
      .select('*')
      .eq('email_send_id', emailSendId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getCampaignDeliveryStats(campaignId: string) {
    const { data, error } = await supabase
      .from('email_send_queue')
      .select('status')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    const stats = data.reduce((acc: any, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: data.length,
      queued: stats.queued || 0,
      processing: stats.processing || 0,
      sent: stats.sent || 0,
      failed: stats.failed || 0
    };
  }
}
