
import { EdgeFunctionZoomService } from './EdgeFunctionZoomService';

/**
 * Service to handle migration from legacy function calls to Edge Functions
 * This service provides backward compatibility for old function names
 */
export class ZoomSyncMigrationService {
  /**
   * Progressive sync - now using Edge Functions
   */
  static async progressiveSync(connectionId: string, options: {
    webinarId?: string;
    debug?: boolean;
    testMode?: boolean;
  } = {}) {
    return await EdgeFunctionZoomService.syncWebinars(connectionId, {
      type: 'progressive',
      ...options
    });
  }

  /**
   * Simple sync - now using Edge Functions
   */
  static async simpleSync(connectionId: string, options: {
    syncType?: 'manual' | 'incremental';
    webinarId?: string;
  } = {}) {
    return await EdgeFunctionZoomService.syncWebinars(connectionId, {
      type: options.syncType || 'manual',
      webinarId: options.webinarId
    });
  }

  /**
   * Enhanced sync - now using Edge Functions
   */
  static async enhancedSync(connectionId: string, options: {
    syncType?: 'manual' | 'incremental';
    priority?: 'low' | 'normal' | 'high';
    debug?: boolean;
    testMode?: boolean;
    webinarId?: string;
  } = {}) {
    return await EdgeFunctionZoomService.syncWebinars(connectionId, options);
  }

  /**
   * Test sync error handling - now using Edge Functions
   */
  static async testSyncErrorHandling(connectionId: string) {
    return await EdgeFunctionZoomService.runPerformanceTest(connectionId);
  }

  /**
   * Test rate limits - now using Edge Functions
   */
  static async testRateLimits(connectionId: string) {
    return await EdgeFunctionZoomService.runPerformanceTest(connectionId);
  }

  /**
   * Get sync progress - now using Edge Functions
   */
  static async getSyncProgress(syncId: string) {
    return await EdgeFunctionZoomService.getSyncProgress(syncId);
  }

  /**
   * Legacy function invocation handler
   * This catches any remaining legacy calls and redirects to Edge Functions
   */
  static async invokeFunction(functionName: string, payload: any) {
    console.warn(`Legacy function called: ${functionName}. Using Edge Functions...`);
    
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
        throw new Error(`Unknown function: ${functionName}. Please update to use Edge Functions directly.`);
    }
  }
}
