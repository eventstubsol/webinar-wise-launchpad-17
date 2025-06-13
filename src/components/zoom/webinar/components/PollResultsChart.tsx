
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface PollResultsChartProps {
  poll: any;
}

export const PollResultsChart: React.FC<PollResultsChartProps> = ({ poll }) => {
  // Process poll responses to create chart data
  const processResponses = () => {
    if (!poll.zoom_poll_responses || poll.zoom_poll_responses.length === 0) {
      return [];
    }

    // For simplicity, we'll show response counts
    // In a real implementation, you'd parse the actual poll questions and choices
    const responseData = [
      { option: 'Total Responses', count: poll.zoom_poll_responses.length }
    ];

    return responseData;
  };

  const chartData = processResponses();

  const chartConfig = {
    count: {
      label: "Responses",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{poll.poll_title || 'Untitled Poll'}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="option" 
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
                <Bar 
                  dataKey="count" 
                  fill="var(--color-count)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No responses recorded for this poll
          </div>
        )}
        
        {/* Poll Questions */}
        {poll.questions && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Questions:</h4>
            {poll.questions.map((question: any, index: number) => (
              <p key={index} className="text-sm text-muted-foreground">
                {index + 1}. {question.question || 'No question text'}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
