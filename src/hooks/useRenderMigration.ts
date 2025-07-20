
import { useCallback } from 'react';
import { ZoomSyncMigrationService } from '@/services/zoom/ZoomSyncMigrationService';
import { EdgeFunctionZoomService } from '@/services/zoom/EdgeFunctionZoomService';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to help migrate from old patterns to Edge Functions
 * Provides a drop-in replacement for legacy function calls
 */
export const useRenderMigration = () => {
  const { toast } = useToast();

  const invokeFunction = useCallback(async (functionName: string, payload: any) => {
    try {
      console.log(`Invoking Edge Function for: ${functionName}`);
      
      // Check if Edge Functions are available (they always are if Supabase is running)
      const healthCheck = await EdgeFunctionZoomService.healthCheck();
      if (!healthCheck.success) {
        throw new Error('Edge Functions are currently unavailable');
      }

      const result = await ZoomSyncMigrationService.invokeFunction(functionName, payload);
      
      // Show migration notice for development
      if (process.env.NODE_ENV === 'development') {
        toast({
          title: "Using Edge Functions",
          description: `${functionName} now uses Supabase Edge Functions`,
          duration: 3000,
        });
      }
      
      return { data: result, error: null };
    } catch (error) {
      console.error(`Edge Function error for ${functionName}:`, error);
      
      // Show error toast
      toast({
        title: "Edge Function Error",
        description: `Failed to execute ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Edge Function failed' 
        } 
      };
    }
  }, [toast]);

  // Direct Edge Function methods for better performance
  const edgeAPI = {
    validateCredentials: EdgeFunctionZoomService.validateCredentials,
    testConnection: EdgeFunctionZoomService.testConnection,
    startSync: EdgeFunctionZoomService.startSync,
    getSyncProgress: EdgeFunctionZoomService.getSyncProgress,
    cancelSync: EdgeFunctionZoomService.cancelSync,
    syncWebinars: EdgeFunctionZoomService.syncWebinars,
    runPerformanceTest: EdgeFunctionZoomService.runPerformanceTest,
    disconnectAccount: EdgeFunctionZoomService.disconnectAccount,
    healthCheck: EdgeFunctionZoomService.healthCheck,
  };

  return { 
    invokeFunction,
    edgeAPI,
    isEdgeFunctionsAvailable: async () => {
      const health = await EdgeFunctionZoomService.healthCheck();
      return health.success;
    }
  };
};
