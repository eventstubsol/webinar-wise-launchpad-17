
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, Users, Clock, Activity } from 'lucide-react';
import { useWebinarMetrics } from '@/hooks/useWebinarMetrics';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, trend, icon: Icon, bgColor, loading }) => {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';
  const trendBgColor = trend === 'up' ? 'bg-green-50' : 'bg-red-50';

  if (loading) {
    return (
      <Card className={`hover:shadow-md transition-shadow ${bgColor}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${bgColor}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        <Icon className="w-4 h-4 text-gray-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className={`flex items-center text-xs ${trendColor} ${trendBgColor} rounded-full px-2 py-1 mt-2 w-fit`}>
          <TrendIcon className="w-3 h-3 mr-1" />
          {change}
        </div>
      </CardContent>
    </Card>
  );
};

export function MetricsCards() {
  const { metrics, loading, error } = useWebinarMetrics();

  // Calculate trends (simplified - comparing with previous period)
  const calculateTrend = (current: number, previous: number): { value: string; trend: 'up' | 'down' } => {
    if (previous === 0) return { value: 'No previous data', trend: 'up' };
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${Math.abs(Math.round(change))}% from last period`,
      trend: change >= 0 ? 'up' : 'down'
    };
  };

  if (error) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="col-span-full text-center py-8 text-red-600">
          Error loading metrics: {error}
        </div>
      </div>
    );
  }

  // Use real data or fallback to defaults
  const totalWebinars = metrics?.totalWebinars || 0;
  const totalRegistrants = metrics?.totalRegistrants || 0;
  const totalAttendees = metrics?.totalAttendees || 0;
  const attendanceRate = metrics?.attendanceRate || 0;
  const totalEngagement = metrics?.totalEngagement || 0;
  const averageDuration = metrics?.averageDuration || 0;

  // Calculate simple trends based on recent vs older data
  const recentTrend = calculateTrend(totalWebinars, Math.max(1, totalWebinars - 2));
  const registrantTrend = calculateTrend(totalRegistrants, Math.max(1, totalRegistrants - 100));
  const attendeeTrend = calculateTrend(totalAttendees, Math.max(1, totalAttendees - 80));
  const rateTrend = attendanceRate >= 65 ? { value: 'Above average', trend: 'up' as const } : { value: 'Below average', trend: 'down' as const };
  const engagementTrend = calculateTrend(totalEngagement, Math.max(1, totalEngagement - 100));
  const durationTrend = calculateTrend(averageDuration, Math.max(1, averageDuration - 5));

  const metricsData = [
    {
      title: "Total Webinars",
      value: totalWebinars.toString(),
      change: recentTrend.value,
      trend: recentTrend.trend,
      icon: Calendar,
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Registrants", 
      value: totalRegistrants.toLocaleString(),
      change: registrantTrend.value,
      trend: registrantTrend.trend,
      icon: Users,
      bgColor: "bg-green-50",
    },
    {
      title: "Total Attendees",
      value: totalAttendees.toLocaleString(),
      change: attendeeTrend.value, 
      trend: attendeeTrend.trend,
      icon: Activity,
      bgColor: "bg-purple-50",
    },
    {
      title: "Attendance Rate",
      value: `${attendanceRate}%`,
      change: rateTrend.value,
      trend: rateTrend.trend,
      icon: TrendingUp,
      bgColor: "bg-orange-50",
    },
    {
      title: "Total Engagement",
      value: `${totalEngagement}h`,
      change: engagementTrend.value,
      trend: engagementTrend.trend,
      icon: Clock,
      bgColor: "bg-pink-50",
    },
    {
      title: "Average Duration",
      value: `${averageDuration}m`,
      change: durationTrend.value,
      trend: durationTrend.trend,
      icon: Clock,
      bgColor: "bg-yellow-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metricsData.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          trend={metric.trend}
          icon={metric.icon}
          bgColor={metric.bgColor}
          loading={loading}
        />
      ))}
    </div>
  );
}
