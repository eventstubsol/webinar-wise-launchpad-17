
import { ComprehensiveBatchOperations } from './ComprehensiveBatchOperations';

/**
 * Database operations for batch processing multiple data types
 * Now delegates to the comprehensive batch operations
 */
export class BatchOperations {
  /**
   * Batch operation: Process all data for a webinar with comprehensive sync
   */
  static async syncCompleteWebinarData(
    webinarData: any,
    registrants: any[],
    participants: any[],
    polls: any[],
    qnaData: any[],
    connectionId: string
  ): Promise<string> {
    return await ComprehensiveBatchOperations.syncCompleteWebinarData(
      webinarData,
      registrants,
      participants,
      polls,
      qnaData,
      connectionId
    );
  }

  /**
   * Batch operation: Sync multiple webinars with progress tracking
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
    return await ComprehensiveBatchOperations.syncMultipleWebinars(
      webinarDataList,
      connectionId,
      onProgress
    );
  }
}
