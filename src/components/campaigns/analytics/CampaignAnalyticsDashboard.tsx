
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Mail, Users, MousePointer, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CampaignPerformanceSummary {
  id: string;
  campaign_id: string;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_unsubscribed: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  conversion_rate: number;
  revenue_generated: number;
  cost_per_click: number;
  roi: number;
  engagement_score: number;
  created_at: string;
  updated_at: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  sent_at?: string;
}

export function CampaignAnalyticsDashboard() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [performanceData, setPerformanceData] = useState<CampaignPerformanceSummary[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedPeriod]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, status, created_at, sent_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Load performance data
      const { data: performanceData, error: performanceError } = await supabase
        .from('campaign_performance_summaries')
        .select(`
          *,
          campaigns!inner(name, status, created_at, sent_at)
        `)
        .in('campaign_id', (campaignsData || []).map(c => c.id));

      if (performanceError) throw performanceError;
      setPerformanceData(performanceData || []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate aggregate metrics
  const aggregateMetrics = performanceData.reduce((acc, perf) => ({
    totalSent: acc.totalSent + perf.total_sent,
    totalDelivered: acc.totalDelivered + perf.total_delivered,
    totalOpened: acc.totalOpened + perf.total_opened,
    totalClicked: acc.totalClicked + perf.total_clicked,
    totalBounced: acc.totalBounced + perf.total_bounced,
    totalRevenue: acc.totalRevenue + Number(perf.revenue_generated)
  }), {
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalBounced: 0,
    totalRevenue: 0
  });

  const averageRates = {
    openRate: aggregateMetrics.totalSent > 0 ? (aggregateMetrics.totalOpened / aggregateMetrics.totalSent) * 100 : 0,
    clickRate: aggregateMetrics.totalSent > 0 ? (aggregateMetrics.totalClicked / aggregateMetrics.totalSent) * 100 : 0,
    bounceRate: aggregateMetrics.totalSent > 0 ? (aggregateMetrics.totalBounced / aggregateMetrics.totalSent) * 100 : 0,
    deliveryRate: aggregateMetrics.totalSent > 0 ? (aggregateMetrics.totalDelivered / aggregateMetrics.totalSent) * 100 : 0
  };

  // Prepare chart data
  const chartData = performanceData.map(perf => {
    const campaign = campaigns.find(c => c.id === perf.campaign_id);
    return {
      name: campaign?.name || 'Unknown Campaign',
      sent: perf.total_sent,
      opened: perf.total_opened,
      clicked: perf.total_clicked,
      openRate: Number(perf.open_rate),
      clickRate: Number(perf.click_rate),
      revenue: Number(perf.revenue_generated)
    };
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Campaign Analytics</h2>
          <p className="text-muted-foreground">Track performance across all your campaigns</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{aggregateMetrics.totalSent.toLocaleString()}</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold">{averageRates.openRate.toFixed(1)}%</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold">{averageRates.clickRate.toFixed(1)}%</p>
              </div>
              <MousePointer className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">${aggregateMetrics.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold">{averageRates.deliveryRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No performance data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="sent" fill="#8884d8" name="Sent" />
                      <Bar dataKey="opened" fill="#82ca9d" name="Opened" />
                      <Bar dataKey="clicked" fill="#ffc658" name="Clicked" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Rates</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No engagement data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="openRate" stroke="#8884d8" name="Open Rate %" />
                      <Line type="monotone" dataKey="clickRate" stroke="#82ca9d" name="Click Rate %" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No performance data available
                </div>
              ) : (
                <div className="space-y-4">
                  {performanceData.map((perf) => {
                    const campaign = campaigns.find(c => c.id === perf.campaign_id);
                    return (
                      <div key={perf.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{campaign?.name || 'Unknown Campaign'}</h3>
                          <Badge variant="outline">
                            Score: {Number(perf.engagement_score).toFixed(1)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Sent:</span> {perf.total_sent}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Open Rate:</span> {Number(perf.open_rate).toFixed(1)}%
                          </div>
                          <div>
                            <span className="text-muted-foreground">Click Rate:</span> {Number(perf.click_rate).toFixed(1)}%
                          </div>
                          <div>
                            <span className="text-muted-foreground">Revenue:</span> ${Number(perf.revenue_generated).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No revenue data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
