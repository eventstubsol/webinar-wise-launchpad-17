
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ChartData {
  attendanceTrends: Array<{
    date: string;
    attendees: number;
    registrants: number;
    rate: number;
  }>;
  engagementDistribution: Array<{
    level: string;
    count: number;
    percentage: number;
  }>;
  geographicData: Array<{
    country: string;
    participants: number;
    engagement: number;
  }>;
  deviceData: Array<{
    device: string;
    count: number;
    percentage: number;
  }>;
}

interface AnalyticsChartsProps {
  chartData: ChartData;
  isLoading?: boolean;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const chartConfig = {
  attendees: { label: 'Attendees', color: 'hsl(var(--chart-1))' },
  registrants: { label: 'Registrants', color: 'hsl(var(--chart-2))' },
  rate: { label: 'Rate %', color: 'hsl(var(--chart-3))' },
  high: { label: 'High Engagement', color: 'hsl(var(--chart-1))' },
  medium: { label: 'Medium Engagement', color: 'hsl(var(--chart-2))' },
  low: { label: 'Low Engagement', color: 'hsl(var(--chart-3))' },
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  chartData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Attendance Trends */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Attendance Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <LineChart data={chartData.attendanceTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="attendees" 
                fill="var(--color-attendees)" 
                name="Attendees"
              />
              <Bar 
                yAxisId="left"
                dataKey="registrants" 
                fill="var(--color-registrants)" 
                name="Registrants"
                opacity={0.7}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="rate" 
                stroke="var(--color-rate)"
                name="Attendance Rate %"
                strokeWidth={3}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Engagement Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <BarChart data={chartData.engagementDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-high)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Device Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Device Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <PieChart>
              <Pie
                data={chartData.deviceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ device, percentage }) => 
                  percentage > 5 ? `${device} (${percentage.toFixed(1)}%)` : ''
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {chartData.deviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Geographic Distribution */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Top Countries by Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <BarChart data={chartData.geographicData.slice(0, 10)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="country" type="category" width={100} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="participants" fill="var(--color-attendees)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
