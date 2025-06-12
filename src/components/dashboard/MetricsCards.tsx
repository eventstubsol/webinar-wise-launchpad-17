
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, Users, Clock, Activity } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, trend, icon: Icon, bgColor }) => {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';
  const trendBgColor = trend === 'up' ? 'bg-green-50' : 'bg-red-50';

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
  const metrics = [
    {
      title: "Total Webinars",
      value: "24",
      change: "+12% from last month",
      trend: "up" as const,
      icon: Calendar,
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Registrants", 
      value: "3,247",
      change: "+8% from last month",
      trend: "up" as const,
      icon: Users,
      bgColor: "bg-green-50",
    },
    {
      title: "Total Attendees",
      value: "2,156",
      change: "+15% from last month", 
      trend: "up" as const,
      icon: Activity,
      bgColor: "bg-purple-50",
    },
    {
      title: "Attendance Rate",
      value: "66.4%",
      change: "-2% from last month",
      trend: "down" as const,
      icon: TrendingUp,
      bgColor: "bg-orange-50",
    },
    {
      title: "Total Engagement",
      value: "847h",
      change: "+22% from last month",
      trend: "up" as const,
      icon: Clock,
      bgColor: "bg-pink-50",
    },
    {
      title: "Average Duration",
      value: "42m",
      change: "+5% from last month",
      trend: "up" as const,
      icon: Clock,
      bgColor: "bg-yellow-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          trend={metric.trend}
          icon={metric.icon}
          bgColor={metric.bgColor}
        />
      ))}
    </div>
  );
}
