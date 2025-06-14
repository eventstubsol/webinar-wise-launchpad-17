
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Smartphone, Monitor, Tablet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CampaignAnalyticsService } from '@/services/campaigns/CampaignAnalyticsService';
import { useToast } from '@/hooks/use-toast';

interface GeographicDeviceAnalyticsProps {
  campaignId: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export const GeographicDeviceAnalytics: React.FC<GeographicDeviceAnalyticsProps> = ({
  campaignId
}) => {
  const { toast } = useToast();
  const [geoData, setGeoData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [campaignId]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [geographic, device] = await Promise.all([
        CampaignAnalyticsService.getGeographicBreakdown(campaignId),
        CampaignAnalyticsService.getDeviceBreakdown(campaignId)
      ]);
      
      // Calculate percentages
      const geoTotal = geographic.reduce((sum: number, item: any) => sum + item.count, 0);
      const deviceTotal = device.reduce((sum: number, item: any) => sum + item.count, 0);
      
      setGeoData(geographic.map((item: any) => ({
        ...item,
        percentage: geoTotal > 0 ? (item.count / geoTotal) * 100 : 0
      })));
      
      setDeviceData(device.map((item: any) => ({
        ...item,
        percentage: deviceTotal > 0 ? (item.count / deviceTotal) * 100 : 0
      })));
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load geographic and device analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
        <div className="h-32 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Geographic & Device Analytics</h2>
      </div>

      <Tabs defaultValue="geographic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="geographic">Geographic Distribution</TabsTrigger>
          <TabsTrigger value="device">Device & Platform</TabsTrigger>
        </TabsList>

        <TabsContent value="geographic" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>Email opens by country/region</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={geoData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        nameKey="country"
                        label={({ country, percentage }) => `${country} ${percentage.toFixed(1)}%`}
                      >
                        {geoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Opens']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Countries</CardTitle>
                <CardDescription>Breakdown by engagement volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {geoData.slice(0, 8).map((item, index) => (
                    <div key={item.country} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{item.country}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{item.count}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Regional Performance</CardTitle>
              <CardDescription>Engagement rates by geographic region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={geoData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="country" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="device" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
                <CardDescription>Email opens by device type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        nameKey="device"
                        label={({ device, percentage }) => `${device} ${percentage.toFixed(1)}%`}
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Opens']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
                <CardDescription>Detailed device and platform statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deviceData.map((item, index) => (
                    <div key={item.device} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(item.device)}
                        <div>
                          <div className="font-medium">{item.device}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.percentage.toFixed(1)}% of total opens
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{item.count}</div>
                        <div className="text-sm text-muted-foreground">opens</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Platform Performance</CardTitle>
              <CardDescription>Comparative analysis across device types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="device" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Geographic Insights</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Top performing region: {geoData[0]?.country || 'N/A'}</li>
                <li>• Consider localizing content for top 3 regions</li>
                <li>• Schedule sends based on regional time zones</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Device Optimization</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Primary device: {deviceData[0]?.device || 'N/A'}</li>
                <li>• Ensure mobile-responsive templates</li>
                <li>• Test email rendering across platforms</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
