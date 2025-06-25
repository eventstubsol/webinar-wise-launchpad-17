
import { useState, useEffect } from 'react';
import { EngagementPredictionsService } from '@/services/ai-analytics/EngagementPredictionsService';
import { EngagementPrediction } from '@/types/ai-analytics';
import { useToast } from '@/hooks/use-toast';

interface UseEngagementPredictionsOptions {
  webinarId?: string;
  predictionType?: string;
  realtimeMode?: boolean;
  realtimeMinutes?: number;
}

export const useEngagementPredictions = (options: UseEngagementPredictionsOptions = {}) => {
  const [predictions, setPredictions] = useState<EngagementPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelMetrics, setModelMetrics] = useState<any>(null);
  const { toast } = useToast();

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let predictionsData;
      
      if (options.realtimeMode && options.webinarId) {
        predictionsData = await EngagementPredictionsService.getRealtimePredictions(
          options.webinarId,
          options.realtimeMinutes
        );
      } else {
        predictionsData = await EngagementPredictionsService.getUserPredictions({
          webinarId: options.webinarId,
          predictionType: options.predictionType,
          limit: 100
        });
      }
      
      setPredictions(predictionsData);
      
      // Fetch model metrics separately
      const metrics = await EngagementPredictionsService.getModelAccuracyMetrics();
      setModelMetrics(metrics);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch engagement predictions';
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

  const createPrediction = async (predictionData: any) => {
    try {
      const newPrediction = await EngagementPredictionsService.createPrediction(predictionData);
      setPredictions(prev => [newPrediction, ...prev]);
      return newPrediction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create prediction';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const validatePrediction = async (id: string, actualValue: number) => {
    try {
      const validatedPrediction = await EngagementPredictionsService.validatePrediction(id, actualValue);
      setPredictions(prev => prev.map(prediction => 
        prediction.id === id ? validatedPrediction : prediction
      ));
      
      toast({
        title: "Success",
        description: "Prediction validated successfully",
      });
      
      return validatedPrediction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate prediction';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [options.webinarId, options.predictionType]);

  // Real-time mode auto-refresh
  useEffect(() => {
    if (!options.realtimeMode) return;

    const interval = setInterval(() => {
      fetchPredictions();
    }, 10000); // Refresh every 10 seconds in real-time mode

    return () => clearInterval(interval);
  }, [options.realtimeMode]);

  return {
    predictions,
    modelMetrics,
    loading,
    error,
    refetch: fetchPredictions,
    createPrediction,
    validatePrediction,
  };
};
