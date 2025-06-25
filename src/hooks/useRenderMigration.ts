
import { useCallback } from 'react';
import { ZoomSyncMigrationService } from '@/services/zoom/ZoomSyncMigrationService';
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
      const result = await ZoomSyncMigrationService.invokeFunction(functionName, payload);
      
      // Show migration notice
      toast({
        title: "Function Migrated",
        description: `${functionName} now uses Render API instead of Edge Functions`,
        duration: 3000,
      });
      
      return { data: result, error: null };
    } catch (error) {
      console.error(`Migration error for ${functionName}:`, error);
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Migration failed' 
        } 
      };
    }
  }, [toast]);

  return { invokeFunction };
};
