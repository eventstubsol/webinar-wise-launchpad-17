
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AnalyticsHelpers } from '@/services/zoom/analytics/AnalyticsHelpers';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Lightbulb, TrendingDown, Users, Clock } from 'lucide-react';

interface InsightsTabProps {
  analytics: any;
  participants: any[];
  webinar: any;
}

export const InsightsTab: React.FC<InsightsTabProps> = ({
  analytics,
  participants,
  webinar
}) => {
  const insights = analytics ? AnalyticsHelpers.generateInsights(analytics) : [];
  
  const dropOffData = analytics?.dropOffAnalysis ? [
    { stage: 'Early (0-25%)', count: analytics.dropOffAnalysis.early, color: '#ef4444' },
    { stage: 'Middle (25-75%)', count: analytics.dropOffAnalysis.middle, color: '#f97316' },
    { stage: 'Late (75-95%)', count: analytics.dropOffAnalysis.late, color: '#eab308' },
    { stage: 'Completed (95%+)', count: analytics.dropOffAnalysis.completed, color: '#22c55e' }
  ] : [];

  const chartConfig = {
    count: {
      label: "Participants",
      color: "hsl(var(--chart-1))",
    },
  };

  // Calculate recommendations
  const recommendations = [];
  
  if (analytics?.averageEngagementScore < 50) {
    recommendations.push({
      type: 'engagement',
      title: 'Increase Interactivity',
      description: 'Consider adding more polls, Q&A sessions, or breakout rooms to boost engagement.',
      priority: 'high'
    });
  }

  if (analytics?.averageAttendancePercentage < 60) {
    recommendations.push({
      type: 'retention',
      title: 'Improve Content Structure',
      description: 'High drop-off rate suggests content may need restructuring or shorter duration.',
      priority: 'high'
    });
  }

  if (dropOffData.find(d => d.stage === 'Early (0-25%)')?.count > participants.length * 0.3) {
    recommendations.push({
      type: 'opening',
      title: 'Strengthen Opening',
      description: 'Many participants left early. Consider a more engaging introduction.',
      priority: 'medium'
    });
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI-Generated Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <Alert key={index}>
                  <AlertDescription>{insight}</AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No insights available. This feature requires participant engagement data.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Drop-off Analysis */}
      {dropOffData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Drop-off Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dropOffData}>
                    <XAxis 
                      dataKey="stage" 
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Drop-off Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dropOffData.map((item) => (
                  <div key={item.stage} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.stage}</span>
                    </div>
                    <div className="text-sm font-medium">
                      {item.count} participants
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{rec.title}</h4>
                    <Badge variant={getPriorityColor(rec.priority)}>
                      {rec.priority} priority
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Great Job!</h3>
              <p className="text-muted-foreground">
                No specific recommendations at this time. Your webinar performance looks good!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Comparison with past webinars will be available once you have more webinar data.
              This feature analyzes trends across multiple webinars to provide benchmarking insights.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
