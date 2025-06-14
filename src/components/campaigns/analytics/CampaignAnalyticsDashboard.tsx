
import React, { useState, useEffect } from 'react';
import { Campaign, CampaignPerformanceSummary } from '@/types/campaign';
import { CampaignAnalyticsService } from '@/services/campaigns/CampaignAnalyticsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, TrendingUp, Users, Mail, Eye, MousePointer, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface CampaignAnalyticsDashboardProps {
  campaign: Campaign;
  onBack: () => void;
}

export const CampaignAnalyticsDashboard: React.FC<CampaignAnalyticsDashboardProps> = ({
  campaign,
  onBack
}) => {
  const { toast } = useToast();
  const [performance, setPerformance] = useState<CampaignPerformanceSummary | null>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [campaign.id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [performanceData, timeline] = await Promise.all([
        CampaignAnalyticsService.getCampaignPerformance(campaign.id),
        CampaignAnalyticsService.getEngagementTimeline(campaign.id)
      ]);
      
      setPerformance(performanceData);
      setTimelineData(timeline);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      await CampaignAnalyticsService.exportAnalytics(campaign.id, format);
      toast({
        title: "Success",
        description: `Analytics exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error('Error exporting analytics:', error);
      toast({
        title: "Error",
        description: "Failed to export analytics",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'Opened', value: performance?.total_opened || 0, color: '#10b981' },
    { name: 'Not Opened', value: (performance?.total_delivered || 0) - (performance?.total_opened || 0), color: '#e5e7eb' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.campaign_type}</h1>
            <p className="text-muted-foreground">{campaign.subject_template}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance?.total_sent || 0}</div>
            <p className="text-xs text-muted-foreground">
              {performance?.total_delivered || 0} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance?.open_rate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {performance?.total_opened || 0} opens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance?.click_rate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {performance?.total_clicked || 0} clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance?.bounce_rate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {performance?.total_bounced || 0} bounces
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Timeline</CardTitle>
                <CardDescription>Opens and clicks over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="opens" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Status Distribution</CardTitle>
                <CardDescription>Breakdown of email delivery status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>Key campaign metrics and benchmarks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600">Delivery Rate</div>
                  <div className="text-2xl font-bold">
                    {performance?.total_sent ? ((performance.total_delivered / performance.total_sent) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-xs text-gray-500">Industry avg: 95%</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600">Unsubscribe Rate</div>
                  <div className="text-2xl font-bold">{performance?.unsubscribe_rate?.toFixed(2) || 0}%</div>
                  <div className="text-xs text-gray-500">Industry avg: 0.2%</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600">Conversion Rate</div>
                  <div className="text-2xl font-bold">{performance?.conversion_rate?.toFixed(1) || 0}%</div>
                  <div className="text-xs text-gray-500">Industry avg: 2.3%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Analysis</CardTitle>
              <CardDescription>Detailed engagement patterns and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Detailed engagement analysis will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Breakdown</CardTitle>
              <CardDescription>Campaign performance by location</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Geographic analysis will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Device & Client Analysis</CardTitle>
              <CardDescription>Performance breakdown by device type and email client</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Device analysis will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
