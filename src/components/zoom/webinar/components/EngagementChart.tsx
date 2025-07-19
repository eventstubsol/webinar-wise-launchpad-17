
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface EngagementChartProps {
  analytics: any;
}

export const EngagementChart: React.FC<EngagementChartProps> = ({ analytics }) => {
  const generateEngagementData = () => {
    if (!analytics) {
      return [
        { name: 'No Data', value: 100, color: '#e5e7eb' }
      ];
    }

    const data = [
      {
        name: 'High Engagement',
        value: analytics.highlyEngagedCount || 0,
        color: '#22c55e'
      },
      {
        name: 'Medium Engagement',
        value: analytics.moderatelyEngagedCount || 0,
        color: '#f59e0b'
      },
      {
        name: 'Low Engagement',
        value: analytics.lowEngagedCount || 0,
        color: '#ef4444'
      }
    ].filter(item => item.value > 0);

    return data.length > 0 ? data : [{ name: 'No Data', value: 100, color: '#e5e7eb' }];
  };

  const engagementData = generateEngagementData();

  const chartConfig = {
    value: {
      label: "Participants",
    },
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow">
          <p className="font-semibold">{data.name}</p>
          <p>{data.value} participants</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={engagementData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {engagementData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Legend */}
        <div className="flex justify-center mt-4 space-x-6">
          {engagementData.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
