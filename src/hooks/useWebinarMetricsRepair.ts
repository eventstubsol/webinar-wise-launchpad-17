
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { WebinarMetricsRepairService } from '@/services/zoom/metrics/WebinarMetricsRepairService';

export const useWebinarMetricsRepair = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [repairReport, setRepairReport] = useState<any>(null);

  const repairMetricsMutation = useMutation({
    mutationFn: async (connectionId?: string) => {
      return await WebinarMetricsRepairService.batchRepairMetrics(connectionId);
    },
    onSuccess: (result) => {
      toast({
        title: "Metrics Repair Complete",
        description: `Successfully repaired ${result.successCount}/${result.totalProcessed} webinars. ${result.errorCount > 0 ? `${result.errorCount} errors occurred.` : ''}`,
        variant: result.errorCount > 0 ? "destructive" : "default",
      });
      
      setRepairReport(result);
      
      // Invalidate related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['webinar-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['webinars'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Metrics Repair Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async (connectionId?: string) => {
      return await WebinarMetricsRepairService.generateRepairReport(connectionId);
    },
    onSuccess: (report) => {
      console.log('Metrics Repair Report:', report);
      toast({
        title: "Repair Report Generated",
        description: `Found ${report.webinarsNeedingRepair} webinars needing repair.`,
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

  const repairSingleMutation = useMutation({
    mutationFn: async (webinarDbId: string) => {
      await WebinarMetricsRepairService.repairWebinarMetrics(webinarDbId);
      return { webinarDbId };
    },
    onSuccess: (result) => {
      toast({
        title: "Webinar Metrics Repaired",
        description: `Successfully repaired metrics for webinar.`,
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['webinar-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['webinars'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Single Webinar Repair Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    repairMetrics: repairMetricsMutation.mutate,
    isRepairing: repairMetricsMutation.isPending,
    repairError: repairMetricsMutation.error,
    repairReport,
    
    generateReport: generateReportMutation.mutate,
    isGeneratingReport: generateReportMutation.isPending,
    reportError: generateReportMutation.error,
    
    repairSingle: repairSingleMutation.mutate,
    isRepairingSingle: repairSingleMutation.isPending,
    singleRepairError: repairSingleMutation.error,
  };
};
