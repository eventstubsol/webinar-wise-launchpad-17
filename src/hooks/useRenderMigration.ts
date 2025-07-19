
import { useCallback } from 'react';
import { ZoomSyncMigrationService } from '@/services/zoom/ZoomSyncMigrationService';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to help migrate from Edge Functions to Render API
 * Provides a drop-in replacement for supabase.functions.invoke calls
 */
export const useRenderMigration = () => {
  const { toast } = useToast();

  const invokeFunction = useCallback(async (functionName: string, payload: any) => {
    try {
      console.log(`Migrating edge function call: ${functionName}`);
      
      // Check if Render service is available
      const healthCheck = await RenderZoomService.healthCheck();
      if (!healthCheck.success) {
        throw new Error('Render service is currently unavailable');
      }

      const result = await ZoomSyncMigrationService.invokeFunction(functionName, payload);
      
      // Show migration notice for development
      if (process.env.NODE_ENV === 'development') {
        toast({
          title: "Function Migrated",
          description: `${functionName} now uses Render API instead of Edge Functions`,
          duration: 3000,
        });
      }
      
      return { data: result, error: null };
    } catch (error) {
      console.error(`Migration error for ${functionName}:`, error);
      
      // Show error toast
      toast({
        title: "Migration Error",
        description: `Failed to migrate ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Migration failed' 
        } 
      };
    }
  }, [toast]);

  // Direct Render API methods for better performance
  const renderAPI = {
    validateCredentials: RenderZoomService.validateCredentials,
    testConnection: RenderZoomService.testConnection,
    startSync: RenderZoomService.startSync,
    getSyncProgress: RenderZoomService.getSyncProgress,
    cancelSync: RenderZoomService.cancelSync,
    syncWebinars: RenderZoomService.syncWebinars,
    runPerformanceTest: RenderZoomService.runPerformanceTest,
    disconnectAccount: RenderZoomService.disconnectAccount,
    healthCheck: RenderZoomService.healthCheck,
  };

  return { 
    invokeFunction,
    renderAPI,
    isRenderAvailable: async () => {
      const health = await RenderZoomService.healthCheck();
      return health.success;
    }
  };
};
