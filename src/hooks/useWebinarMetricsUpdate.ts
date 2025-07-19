
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { MetricsOperations } from '@/services/zoom/operations/crud/MetricsOperations';
import { WebinarMetricsRecoveryService } from '@/services/zoom/metrics/WebinarMetricsRecoveryService';

export const useWebinarMetricsUpdate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recoveryReport, setRecoveryReport] = useState<any>(null);

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

  const recoveryMutation = useMutation({
    mutationFn: async (connectionId?: string) => {
      return await WebinarMetricsRecoveryService.fixWebinarsWithMissingMetrics(connectionId);
    },
    onSuccess: (result) => {
      setRecoveryReport(result);
      toast({
        title: "Metrics Recovery Complete",
        description: `Fixed ${result.totalFixed} webinars. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`,
        variant: result.errors.length > 0 ? "destructive" : "default",
      });
      
      // Invalidate related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['webinar-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['webinars'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Metrics Recovery Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (connectionId?: string) => {
      return await WebinarMetricsRecoveryService.generateMetricsReport(connectionId);
    },
    onSuccess: (report) => {
      console.log('Metrics Report:', report);
      toast({
        title: "Metrics Report Generated",
        description: `Found ${report.summary.webinarsWithParticipantsButZeroMetrics} webinars needing repair.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Report Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    updateMetrics: updateMetricsMutation.mutate,
    isUpdating: updateMetricsMutation.isPending,
    updateError: updateMetricsMutation.error,
    
    recoverMetrics: recoveryMutation.mutate,
    isRecovering: recoveryMutation.isPending,
    recoveryError: recoveryMutation.error,
    recoveryReport,
    
    generateReport: reportMutation.mutate,
    isGeneratingReport: reportMutation.isPending,
    reportError: reportMutation.error,
  };
};
