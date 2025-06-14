
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InsightGenerationPanel } from './InsightGenerationPanel';
import { StreamingInsightViewer } from './StreamingInsightViewer';
import { useAIInsights } from '@/hooks/useAIInsights';
import { AIInsightsCard } from './AIInsightsCard';
import { Brain, Zap, Activity, History } from 'lucide-react';

interface AIInsightsDashboardProps {
  webinarId?: string;
}

export const AIInsightsDashboard: React.FC<AIInsightsDashboardProps> = ({
  webinarId
}) => {
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('generate');

  const { insights, summary, loading, refetch } = useAIInsights({
    webinarId,
    autoRefresh: true,
    refreshInterval: 10000 // Refresh every 10 seconds
  });

  const handleInsightGenerated = (insightId: string, type: string) => {
    refetch();
    setSelectedInsightId(insightId);
    setActiveTab('view');
  };

  const handleViewInsightDetails = (insight: any) => {
    setSelectedInsightId(insight.id);
    setActiveTab('view');
  };

  const recentInsights = insights.slice(0, 6);
  const processingInsights = insights.filter(i => i.status === 'processing');

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
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
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-bold">{processingInsights.length}</p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {summary?.avgConfidence ? `${Math.round(summary.avgConfidence * 100)}%` : 'N/A'}
                </p>
              </div>
              <Zap className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold">
                  {insights.filter(i => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(i.created_at) > weekAgo;
                  }).length}
                </p>
              </div>
              <History className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Insights Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">Generate New</TabsTrigger>
              <TabsTrigger value="recent">Recent Insights</TabsTrigger>
              <TabsTrigger value="view">View Insight</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate" className="space-y-4">
              {webinarId ? (
                <InsightGenerationPanel
                  webinarId={webinarId}
                  onInsightGenerated={handleInsightGenerated}
                />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a webinar to generate AI insights</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recent" className="space-y-4">
              {loading ? (
                <div className="text-center text-gray-500 py-8">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-pulse" />
                  <p>Loading insights...</p>
                </div>
              ) : recentInsights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentInsights.map((insight) => (
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
                  <p>No insights generated yet</p>
                  <p className="text-sm">Generate your first AI insight to get started</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="view" className="space-y-4">
              {selectedInsightId ? (
                <StreamingInsightViewer
                  insightId={selectedInsightId}
                  onClose={() => {
                    setSelectedInsightId(null);
                    setActiveTab('recent');
                  }}
                />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Select an insight to view details</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
