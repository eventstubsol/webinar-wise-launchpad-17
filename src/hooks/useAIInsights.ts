
import { useState, useEffect } from 'react';
import { AIInsightsService } from '@/services/ai-analytics/AIInsightsService';
import { AIInsight } from '@/types/ai-analytics';
import { useToast } from '@/hooks/use-toast';

interface UseAIInsightsOptions {
  webinarId?: string;
  insightType?: string;
  status?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useAIInsights = (options: UseAIInsightsOptions = {}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const { toast } = useToast();

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [insightsData, summaryData] = await Promise.all([
        AIInsightsService.getUserInsights({
          webinarId: options.webinarId,
          insightType: options.insightType,
          status: options.status,
          limit: 50
        }),
        AIInsightsService.getInsightsSummary()
      ]);
      
      setInsights(insightsData);
      setSummary(summaryData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch AI insights';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createInsight = async (insightData: any) => {
    try {
      const newInsight = await AIInsightsService.createInsight(insightData);
      setInsights(prev => [newInsight, ...prev]);
      
      toast({
        title: "Success",
        description: "AI insight created successfully",
      });
      
      return newInsight;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create insight';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateInsightStatus = async (id: string, status: string, errorMessage?: string) => {
    try {
      const updatedInsight = await AIInsightsService.updateInsightStatus(id, status, errorMessage);
      setInsights(prev => prev.map(insight => 
        insight.id === id ? updatedInsight : insight
      ));
      return updatedInsight;
    } catch (err) {
      console.error('Failed to update insight status:', err);
      throw err;
    }
  };

  const deleteInsight = async (id: string) => {
    try {
      await AIInsightsService.deleteInsight(id);
      setInsights(prev => prev.filter(insight => insight.id !== id));
      
      toast({
        title: "Success",
        description: "AI insight deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete insight';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [options.webinarId, options.insightType, options.status]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!options.autoRefresh) return;

    const interval = setInterval(() => {
      fetchInsights();
    }, options.refreshInterval || 30000); // Default 30 seconds

    return () => clearInterval(interval);
  }, [options.autoRefresh, options.refreshInterval]);

  return {
    insights,
    summary,
    loading,
    error,
    refetch: fetchInsights,
    createInsight,
    updateInsightStatus,
    deleteInsight,
  };
};
