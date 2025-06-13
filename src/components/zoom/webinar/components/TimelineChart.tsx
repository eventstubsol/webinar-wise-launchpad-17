
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface TimelineChartProps {
  participants: any[];
  webinar: any;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ participants, webinar }) => {
  // Generate timeline data for join/leave patterns
  const generateTimelineData = () => {
    if (!participants.length || !webinar.start_time) return [];

    const webinarStart = parseISO(webinar.start_time);
    const webinarDuration = webinar.duration || 60; // Default 60 minutes
    const intervals = 12; // 5-minute intervals for 60 minutes
    const intervalMinutes = webinarDuration / intervals;

    const timelineData = [];

    for (let i = 0; i <= intervals; i++) {
      const timePoint = new Date(webinarStart.getTime() + (i * intervalMinutes * 60 * 1000));
      
      // Count participants active at this time point
      const activeParticipants = participants.filter(p => {
        if (!p.join_time) return false;
        const joinTime = parseISO(p.join_time);
        const leaveTime = p.leave_time ? parseISO(p.leave_time) : new Date(webinarStart.getTime() + (webinarDuration * 60 * 1000));
        
        return timePoint >= joinTime && timePoint <= leaveTime;
      }).length;

      timelineData.push({
        time: format(timePoint, 'HH:mm'),
        participants: activeParticipants,
        timestamp: timePoint.getTime()
      });
    }

    return timelineData;
  };

  const timelineData = generateTimelineData();

  const chartConfig = {
    participants: {
      label: "Active Participants",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Timeline</CardTitle>
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
                  dot={{ fill: "var(--color-participants)", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>No timeline data available</p>
              <p className="text-sm">Participant join/leave times are needed to generate the timeline</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
