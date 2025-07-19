
import { supabase } from '@/integrations/supabase/client';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';
import { SyncRecoveryService } from './SyncRecoveryService';
import { SyncType } from '@/types/zoom';

/**
 * Enhanced sync management service with fallback mechanisms
 */
export class SyncManagementService {
  private static readonly MAX_RENDER_WARMUP_ATTEMPTS = 3;
  private static readonly RENDER_WARMUP_TIMEOUT = 15000; // 15 seconds
  private static readonly RENDER_HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds

  /**
   * Pre-warm the Render service to avoid cold start issues
   */
  static async warmupRenderService(): Promise<{ success: boolean; message: string }> {
    console.log('🔥 Warming up Render service...');
    
    for (let attempt = 1; attempt <= this.MAX_RENDER_WARMUP_ATTEMPTS; attempt++) {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          RenderZoomService.healthCheck(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), this.RENDER_HEALTH_CHECK_TIMEOUT)
          )
        ]) as any;

        const duration = Date.now() - startTime;
        console.log(`🔥 Render warmup attempt ${attempt}: ${duration}ms`);

        if (result.success) {
          console.log(`✅ Render service warmed up successfully in ${duration}ms`);
          return { success: true, message: `Service ready (${duration}ms)` };
        }
      } catch (error) {
        console.log(`❌ Render warmup attempt ${attempt} failed:`, error instanceof Error ? error.message : 'Unknown error');
        
        if (attempt < this.MAX_RENDER_WARMUP_ATTEMPTS) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    return { 
      success: false, 
      message: 'Render service is not responding. Using direct sync mode.' 
    };
  }

  /**
   * Start a sync with enhanced reliability and fallback mechanisms
   */
  static async startReliableSync(
    connectionId: string, 
    syncType: SyncType = SyncType.MANUAL
  ): Promise<{ success: boolean; syncId?: string; message: string; mode: 'render' | 'direct' }> {
    
    // Step 1: Force cleanup any existing stuck syncs
    console.log('🧹 Cleaning up any stuck syncs...');
    const cleanup = await SyncRecoveryService.forceCleanupStuckSyncs(connectionId);
    if (cleanup.count > 0) {
      console.log(`✅ Cleaned up ${cleanup.count} stuck sync(s)`);
    }

    // Step 2: Try Render service with warmup
    console.log('🚀 Attempting Render service sync...');
    const warmup = await this.warmupRenderService();
    
    if (warmup.success) {
      try {
        const renderResult = await Promise.race([
          RenderZoomService.startSync(connectionId, syncType),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Render sync start timeout')), this.RENDER_WARMUP_TIMEOUT)
          )
        ]) as any;

        if (renderResult.success && renderResult.syncId) {
          console.log('✅ Render sync started successfully');
          return {
            success: true,
            syncId: renderResult.syncId,
            message: renderResult.message || 'Sync started via Render service',
            mode: 'render'
          };
        }
      } catch (error) {
        console.log('❌ Render sync failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Step 3: Fallback to direct Supabase edge function
    console.log('🔄 Falling back to direct sync mode...');
    try {
      const directResult = await this.startDirectSync(connectionId, syncType);
      return {
        ...directResult,
        mode: 'direct'
      };
    } catch (error) {
      console.error('❌ Direct sync also failed:', error);
      return {
        success: false,
        message: `Both sync methods failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        mode: 'direct'
      };
    }
  }

  /**
   * Start sync directly via Supabase edge function
   */
  private static async startDirectSync(
    connectionId: string, 
    syncType: SyncType
  ): Promise<{ success: boolean; syncId?: string; message: string }> {
    
    // Create a sync log entry first
    const { data: syncLog, error: syncLogError } = await supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: syncType,
        sync_status: 'started',
        started_at: new Date().toISOString(),
        sync_stage: 'initializing',
        stage_progress_percentage: 5
      })
      .select('id')
      .single();

    if (syncLogError || !syncLog) {
      throw new Error(`Failed to create sync log: ${syncLogError?.message}`);
    }

    // Call the zoom-sync-webinars edge function directly
    const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
      body: {
        connectionId: connectionId,
        syncLogId: syncLog.id,
        syncType: syncType,
        requestId: `direct-${Date.now()}`
      }
    });

    if (error) {
      // Update sync log as failed
      await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'failed',
          error_message: `Direct sync failed: ${error.message}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      throw new Error(`Direct sync failed: ${error.message}`);
    }

    return {
      success: true,
      syncId: syncLog.id,
      message: 'Direct sync started successfully'
    };
  }

  /**
   * Check if Render service is healthy
   */
  static async isRenderServiceHealthy(): Promise<boolean> {
    try {
      const result = await Promise.race([
        RenderZoomService.healthCheck(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]) as any;

      return result.success;
    } catch {
      return false;
    }
  }
}
