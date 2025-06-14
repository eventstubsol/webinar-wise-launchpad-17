
import { useState, useCallback } from 'react';
import { OpenAIInsightsService, GenerateInsightRequest, StreamingInsightEvent } from '@/services/ai-analytics/OpenAIInsightsService';
import { useToast } from '@/hooks/use-toast';

interface UseAIInsightGenerationOptions {
  onInsightComplete?: (insightId: string, result: any) => void;
  onError?: (error: string) => void;
}

export const useAIInsightGeneration = (options: UseAIInsightGenerationOptions = {}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [currentInsightId, setCurrentInsightId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const { toast } = useToast();

  const generateInsight = useCallback(async (request: GenerateInsightRequest) => {
    try {
      setIsGenerating(true);
      setProgress('Initializing AI analysis...');
      setStreamingContent('');

      if (request.stream) {
        // Use streaming generation
        await OpenAIInsightsService.generateStreamingInsight(
          request,
          (event: StreamingInsightEvent) => {
            switch (event.type) {
              case 'content_delta':
                if (event.content) {
                  setStreamingContent(prev => prev + event.content);
                }
                if (event.insightId && !currentInsightId) {
                  setCurrentInsightId(event.insightId);
                }
                break;

              case 'complete':
                setProgress('Analysis complete!');
                if (event.insightId) {
                  options.onInsightComplete?.(event.insightId, { streaming_content: streamingContent });
                  toast({
                    title: "AI Analysis Complete",
                    description: "Your insights have been generated successfully.",
                  });
                }
                setIsGenerating(false);
                break;

              case 'error':
                setProgress('Analysis failed');
                options.onError?.(event.error || 'Unknown error');
                toast({
                  title: "Analysis Failed",
                  description: event.error || "Failed to generate insights",
                  variant: "destructive",
                });
                setIsGenerating(false);
                break;
            }
          }
        );
      } else {
        // Use standard generation
        const response = await OpenAIInsightsService.generateInsight(request);
        
        if (response.success) {
          setCurrentInsightId(response.insightId);
          options.onInsightComplete?.(response.insightId, response.result);
          toast({
            title: "AI Analysis Complete",
            description: `Analysis completed in ${(response.processingTime || 0) / 1000}s`,
          });
        } else {
          throw new Error(response.error || 'Failed to generate insight');
        }
        
        setIsGenerating(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate insights';
      setProgress('Analysis failed');
      options.onError?.(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  }, [currentInsightId, streamingContent, options, toast]);

  const cancelGeneration = useCallback(async () => {
    if (currentInsightId) {
      try {
        await OpenAIInsightsService.cancelInsight(currentInsightId);
        setIsGenerating(false);
        setProgress('Analysis cancelled');
        toast({
          title: "Analysis Cancelled",
          description: "The insight generation has been cancelled.",
        });
      } catch (error) {
        console.error('Failed to cancel insight generation:', error);
      }
    }
  }, [currentInsightId, toast]);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress('');
    setCurrentInsightId(null);
    setStreamingContent('');
  }, []);

  return {
    generateInsight,
    cancelGeneration,
    reset,
    isGenerating,
    progress,
    currentInsightId,
    streamingContent
  };
};
