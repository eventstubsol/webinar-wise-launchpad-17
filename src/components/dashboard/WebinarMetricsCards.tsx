
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Video, Users, Clock, Activity, Target, Zap } from 'lucide-react';
import { useWebinarMetrics } from '@/hooks/useWebinarMetrics';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, trend, icon: Icon, description, loading }) => {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';
  const trendBgColor = trend === 'up' ? 'bg-green-50' : 'bg-red-50';

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-5 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-28 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        <Icon className="w-5 h-5 text-blue-600" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900 mb-2">{value}</div>
        <div className={`flex items-center text-xs ${trendColor} ${trendBgColor} rounded-full px-2 py-1 w-fit mb-1`}>
          <TrendIcon className="w-3 h-3 mr-1" />
          {change}
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </CardContent>
    </Card>
  );
};

export function WebinarMetricsCards() {
  const { metrics, loading, error } = useWebinarMetrics();

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error loading webinar metrics: {error}
      </div>
    );
  }

  // Use real data or fallback to defaults
  const totalWebinars = metrics?.totalWebinars || 0;
  const totalRegistrants = metrics?.totalRegistrants || 0;
  const totalAttendees = metrics?.totalAttendees || 0;
  const attendanceRate = metrics?.attendanceRate || 0;
  const averageDuration = metrics?.averageDuration || 0;
  const engagementScore = metrics?.totalEngagement || 0;

  const metricsData = [
    {
      title: "Total Webinars",
      value: totalWebinars.toString(),
      change: "+12% from last month",
      trend: 'up' as const,
      icon: Video,
      description: "Total webinars hosted",
    },
    {
      title: "Total Registrants", 
      value: totalRegistrants.toLocaleString(),
      change: "+23% from last month",
      trend: 'up' as const,
      icon: Users,
      description: "Total webinar registrations",
    },
    {
      title: "Total Attendees",
      value: totalAttendees.toLocaleString(),
      change: "+18% from last month", 
      trend: 'up' as const,
      icon: Activity,
      description: "Total webinar attendees",
    },
    {
      title: "Attendance Rate",
      value: `${attendanceRate}%`,
      change: attendanceRate >= 65 ? "Above industry avg" : "Below industry avg",
      trend: attendanceRate >= 65 ? 'up' as const : 'down' as const,
      icon: Target,
      description: "Registration to attendance conversion",
    },
    {
      title: "Average Duration",
      value: `${averageDuration}m`,
      change: "+5m from last month",
      trend: 'up' as const,
      icon: Clock,
      description: "Average webinar duration",
    },
    {
      title: "Engagement Score",
      value: `${Math.round(engagementScore)}%`,
      change: "+8% from last month",
      trend: 'up' as const,
      icon: Zap,
      description: "Overall audience engagement",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Webinar Performance Overview</h2>
        <p className="text-gray-600">Key metrics for your webinar performance</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricsData.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            trend={metric.trend}
            icon={metric.icon}
            description={metric.description}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
