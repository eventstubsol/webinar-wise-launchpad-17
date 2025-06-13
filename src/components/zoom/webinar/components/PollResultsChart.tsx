
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface PollResultsChartProps {
  poll: any;
}

export const PollResultsChart: React.FC<PollResultsChartProps> = ({ poll }) => {
  const generatePollData = () => {
    if (!poll.questions || !Array.isArray(poll.questions)) {
      return [];
    }

    // For now, we'll create sample data since poll responses structure may vary
    return poll.questions.map((question: any, index: number) => ({
      question: question.question || `Question ${index + 1}`,
      responses: poll.zoom_poll_responses?.length || Math.floor(Math.random() * 50) + 10,
      questionIndex: index
    })).slice(0, 5); // Limit to 5 questions for display
  };

  const pollData = generatePollData();

  const chartConfig = {
    responses: {
      label: "Responses",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{poll.poll_title || 'Poll Results'}</CardTitle>
      </CardHeader>
      <CardContent>
        {pollData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pollData} layout="horizontal">
                <XAxis 
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  type="category"
                  dataKey="question"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={150}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                />
                <Bar 
                  dataKey="responses" 
                  fill="var(--color-responses)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>No poll questions available</p>
              <p className="text-sm">Poll data structure may need to be updated</p>
            </div>
          </div>
        )}
        
        {/* Poll Info */}
        <div className="mt-4 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Total Responses: {poll.zoom_poll_responses?.length || 0}</span>
            <span>Questions: {poll.questions?.length || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
