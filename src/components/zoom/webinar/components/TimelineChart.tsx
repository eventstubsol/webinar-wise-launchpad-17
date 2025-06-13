
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format, addMinutes } from 'date-fns';

interface TimelineChartProps {
  participants: any[];
  webinar: any;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ participants, webinar }) => {
  // Generate timeline data showing participant count over time
  const generateTimelineData = () => {
    if (!webinar.start_time || participants.length === 0) return [];

    const startTime = new Date(webinar.start_time);
    const duration = webinar.duration || 60;
    const intervals = 12; // 12 data points
    const intervalMinutes = duration / intervals;

    const data = [];
    
    for (let i = 0; i <= intervals; i++) {
      const currentTime = addMinutes(startTime, i * intervalMinutes);
      
      // Count participants present at this time
      const participantsPresent = participants.filter(p => {
        const joinTime = new Date(p.join_time);
        const leaveTime = p.leave_time ? new Date(p.leave_time) : addMinutes(startTime, duration);
        
        return joinTime <= currentTime && currentTime <= leaveTime;
      }).length;

      data.push({
        time: format(currentTime, 'HH:mm'),
        participants: participantsPresent,
        fullTime: currentTime
      });
    }

    return data;
  };

  const timelineData = generateTimelineData();

  const chartConfig = {
    participants: {
      label: "Participants",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {timelineData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <XAxis 
                  dataKey="time" 
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
                  content={<ChartTooltipContent />}
                />
                <Line 
                  type="monotone" 
                  dataKey="participants" 
                  stroke="var(--color-participants)" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No timeline data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
