
import { EnhancedWebinarOperations } from './EnhancedWebinarOperations';
import { RegistrantOperations } from './RegistrantOperations';
import { ParticipantOperations } from './ParticipantOperations';
import { PollOperations } from './PollOperations';
import { QAOperations } from './QAOperations';

/**
 * Comprehensive batch operations for complete webinar data sync
 */
export class ComprehensiveBatchOperations {
  /**
   * Complete webinar data sync with all related data and metrics calculation
   */
  static async syncCompleteWebinarData(
    webinarData: any,
    registrants: any[],
    participants: any[],
    polls: any[],
    qnaData: any[],
    connectionId: string
  ): Promise<string> {
    console.log(`Starting comprehensive sync for webinar ${webinarData.id}`);
    
    try {
      // 1. Upsert webinar with enhanced field mapping
      const webinarDbId = await EnhancedWebinarOperations.upsertWebinar(webinarData, connectionId);
      console.log(`Webinar upserted with ID: ${webinarDbId}`);

      // 2. Sync all related data in parallel for efficiency
      const dataOperations = [
        RegistrantOperations.upsertRegistrants(registrants, webinarDbId),
        ParticipantOperations.upsertParticipants(participants, webinarDbId),
        PollOperations.upsertPolls(polls, webinarDbId),
        QAOperations.upsertQnA(qnaData, webinarDbId)
      ];

      await Promise.all(dataOperations);
      console.log(`All related data synced for webinar ${webinarData.id}`);

      // 3. Calculate and update metrics after all data is synced
      await EnhancedWebinarOperations.updateWebinarMetrics(webinarDbId);
      console.log(`Metrics updated for webinar ${webinarData.id}`);

      return webinarDbId;
    } catch (error) {
      console.error(`Error in comprehensive webinar sync for ${webinarData.id}:`, error);
      throw error;
    }
  }

  /**
   * Batch sync multiple webinars with comprehensive data
   */
  static async syncMultipleWebinars(
    webinarDataList: Array<{
      webinar: any;
      registrants: any[];
      participants: any[];
      polls: any[];
      qna: any[];
    }>,
    connectionId: string,
    onProgress?: (completed: number, total: number, current: string) => void
  ): Promise<string[]> {
    const results: string[] = [];
    const total = webinarDataList.length;

    for (let i = 0; i < webinarDataList.length; i++) {
      const { webinar, registrants, participants, polls, qna } = webinarDataList[i];
      
      if (onProgress) {
        onProgress(i, total, `Syncing: ${webinar.topic}`);
      }

      try {
        const webinarDbId = await this.syncCompleteWebinarData(
          webinar,
          registrants,
          participants,
          polls,
          qna,
          connectionId
        );
        results.push(webinarDbId);
      } catch (error) {
        console.error(`Failed to sync webinar ${webinar.id}:`, error);
        // Continue with other webinars even if one fails
      }
    }

    if (onProgress) {
      onProgress(total, total, 'Sync completed');
    }

    return results;
  }
}
