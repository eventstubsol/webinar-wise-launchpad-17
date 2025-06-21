
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, TrendingUp, Target } from 'lucide-react';

interface MetricsSummaryProps {
  webinar: any;
  participants: any[];
  registrants: any[];
  analytics: any;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({
  webinar,
  participants,
  registrants,
  analytics
}) => {
  const metrics = [
    {
      title: 'Total Registrants',
      value: registrants.length,
      icon: Target,
      description: 'People who signed up'
    },
    {
      title: 'Total Attendees',
      value: participants.length,
      icon: Users,
      description: 'People who joined'
    },
    {
      title: 'Avg. Duration',
      value: analytics?.averageAttendanceDuration 
        ? `${Math.round(analytics.averageAttendanceDuration)}m`
        : 'N/A',
      icon: Clock,
      description: 'Average time spent'
    },
    {
      title: 'Engagement Score',
      value: analytics?.averageEngagementScore 
        ? `${analytics.averageEngagementScore.toFixed(1)}`
        : 'N/A',
      icon: TrendingUp,
      description: 'Out of 100 points'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className="text-xs text-muted-foreground">{metric.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
