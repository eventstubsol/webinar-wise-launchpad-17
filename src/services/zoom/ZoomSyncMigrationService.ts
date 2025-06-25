
import { RenderZoomService } from './RenderZoomService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Service to handle migration from Edge Functions to Render.com API
 * This service provides the same interface as the old edge functions but uses Render API
 */
export class ZoomSyncMigrationService {
  /**
   * Progressive sync - migrated from edge function
   */
  static async progressiveSync(connectionId: string, options: {
    webinarId?: string;
    debug?: boolean;
    testMode?: boolean;
  } = {}) {
    return await RenderZoomService.syncWebinars(connectionId, {
      type: 'progressive',
      ...options
    });
  }

  /**
   * Simple sync - migrated from edge function
   */
  static async simpleSync(connectionId: string, options: {
    syncType?: 'manual' | 'incremental';
    webinarId?: string;
  } = {}) {
    return await RenderZoomService.syncWebinars(connectionId, {
      type: options.syncType || 'manual',
      webinarId: options.webinarId
    });
  }

  /**
   * Enhanced sync - migrated from edge function
   */
  static async enhancedSync(connectionId: string, options: {
    syncType?: 'manual' | 'incremental';
    priority?: 'low' | 'normal' | 'high';
    debug?: boolean;
    testMode?: boolean;
    webinarId?: string;
  } = {}) {
    return await RenderZoomService.syncWebinars(connectionId, options);
  }

  /**
   * Test sync error handling - migrated from edge function
   */
  static async testSyncErrorHandling(connectionId: string) {
    return await RenderZoomService.runPerformanceTest(connectionId);
  }

  /**
   * Test rate limits - migrated from edge function
   */
  static async testRateLimits(connectionId: string) {
    return await RenderZoomService.runPerformanceTest(connectionId);
  }

  /**
   * Get sync progress - now using Render API
   */
  static async getSyncProgress(syncId: string) {
    return await RenderZoomService.getSyncProgress(syncId);
  }

  /**
   * Legacy function invocation handler
   * This catches any remaining edge function calls and redirects to Render API
   */
  static async invokeFunction(functionName: string, payload: any) {
    console.warn(`Legacy edge function called: ${functionName}. Migrating to Render API...`);
    
    const connectionId = payload.connectionId || payload.connection_id;
    
    switch (functionName) {
      case 'zoom-progressive-sync':
        return await this.progressiveSync(connectionId, payload);
      
      case 'zoom-sync-simple':
        return await this.simpleSync(connectionId, payload);
      
      case 'zoom-sync-webinars':
      case 'zoom-sync-webinars-v2':
        return await this.enhancedSync(connectionId, payload);
      
      case 'zoom-sync-progress':
        return await this.getSyncProgress(payload.syncId || payload.sync_id);
      
      case 'test-sync-error-handling':
        return await this.testSyncErrorHandling(connectionId);
      
      case 'test-zoom-rate-limits':
        return await this.testRateLimits(connectionId);
      
      default:
        throw new Error(`Unknown function: ${functionName}. Please update to use Render API directly.`);
    }
  }
}
