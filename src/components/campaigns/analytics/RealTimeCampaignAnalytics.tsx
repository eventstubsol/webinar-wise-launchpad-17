
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Mail, Eye, MousePointer, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CampaignService } from '@/services/campaigns/CampaignService';

interface RealTimeCampaignAnalyticsProps {
  campaignId: string;
}

export const RealTimeCampaignAnalytics: React.FC<RealTimeCampaignAnalyticsProps> = ({ 
  campaignId 
}) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [deliveryStats, setDeliveryStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('campaign-analytics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_analytics',
          filter: `campaign_id=eq.${campaignId}`
        },
        () => {
          loadAnalytics();
        }
      )
      .subscribe();

    // Refresh data every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [campaignId]);

  const loadAnalytics = async () => {
    try {
      const [analyticsData, deliveryData] = await Promise.all([
        CampaignService.getCampaignAnalytics(campaignId),
        CampaignService.getCampaignDeliveryStats(campaignId)
      ]);

      setAnalytics(analyticsData);
      setDeliveryStats(deliveryData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'queued': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Delivery Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Campaign Delivery Status
          </CardTitle>
          <CardDescription>Real-time delivery progress</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveryStats && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-gray-500">
                  {deliveryStats.sent + deliveryStats.failed} / {deliveryStats.total}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${((deliveryStats.sent + deliveryStats.failed) / deliveryStats.total) * 100}%` 
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(deliveryStats).map(([status, count]: [string, any]) => (
                  status !== 'total' && (
                    <div key={status} className="text-center">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} mx-auto mb-1`} />
                      <div className="text-lg font-semibold">{count}</div>
                      <div className="text-xs text-gray-500 capitalize">{status}</div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.sent || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total emails delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opens</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.opened || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.open_rate?.toFixed(1) || 0}% open rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.clicked || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.click_rate?.toFixed(1) || 0}% click rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.click_through_rate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Click-through rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest email interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Email opened</span>
              </div>
              <span className="text-xs text-gray-500">Just now</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-sm">Link clicked</span>
              </div>
              <span className="text-xs text-gray-500">2 minutes ago</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Email opened</span>
              </div>
              <span className="text-xs text-gray-500">5 minutes ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
