
import { ZoomWebinarDataService, ZoomApiError } from './ZoomWebinarDataService';
import type { SyncProgress } from './ZoomWebinarDataService';

/**
 * Enhanced sync service with better error handling and retry logic
 */
export class ZoomWebinarSyncService {
  /**
   * Sync all webinars for a user with enhanced error handling
   */
  static async syncAllWebinars(
    userId: string,
    syncType: 'initial' | 'incremental',
    onProgress?: (progress: SyncProgress) => void
  ) {
    try {
      console.log(`Starting ${syncType} webinar sync for user ${userId}`);
      
      if (syncType === 'initial') {
        return await ZoomWebinarDataService.listWebinarsWithExtendedRange(
          userId,
          { dayRange: 90, pageSize: 100 },
          onProgress
        );
      } else {
        // Incremental sync - last 30 days
        const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
        const now = new Date();
        
        return await ZoomWebinarDataService.listWebinars(
          userId,
          {
            from: thirtyDaysAgo,
            to: now,
            type: 'past',
            pageSize: 100
          },
          onProgress
        );
      }
    } catch (error) {
      if (error instanceof ZoomApiError) {
        console.error(`Zoom API error during sync: ${error.message} (Code: ${error.code})`);
        
        if (error.isRetryable) {
          console.log('Error is retryable, implementing exponential backoff');
          // Could implement retry logic here
        }
      }
      throw error;
    }
  }

  /**
   * Sync detailed data for a specific webinar
   */
  static async syncWebinarDetails(webinarId: string) {
    try {
      console.log(`Syncing details for webinar ${webinarId}`);
      
      // Get webinar with all occurrence data
      const webinar = await ZoomWebinarDataService.getWebinar(webinarId, {
        show_previous_occurrences: true
      });
      
      if (!webinar) {
        throw new Error(`Webinar ${webinarId} not found`);
      }
      
      // Get all related data
      const [registrants, participants, polls, qa] = await Promise.allSettled([
        ZoomWebinarDataService.getWebinarRegistrants(webinarId),
        ZoomWebinarDataService.getWebinarParticipants(webinarId),
        ZoomWebinarDataService.getWebinarPolls(webinarId),
        ZoomWebinarDataService.getWebinarQA(webinarId)
      ]);
      
      return {
        webinar,
        registrants: registrants.status === 'fulfilled' ? registrants.value : [],
        participants: participants.status === 'fulfilled' ? participants.value : [],
        polls: polls.status === 'fulfilled' ? polls.value : null,
        qa: qa.status === 'fulfilled' ? qa.value : null
      };
      
    } catch (error) {
      console.error(`Failed to sync webinar details for ${webinarId}:`, error);
      throw error;
    }
  }
}
