
import { supabase } from '@/integrations/supabase/client';

// Mock types since campaign_analytics table doesn't exist yet
type CampaignAnalytics = {
  id: string;
  campaign_id: string;
  metric_type: string;
  metric_value: number;
  event_timestamp: string;
  event_data: Record<string, any>;
};

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

  static async getCampaignAnalytics(campaignId: string, dateRange?: { start: string; end: string }): Promise<CampaignAnalytics[]> {
    console.warn('CampaignAnalyticsService: campaign_analytics table not implemented yet');
    
    // Return mock analytics data
    return [
      {
        id: 'mock-analytics-1',
        campaign_id: campaignId,
        metric_type: 'opened',
        metric_value: 50,
        event_timestamp: new Date().toISOString(),
        event_data: {}
      },
      {
        id: 'mock-analytics-2',
        campaign_id: campaignId,
        metric_type: 'clicked',
        metric_value: 25,
        event_timestamp: new Date().toISOString(),
        event_data: {}
      }
    ];
  }

  static async getEngagementTimeline(campaignId: string) {
    console.warn('CampaignAnalyticsService: campaign_analytics table not implemented yet');
    
    // Return mock timeline data
    return this.processTimelineData([
      {
        event_timestamp: new Date().toISOString(),
        metric_type: 'opened',
        metric_value: 50
      },
      {
        event_timestamp: new Date().toISOString(),
        metric_type: 'clicked',
        metric_value: 25
      }
    ]);
  }

  static async getGeographicBreakdown(campaignId: string) {
    console.warn('CampaignAnalyticsService: campaign_analytics table not implemented yet');
    
    // Return mock geographic data
    return this.processGeographicData([
      { event_data: { country: 'United States' } },
      { event_data: { country: 'Canada' } },
      { event_data: { country: 'United Kingdom' } }
    ]);
  }

  static async getDeviceBreakdown(campaignId: string) {
    console.warn('CampaignAnalyticsService: campaign_analytics table not implemented yet');
    
    // Return mock device data
    return this.processDeviceData([
      { event_data: { device_type: 'desktop' } },
      { event_data: { device_type: 'mobile' } },
      { event_data: { device_type: 'tablet' } }
    ]);
  }

  static async updateCampaignMetrics(campaignId: string) {
    console.warn('CampaignAnalyticsService: calculate_campaign_performance function not implemented yet');
    
    // Return mock calculation result
    return { success: true, metrics_updated: true };
  }

  static async exportAnalytics(campaignId: string, format: 'csv' | 'excel' | 'pdf') {
    console.warn('CampaignAnalyticsService: export not implemented yet');
    
    // Return mock export data
    return { export_url: 'mock-export-url', format };
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
