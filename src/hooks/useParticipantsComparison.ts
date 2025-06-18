
import { useState } from 'react';
import { ZoomWebinarService } from '@/services/zoom/api/ZoomWebinarService';
import { useToast } from '@/hooks/use-toast';
import type { ParticipantsComparisonResult } from '@/services/zoom/api/ZoomWebinarDataService';

export const useParticipantsComparison = () => {
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ParticipantsComparisonResult | null>(null);
  const { toast } = useToast();

  const compareEndpoints = async (webinarId: string, options: { pageSize?: number; debugMode?: boolean } = {}) => {
    setIsComparing(true);
    
    try {
      const result = await ZoomWebinarService.compareParticipantsEndpoints(webinarId, options);
      setComparisonResult(result);
      
      toast({
        title: "Comparison Complete",
        description: `Report: ${result.reportEndpoint.count} participants, Past Webinars: ${result.pastWebinarEndpoint.count} participants`,
      });
      
      return result;
    } catch (error) {
      console.error('Error comparing endpoints:', error);
      toast({
        title: "Comparison Failed",
        description: error instanceof Error ? error.message : "Failed to compare participant endpoints",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsComparing(false);
    }
  };

  const clearComparison = () => {
    setComparisonResult(null);
  };

  return {
    isComparing,
    comparisonResult,
    compareEndpoints,
    clearComparison,
  };
};
