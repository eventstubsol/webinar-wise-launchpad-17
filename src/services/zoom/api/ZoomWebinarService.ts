
import { ZoomWebinarDataService } from './ZoomWebinarDataService';
import { ZoomWebinarSyncService } from './ZoomWebinarSyncService';
import { ZoomWebinarTransformService } from './ZoomWebinarTransformService';

// Re-export types for backward compatibility
export type { ZoomWebinarApiResponse, ListWebinarsOptions, SyncProgress } from './ZoomWebinarDataService';

/**
 * Main Zoom Webinar Service that delegates to specialized services
 */
export class ZoomWebinarService {
  /**
   * List webinars with automatic pagination and date filtering
   */
  static async listWebinars(
    userId: string, 
    options: any = {},
    onProgress?: (progress: any) => void
  ) {
    return ZoomWebinarDataService.listWebinars(userId, options, onProgress);
  }

  /**
   * Get detailed information about a specific webinar
   */
  static async getWebinar(webinarId: string) {
    return ZoomWebinarDataService.getWebinar(webinarId);
  }

  /**
   * Get webinar registrants with pagination support
   */
  static async getWebinarRegistrants(webinarId: string, options: any = {}) {
    return ZoomWebinarDataService.getWebinarRegistrants(webinarId, options);
  }

  /**
   * Get webinar participants with engagement metrics
   */
  static async getWebinarParticipants(webinarId: string, options: any = {}) {
    return ZoomWebinarDataService.getWebinarParticipants(webinarId, options);
  }

  /**
   * Get webinar polls
   */
  static async getWebinarPolls(webinarId: string) {
    return ZoomWebinarDataService.getWebinarPolls(webinarId);
  }

  /**
   * Get webinar Q&A
   */
  static async getWebinarQA(webinarId: string) {
    return ZoomWebinarDataService.getWebinarQA(webinarId);
  }

  /**
   * Batch operation: Sync all webinars for a user
   */
  static async syncAllWebinars(
    userId: string,
    syncType: 'initial' | 'incremental',
    onProgress?: (progress: any) => void
  ) {
    return ZoomWebinarSyncService.syncAllWebinars(userId, syncType, onProgress);
  }

  /**
   * Batch operation: Sync detailed data for a specific webinar
   */
  static async syncWebinarDetails(webinarId: string) {
    return ZoomWebinarSyncService.syncWebinarDetails(webinarId);
  }

  /**
   * Transform Zoom API webinar response to database format
   */
  static transformWebinarForDatabase(apiWebinar: any, connectionId: string) {
    return ZoomWebinarTransformService.transformWebinarForDatabase(apiWebinar, connectionId);
  }
}
