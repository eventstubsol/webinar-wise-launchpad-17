
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, UserCheck, Target, Award } from 'lucide-react';

interface WebinarMetrics {
  totalWebinars: number;
  totalAttendees: number;
  averageAttendanceRate: number;
  averageEngagementScore: number;
  totalRegistrants: number;
  periodChange: {
    webinars: number;
    attendees: number;
    attendanceRate: number;
    engagement: number;
  };
}

interface AnalyticsMetricsCardsProps {
  metrics: WebinarMetrics;
  isLoading?: boolean;
}

export const AnalyticsMetricsCards: React.FC<AnalyticsMetricsCardsProps> = ({
  metrics,
  isLoading,
}) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const getEngagementBadgeVariant = (score: number) => {
    if (score >= 70) return 'default';
    if (score >= 40) return 'secondary';
    return 'outline';
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Webinars */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Webinars</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalWebinars)}</div>
          <div className={`text-xs flex items-center gap-1 ${getTrendColor(metrics.periodChange.webinars)}`}>
            {getTrendIcon(metrics.periodChange.webinars)}
            {metrics.periodChange.webinars !== 0 && (
              <span>{formatPercentage(Math.abs(metrics.periodChange.webinars))} from last period</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Total Attendees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalAttendees)}</div>
          <div className={`text-xs flex items-center gap-1 ${getTrendColor(metrics.periodChange.attendees)}`}>
            {getTrendIcon(metrics.periodChange.attendees)}
            {metrics.periodChange.attendees !== 0 && (
              <span>{formatPercentage(Math.abs(metrics.periodChange.attendees))} from last period</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Average Attendance Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(metrics.averageAttendanceRate)}</div>
          <div className={`text-xs flex items-center gap-1 ${getTrendColor(metrics.periodChange.attendanceRate)}`}>
            {getTrendIcon(metrics.periodChange.attendanceRate)}
            {metrics.periodChange.attendanceRate !== 0 && (
              <span>{formatPercentage(Math.abs(metrics.periodChange.attendanceRate))} from last period</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Average Engagement Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{metrics.averageEngagementScore.toFixed(1)}</div>
            <Badge variant={getEngagementBadgeVariant(metrics.averageEngagementScore)}>
              {metrics.averageEngagementScore >= 70 ? 'High' : 
               metrics.averageEngagementScore >= 40 ? 'Medium' : 'Low'}
            </Badge>
          </div>
          <div className={`text-xs flex items-center gap-1 ${getTrendColor(metrics.periodChange.engagement)}`}>
            {getTrendIcon(metrics.periodChange.engagement)}
            {metrics.periodChange.engagement !== 0 && (
              <span>{formatPercentage(Math.abs(metrics.periodChange.engagement))} from last period</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
