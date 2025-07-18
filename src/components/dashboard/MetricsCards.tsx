
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, Users, Clock, Activity } from 'lucide-react';
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
  // Show placeholder cards for email/password auth focused app
  const placeholderMetrics = [
    { title: "Total Users", value: "0", change: "New app", trend: "up" as const, icon: Users },
    { title: "Active Sessions", value: "0", change: "Welcome!", trend: "up" as const, icon: Activity },
    { title: "Total Logins", value: "0", change: "Getting started", trend: "up" as const, icon: Calendar },
    { title: "Account Health", value: "100%", change: "All systems go", trend: "up" as const, icon: TrendingUp },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {placeholderMetrics.map((metric, i) => (
        <MetricCard
          key={i}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          trend={metric.trend}
          icon={metric.icon}
          bgColor="bg-gradient-to-br from-blue-50 to-indigo-50"
        />
      ))}
    </div>
  );
}
