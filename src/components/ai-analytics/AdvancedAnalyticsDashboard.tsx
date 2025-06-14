
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  TrendingUp, 
  MessageSquare, 
  Settings,
  RefreshCw,
  Download,
  Share2
} from 'lucide-react';
import { InsightCard } from './InsightCard';
import { PredictiveAnalytics } from './PredictiveAnalytics';
import { ContentAnalysis } from './ContentAnalysis';
import { CustomMetricsBuilder } from './CustomMetricsBuilder';
import { useAIInsights } from '@/hooks/useAIInsights';

interface AdvancedAnalyticsDashboardProps {
  webinarId?: string;
}

export const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  webinarId
}) => {
  const [activeTab, setActiveTab] = useState('insights');
  const [refreshing, setRefreshing] = useState(false);
  
  const { insights, loading, refetch } = useAIInsights({
    webinarId,
    autoRefresh: true,
    refreshInterval: 30000
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSaveInsight = (id: string) => {
    console.log('Saving insight:', id);
    // Implement save functionality
  };

  const handleShareInsight = (id: string) => {
    console.log('Sharing insight:', id);
    // Implement share functionality
  };

  const handleExpandInsight = (id: string) => {
    console.log('Expanding insight:', id);
    // Navigate to detailed view
  };

  // Mock data for demonstration
  const mockInsights = [
    {
      id: '1',
      title: 'Peak Engagement Window Identified',
      summary: 'Analysis shows highest audience engagement occurs 15-25 minutes into webinars, with 89% confidence.',
      confidence_score: 0.89,
      insight_type: 'engagement',
      status: 'completed' as const,
      created_at: new Date().toISOString(),
      supporting_data: {
        peak_time: '15-25 minutes',
        engagement_increase: '34%',
        participant_actions: ['polls', 'chat', 'qa']
      },
      trend_data: [
        { time: '0', value: 0.6 },
        { time: '5', value: 0.7 },
        { time: '10', value: 0.8 },
        { time: '15', value: 0.95 },
        { time: '20', value: 0.92 },
        { time: '25', value: 0.85 }
      ]
    },
    {
      id: '2',
      title: 'Dropout Risk Prediction',
      summary: 'ML model predicts 23% participant dropout risk after 30-minute mark based on historical patterns.',
      confidence_score: 0.76,
      insight_type: 'predictive',
      status: 'completed' as const,
      created_at: new Date().toISOString(),
      supporting_data: {
        risk_percentage: '23%',
        trigger_point: '30 minutes',
        recommended_action: 'Interactive break'
      }
    },
    {
      id: '3',
      title: 'Content Topic Resonance',
      summary: 'AI analysis reveals "hands-on demos" generate 3x more positive sentiment than theoretical content.',
      confidence_score: 0.91,
      insight_type: 'content',
      status: 'completed' as const,
      created_at: new Date().toISOString(),
      supporting_data: {
        demo_sentiment: 0.87,
        theory_sentiment: 0.29,
        engagement_multiplier: '3x'
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered insights and predictive analytics for your webinars
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI Insights Generated</p>
                  <p className="text-2xl font-bold text-blue-600">{insights.length}</p>
                </div>
                <Brain className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {insights.filter(i => i.status === 'completed').length} completed
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                  <p className="text-2xl font-bold text-green-600">87%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">High confidence insights</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Content Analysis</p>
                  <p className="text-2xl font-bold text-purple-600">5</p>
                </div>
                <MessageSquare className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Topics analyzed</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Custom Metrics</p>
                  <p className="text-2xl font-bold text-orange-600">3</p>
                </div>
                <Settings className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Active metrics</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="predictive" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Predictive
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Content Analysis
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Custom Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">AI-Generated Insights</h2>
            <Badge variant="secondary">{mockInsights.length} insights available</Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {mockInsights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <InsightCard
                  insight={insight}
                  onSave={handleSaveInsight}
                  onShare={handleShareInsight}
                  onExpand={handleExpandInsight}
                  isLoading={loading}
                />
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <PredictiveAnalytics webinarId={webinarId} />
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <ContentAnalysis webinarId={webinarId} />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <CustomMetricsBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
};
