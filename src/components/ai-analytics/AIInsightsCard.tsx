
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AIInsight } from '@/types/ai-analytics';
import { Brain, Clock, Zap, AlertCircle } from 'lucide-react';

interface AIInsightsCardProps {
  insight: AIInsight;
  onViewDetails?: (insight: AIInsight) => void;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ 
  insight, 
  onViewDetails 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'engagement': return <Zap className="w-4 h-4" />;
      case 'predictive': return <Brain className="w-4 h-4" />;
      case 'content': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onViewDetails?.(insight)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(insight.insight_type)}
            <CardTitle className="text-sm font-medium">
              {insight.insight_title}
            </CardTitle>
          </div>
          <Badge 
            variant="secondary" 
            className={getStatusColor(insight.status)}
          >
            {insight.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {insight.insight_summary && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {insight.insight_summary}
          </p>
        )}
        
        {insight.confidence_score && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Confidence</span>
              <span>{(insight.confidence_score * 100).toFixed(0)}%</span>
            </div>
            <Progress value={insight.confidence_score * 100} className="h-1" />
          </div>
        )}
        
        <div className="flex justify-between text-xs text-gray-500">
          <span className="flex items-center space-x-1">
            <Brain className="w-3 h-3" />
            <span>{insight.ai_model_name}</span>
          </span>
          <span>
            {formatDuration(insight.processing_duration_ms)}
          </span>
        </div>
        
        <div className="text-xs text-gray-400">
          {new Date(insight.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
