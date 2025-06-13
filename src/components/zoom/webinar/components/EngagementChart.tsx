
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface EngagementChartProps {
  analytics: any;
}

export const EngagementChart: React.FC<EngagementChartProps> = ({ analytics }) => {
  const data = analytics ? [
    { 
      name: 'Highly Engaged', 
      value: analytics.highlyEngagedCount || 0, 
      color: '#22c55e' 
    },
    { 
      name: 'Moderately Engaged', 
      value: analytics.moderatelyEngagedCount || 0, 
      color: '#eab308' 
    },
    { 
      name: 'Low Engaged', 
      value: analytics.lowEngagedCount || 0, 
      color: '#ef4444' 
    }
  ].filter(item => item.value > 0) : [];

  const chartConfig = {
    value: {
      label: "Participants",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={<ChartTooltipContent />}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No engagement data available
          </div>
        )}
        
        {/* Legend */}
        {data.length > 0 && (
          <div className="flex justify-center gap-4 mt-4">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
