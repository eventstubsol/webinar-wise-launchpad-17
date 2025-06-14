
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OpenAIInsightsService } from '@/services/ai-analytics/OpenAIInsightsService';
import { Brain, CheckCircle, AlertCircle, Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StreamingInsightViewerProps {
  insightId: string;
  title?: string;
  onClose?: () => void;
}

export const StreamingInsightViewer: React.FC<StreamingInsightViewerProps> = ({
  insightId,
  title,
  onClose
}) => {
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        setLoading(true);
        const data = await OpenAIInsightsService.getInsightStatus(insightId);
        setInsight(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load insight');
      } finally {
        setLoading(false);
      }
    };

    fetchInsight();

    // Poll for updates if insight is still processing
    const pollInterval = setInterval(() => {
      if (insight?.status === 'processing') {
        fetchInsight();
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [insightId, insight?.status]);

  const handleCopyToClipboard = async () => {
    try {
      let textToCopy = '';
      
      if (insight?.insight_data && typeof insight.insight_data === 'object') {
        textToCopy = JSON.stringify(insight.insight_data, null, 2);
      } else if (insight?.insight_summary) {
        textToCopy = insight.insight_summary;
      }

      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied to Clipboard",
        description: "Insight content has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    try {
      let content = '';
      let filename = `insight-${insightId}.txt`;

      if (insight?.insight_data && typeof insight.insight_data === 'object') {
        content = JSON.stringify(insight.insight_data, null, 2);
        filename = `insight-${insightId}.json`;
      } else if (insight?.insight_summary) {
        content = insight.insight_summary;
      }

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Your insight has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download insight.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Brain className="w-4 h-4 animate-pulse" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const renderInsightContent = () => {
    if (!insight?.insight_data) {
      return (
        <div className="text-gray-500 text-center py-8">
          No insight data available
        </div>
      );
    }

    // If it's a JSON object, render it in a structured way
    if (typeof insight.insight_data === 'object') {
      return (
        <div className="space-y-4">
          {Object.entries(insight.insight_data).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <h4 className="font-medium text-sm uppercase tracking-wide text-gray-700">
                {key.replace(/_/g, ' ')}
              </h4>
              <div className="bg-gray-50 p-3 rounded-md">
                {Array.isArray(value) ? (
                  <ul className="space-y-1">
                    {value.map((item, index) => (
                      <li key={index} className="text-sm">
                        • {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                      </li>
                    ))}
                  </ul>
                ) : typeof value === 'object' ? (
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm">{String(value)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // If it's a string, render it as text
    return (
      <div className="prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap text-sm">
          {String(insight.insight_data)}
        </pre>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Brain className="w-8 h-8 animate-pulse mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading insight...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load insight: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(insight?.status)}
              {title || insight?.insight_title || 'AI Insight'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(insight?.status)}>
                {insight?.status}
              </Badge>
              {insight?.confidence_score && (
                <Badge variant="outline">
                  {Math.round(insight.confidence_score * 100)}% confidence
                </Badge>
              )}
              {insight?.ai_model_name && (
                <Badge variant="outline">
                  {insight.ai_model_name}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {insight?.status === 'failed' && insight?.error_message && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {insight.error_message}
            </AlertDescription>
          </Alert>
        )}

        {insight?.status === 'processing' && (
          <Alert className="mb-4">
            <Brain className="h-4 w-4 animate-pulse" />
            <AlertDescription>
              AI analysis is in progress. This may take a few minutes...
            </AlertDescription>
          </Alert>
        )}

        {renderInsightContent()}

        {insight?.processing_duration_ms && (
          <div className="mt-4 pt-4 border-t text-xs text-gray-500">
            Generated in {(insight.processing_duration_ms / 1000).toFixed(1)} seconds
          </div>
        )}
      </CardContent>
    </Card>
  );
};
