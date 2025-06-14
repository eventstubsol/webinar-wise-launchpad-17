
import { supabase } from '@/integrations/supabase/client';
import { CampaignAnalytics, CampaignPerformanceSummary } from '@/types/campaign';

export class CampaignAnalyticsService {
  static async getCampaignPerformance(campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_performance_summaries')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getCampaignAnalytics(campaignId: string, dateRange?: { start: string; end: string }) {
    let query = supabase
      .from('campaign_analytics')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('event_timestamp', { ascending: false });

    if (dateRange) {
      query = query
        .gte('event_timestamp', dateRange.start)
        .lte('event_timestamp', dateRange.end);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async getEngagementTimeline(campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_analytics')
      .select('event_timestamp, metric_type, metric_value')
      .eq('campaign_id', campaignId)
      .in('metric_type', ['opened', 'clicked'])
      .order('event_timestamp', { ascending: true });

    if (error) throw error;
    return this.processTimelineData(data);
  }

  static async getGeographicBreakdown(campaignId: string) {
    // This would require additional geo data in analytics
    const { data, error } = await supabase
      .from('campaign_analytics')
      .select('event_data')
      .eq('campaign_id', campaignId)
      .eq('metric_type', 'opened');

    if (error) throw error;
    return this.processGeographicData(data);
  }

  static async getDeviceBreakdown(campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_analytics')
      .select('event_data')
      .eq('campaign_id', campaignId)
      .eq('metric_type', 'opened');

    if (error) throw error;
    return this.processDeviceData(data);
  }

  static async updateCampaignMetrics(campaignId: string) {
    const { data, error } = await supabase.rpc('calculate_campaign_performance', {
      p_campaign_id: campaignId
    });

    if (error) throw error;
    return data;
  }

  static async exportAnalytics(campaignId: string, format: 'csv' | 'excel' | 'pdf') {
    const { data, error } = await supabase.functions.invoke('export-campaign-analytics', {
      body: { campaign_id: campaignId, format }
    });

    if (error) throw error;
    return data;
  }

  private static processTimelineData(data: any[]) {
    // Process raw analytics data into timeline format
    const timeline = new Map();
    
    data.forEach(item => {
      const hour = new Date(item.event_timestamp).getHours();
      const key = `${hour}:00`;
      
      if (!timeline.has(key)) {
        timeline.set(key, { time: key, opens: 0, clicks: 0 });
      }
      
      const entry = timeline.get(key);
      if (item.metric_type === 'opened') entry.opens += item.metric_value;
      if (item.metric_type === 'clicked') entry.clicks += item.metric_value;
    });
    
    return Array.from(timeline.values()).sort((a, b) => 
      parseInt(a.time) - parseInt(b.time)
    );
  }

  private static processGeographicData(data: any[]) {
    // Extract geographic data from event_data
    const geoMap = new Map();
    
    data.forEach(item => {
      const country = item.event_data?.country || 'Unknown';
      geoMap.set(country, (geoMap.get(country) || 0) + 1);
    });
    
    return Array.from(geoMap.entries()).map(([country, count]) => ({
      country,
      count,
      percentage: 0 // Calculate based on total
    }));
  }

  private static processDeviceData(data: any[]) {
    // Extract device data from event_data
    const deviceMap = new Map();
    
    data.forEach(item => {
      const device = item.event_data?.device_type || 'Unknown';
      deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
    });
    
    return Array.from(deviceMap.entries()).map(([device, count]) => ({
      device,
      count,
      percentage: 0 // Calculate based on total
    }));
  }
}
