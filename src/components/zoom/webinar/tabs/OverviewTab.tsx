
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsSummary } from '../components/MetricsSummary';
import { EngagementChart } from '../components/EngagementChart';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface OverviewTabProps {
  webinar: any;
  participants: any[];
  registrants: any[];
  analytics: any;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  webinar,
  participants,
  registrants,
  analytics
}) => {
  // Calculate funnel data
  const funnelData = [
    {
      stage: 'Registered',
      count: registrants.length,
      percentage: 100
    },
    {
      stage: 'Attended',
      count: participants.length,
      percentage: registrants.length > 0 ? (participants.length / registrants.length) * 100 : 0
    },
    {
      stage: 'Engaged',
      count: analytics?.highlyEngagedCount || 0,
      percentage: participants.length > 0 ? ((analytics?.highlyEngagedCount || 0) / participants.length) * 100 : 0
    }
  ];

  const chartConfig = {
    count: {
      label: "Count",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <MetricsSummary 
        webinar={webinar}
        participants={participants}
        registrants={registrants}
        analytics={analytics}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Registration to Engagement Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData}>
                  <XAxis 
                    dataKey="stage" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent 
                        formatter={(value, name) => [
                          `${value} (${funnelData.find(d => d.count === value)?.percentage.toFixed(1)}%)`,
                          name
                        ]}
                      />
                    }
                  />
                  <Bar 
                    dataKey="count" 
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Engagement Distribution */}
        <EngagementChart analytics={analytics} />
      </div>

      {/* Additional Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.averageAttendanceDuration 
                ? `${Math.round(analytics.averageAttendanceDuration)} min`
                : 'N/A'
              }
            </div>
            <p className="text-sm text-muted-foreground">
              {analytics?.averageAttendancePercentage 
                ? `${analytics.averageAttendancePercentage.toFixed(1)}% of webinar`
                : 'No data available'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {registrants.length > 0 
                ? `${((participants.length / registrants.length) * 100).toFixed(1)}%`
                : 'N/A'
              }
            </div>
            <p className="text-sm text-muted-foreground">
              {participants.length} of {registrants.length} registered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.averageEngagementScore 
                ? `${analytics.averageEngagementScore.toFixed(1)}`
                : 'N/A'
              }
            </div>
            <p className="text-sm text-muted-foreground">
              Out of 100 points
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
