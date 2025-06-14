
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIInsightGeneration } from '@/hooks/useAIInsightGeneration';
import { Brain, Zap, TrendingUp, MessageSquare, DollarSign, Loader2, Play, Square } from 'lucide-react';

interface InsightGenerationPanelProps {
  webinarId: string;
  onInsightGenerated?: (insightId: string, type: string) => void;
}

const ANALYSIS_TYPES = [
  {
    id: 'engagement_analysis',
    title: 'Engagement Analysis',
    description: 'Analyze participant behavior, drop-off patterns, and engagement peaks',
    icon: <TrendingUp className="w-4 h-4" />,
    complexity: 'Complex',
    estimatedTime: '2-3 minutes'
  },
  {
    id: 'content_effectiveness',
    title: 'Content Effectiveness',
    description: 'Evaluate which content segments performed best and identify improvements',
    icon: <Brain className="w-4 h-4" />,
    complexity: 'Complex',
    estimatedTime: '2-3 minutes'
  },
  {
    id: 'sentiment_analysis',
    title: 'Sentiment Analysis',
    description: 'Analyze audience mood, satisfaction, and sentiment throughout the webinar',
    icon: <MessageSquare className="w-4 h-4" />,
    complexity: 'Medium',
    estimatedTime: '1-2 minutes'
  },
  {
    id: 'speaker_performance',
    title: 'Speaker Performance',
    description: 'Evaluate speaking effectiveness and audience engagement techniques',
    icon: <Zap className="w-4 h-4" />,
    complexity: 'Medium',
    estimatedTime: '1-2 minutes'
  },
  {
    id: 'roi_analysis',
    title: 'ROI Analysis',
    description: 'Calculate return on investment and business impact metrics',
    icon: <DollarSign className="w-4 h-4" />,
    complexity: 'Complex',
    estimatedTime: '2-3 minutes'
  }
];

export const InsightGenerationPanel: React.FC<InsightGenerationPanelProps> = ({
  webinarId,
  onInsightGenerated
}) => {
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
  const [streamingMode, setStreamingMode] = useState(true);

  const {
    generateInsight,
    cancelGeneration,
    reset,
    isGenerating,
    progress,
    currentInsightId,
    streamingContent
  } = useAIInsightGeneration({
    onInsightComplete: (insightId, result) => {
      onInsightGenerated?.(insightId, selectedAnalysis || '');
      reset();
    },
    onError: (error) => {
      console.error('Insight generation error:', error);
    }
  });

  const handleGenerateInsight = async (analysisType: string) => {
    setSelectedAnalysis(analysisType);
    await generateInsight({
      webinarId,
      analysisType: analysisType as any,
      stream: streamingMode
    });
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Complex': return 'destructive';
      case 'Medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Insights Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate Insights</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate" className="space-y-4">
              {isGenerating ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="font-medium">Generating AI Insights</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelGeneration}
                          className="flex items-center gap-1"
                        >
                          <Square className="w-3 h-3" />
                          Cancel
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{progress}</span>
                        </div>
                        <Progress value={progress ? 50 : 0} className="w-full" />
                      </div>

                      {streamingMode && streamingContent && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Live Analysis:</h4>
                          <div className="bg-gray-50 p-3 rounded-md text-sm max-h-40 overflow-y-auto">
                            <pre className="whitespace-pre-wrap">{streamingContent}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ANALYSIS_TYPES.map((analysis) => (
                    <Card key={analysis.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {analysis.icon}
                            <CardTitle className="text-sm">{analysis.title}</CardTitle>
                          </div>
                          <Badge variant={getComplexityColor(analysis.complexity)}>
                            {analysis.complexity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-gray-600">{analysis.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Est. {analysis.estimatedTime}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateInsight(analysis.id)}
                            className="flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            Generate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Streaming Mode</h4>
                    <p className="text-sm text-gray-600">
                      Show real-time analysis as it's generated
                    </p>
                  </div>
                  <Button
                    variant={streamingMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStreamingMode(!streamingMode)}
                  >
                    {streamingMode ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Model Selection:</strong> Complex analyses use GPT-4 for detailed insights, 
                    while simpler analyses use GPT-3.5-turbo for faster processing.
                  </AlertDescription>
                </Alert>

                <Alert>
                  <DollarSign className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Cost Control:</strong> Rate limited to 50 requests per hour. 
                    Estimated cost: $0.02-$0.10 per analysis depending on complexity.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
