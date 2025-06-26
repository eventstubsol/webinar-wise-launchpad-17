
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { MetricsOperations } from '@/services/zoom/operations/crud/MetricsOperations';

export const useWebinarMetricsUpdate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMetricsMutation = useMutation({
    mutationFn: async (connectionId?: string) => {
      return await MetricsOperations.batchUpdateMissingMetrics(connectionId);
    },
    onSuccess: (updatedCount) => {
      toast({
        title: "Metrics Updated",
        description: `Successfully updated metrics for ${updatedCount} webinars.`,
      });
      
      // Invalidate related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['webinar-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['webinars'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Metrics Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    updateMetrics: updateMetricsMutation.mutate,
    isUpdating: updateMetricsMutation.isPending,
    error: updateMetricsMutation.error,
  };
};
