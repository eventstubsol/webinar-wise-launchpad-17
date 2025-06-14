
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  MessageSquare, 
  Target,
  ArrowRight,
  Sparkles,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AIAnalyticsSection: React.FC = () => {
  const navigate = useNavigate();

  // Mock data for the preview cards
  const insightPreview = {
    total: 12,
    confidence: 87,
    processing: 2,
    completed: 10
  };

  const recentInsights = [
    {
      id: '1',
      title: 'Peak Engagement Window',
      summary: 'Highest engagement at 15-25 minute mark',
      confidence: 0.89,
      type: 'engagement'
    },
    {
      id: '2',
      title: 'Dropout Risk Prediction',
      summary: '23% dropout risk after 30 minutes',
      confidence: 0.76,
      type: 'predictive'
    },
    {
      id: '3',
      title: 'Content Sentiment Analysis',
      summary: 'Demos generate 3x more positive sentiment',
      confidence: 0.91,
      type: 'content'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold">AI Analytics</h2>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            Powered by OpenAI
          </Badge>
        </div>
        <Button 
          onClick={() => navigate('/analytics')}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
        >
          View Advanced Analytics
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AI Insights Overview */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-blue-600 font-medium">AI Insights</p>
                <p className="text-2xl font-bold text-blue-900">{insightPreview.total}</p>
              </div>
              <Brain className="w-8 h-8 text-blue-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-blue-700">Confidence</span>
                <span className="text-blue-900 font-medium">{insightPreview.confidence}%</span>
              </div>
              <Progress value={insightPreview.confidence} className="h-1" />
            </div>
            <div className="flex justify-between text-xs text-blue-600 mt-2">
              <span>{insightPreview.completed} completed</span>
              <span>{insightPreview.processing} processing</span>
            </div>
          </CardContent>
        </Card>

        {/* Predictive Analytics */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-green-600 font-medium">Predictions</p>
                <p className="text-2xl font-bold text-green-900">89%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-xs text-green-700">Accuracy rate</p>
            <div className="mt-2">
              <Badge variant="outline" className="text-green-700 border-green-300 text-xs">
                <Activity className="w-3 h-3 mr-1" />
                Real-time
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Content Analysis */}
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-purple-600 font-medium">Content Insights</p>
                <p className="text-2xl font-bold text-purple-900">76%</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-xs text-purple-700">Positive sentiment</p>
            <div className="mt-2">
              <Badge variant="outline" className="text-purple-700 border-purple-300 text-xs">
                5 topics analyzed
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Custom Metrics */}
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-orange-600 font-medium">Custom KPIs</p>
                <p className="text-2xl font-bold text-orange-900">3</p>
              </div>
              <Target className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-xs text-orange-700">Active metrics</p>
            <div className="mt-2">
              <Badge variant="outline" className="text-orange-700 border-orange-300 text-xs">
                2 alerts set
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Insights Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <span>Recent AI Insights</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/analytics')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentInsights.map((insight) => (
              <div key={insight.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <p className="text-xs text-gray-600">{insight.summary}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                  >
                    {Math.round(insight.confidence * 100)}% confidence
                  </Badge>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {insight.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
