
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIInsightsCard } from '@/components/ai-analytics/AIInsightsCard';
import { EngagementPredictionsChart } from '@/components/ai-analytics/EngagementPredictionsChart';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useEngagementPredictions } from '@/hooks/useEngagementPredictions';
import { Brain, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const AIAnalyticsSection: React.FC = () => {
  const { insights, summary, loading: insightsLoading } = useAIInsights({
    autoRefresh: true,
    refreshInterval: 60000 // Refresh every minute
  });

  const { predictions, modelMetrics, loading: predictionsLoading } = useEngagementPredictions({
    realtimeMode: true,
    realtimeMinutes: 60 // Last hour of predictions
  });

  const handleViewInsightDetails = (insight: any) => {
    // TODO: Open insight details modal
    console.log('View insight details:', insight);
  };

  if (insightsLoading && predictionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>AI Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Insights</p>
                <p className="text-2xl font-bold">{summary?.total || 0}</p>
              </div>
              <Brain className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {summary?.avgConfidence ? `${(summary.avgConfidence * 100).toFixed(0)}%` : 'N/A'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Predictions</p>
                <p className="text-2xl font-bold">{predictions.length}</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Model Accuracy</p>
                <p className="text-2xl font-bold">
                  {modelMetrics && Object.keys(modelMetrics).length > 0
                    ? `${(Object.values(modelMetrics)[0] as any).avgAccuracy?.toFixed(0)}%`
                    : 'N/A'
                  }
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Analytics Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>AI-Powered Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="insights" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="insights">Recent Insights</TabsTrigger>
              <TabsTrigger value="predictions">Engagement Predictions</TabsTrigger>
              <TabsTrigger value="models">Model Performance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="insights" className="space-y-4">
              {insights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {insights.slice(0, 6).map((insight) => (
                    <AIInsightsCard
                      key={insight.id}
                      insight={insight}
                      onViewDetails={handleViewInsightDetails}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No AI insights available yet</p>
                  <p className="text-sm">Insights will appear here as they are generated</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="predictions" className="space-y-4">
              <EngagementPredictionsChart 
                predictions={predictions}
                title="Real-time Engagement Predictions"
              />
            </TabsContent>
            
            <TabsContent value="models" className="space-y-4">
              {modelMetrics && Object.keys(modelMetrics).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(modelMetrics).map(([modelName, metrics]: [string, any]) => (
                    <Card key={modelName}>
                      <CardHeader>
                        <CardTitle className="text-sm">{modelName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Predictions</span>
                          <span className="text-sm font-medium">{metrics.totalPredictions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Accuracy</span>
                          <span className="text-sm font-medium">{(metrics.avgAccuracy * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Range</span>
                          <span className="text-sm font-medium">
                            {(metrics.minAccuracy * 100).toFixed(1)}% - {(metrics.maxAccuracy * 100).toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No model performance data available</p>
                  <p className="text-sm">Performance metrics will appear as predictions are validated</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
