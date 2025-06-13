
import { WebinarOperations } from './WebinarOperations';
import { ParticipantOperations } from './ParticipantOperations';
import { InteractionOperations } from './InteractionOperations';
import { MetricsOperations } from './MetricsOperations';

/**
 * Database operations for batch processing multiple data types
 */
export class BatchOperations {
  /**
   * Batch operation: Process all data for a webinar
   */
  static async syncCompleteWebinarData(
    webinarData: any,
    registrants: any[],
    participants: any[],
    polls: any[],
    qnaData: any[],
    connectionId: string
  ): Promise<string> {
    // Start transaction-like operation
    try {
      // 1. Upsert webinar
      const webinarDbId = await WebinarOperations.upsertWebinar(webinarData, connectionId);

      // 2. Upsert all related data
      await Promise.all([
        ParticipantOperations.upsertRegistrants(registrants, webinarDbId),
        ParticipantOperations.upsertParticipants(participants, webinarDbId),
        InteractionOperations.upsertPolls(polls, webinarDbId),
        InteractionOperations.upsertQnA(qnaData, webinarDbId)
      ]);

      // 3. Update metrics
      await MetricsOperations.updateWebinarMetrics(webinarDbId);

      return webinarDbId;
    } catch (error) {
      console.error('Error syncing complete webinar data:', error);
      throw error;
    }
  }
}
