
import { ZoomWebinarService } from '../../api/ZoomWebinarService';
import { BatchOperations } from '../../operations/crud/BatchOperations';
import { EnhancedSyncProgressTracker } from '../EnhancedSyncProgressTracker';
import { retryApiCall, delay } from '../utils/ApiRetryManager';

const RATE_LIMIT_DELAY = 100; // 100ms between API calls (10 req/sec)

const stages = [
  { name: 'webinar_details', label: 'Fetching webinar details' },
  { name: 'registrants', label: 'Fetching registrants' },
  { name: 'participants', label: 'Fetching participants' },
  { name: 'polls', label: 'Fetching polls and responses' },
  { name: 'qa', label: 'Fetching Q&A data' },
  { name: 'recordings', label: 'Fetching recordings' }
];

/**
 * Process a single webinar with all its data sequentially
 */
export async function processWebinarSequentially(
  webinarId: string, 
  syncLogId: string, 
  connectionId: string,
  progressTracker: EnhancedSyncProgressTracker
): Promise<void> {
  let webinarData: any = null;
  let registrants: any[] = [];
  let participants: any[] = [];
  let polls: any[] = [];
  let qa: any[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const stageProgress = Math.round(((i + 1) / (stages.length + 1)) * 100);
    await progressTracker.updateSyncStage(syncLogId, webinarId, stage.name, stageProgress);
    
    try {
      switch (stage.name) {
        case 'webinar_details':
          webinarData = await retryApiCall(() => ZoomWebinarService.getWebinar(webinarId));
          break;
        case 'registrants':
          registrants = await retryApiCall(() => ZoomWebinarService.getWebinarRegistrants(webinarId));
          break;
        case 'participants':
          if (webinarData && new Date(webinarData.start_time) < new Date()) {
            participants = await retryApiCall(() => ZoomWebinarService.getWebinarParticipants(webinarId));
          }
          break;
        case 'polls':
          polls = await retryApiCall(() => ZoomWebinarService.getWebinarPolls(webinarId));
          break;
        case 'qa':
          qa = await retryApiCall(() => ZoomWebinarService.getWebinarQA(webinarId));
          break;
        case 'recordings':
          try {
            console.log(`Skipping recordings for webinar ${webinarId} - method not implemented`);
          } catch (error) {
            console.log(`No recordings available for webinar ${webinarId}`);
          }
          break;
      }
      await delay(RATE_LIMIT_DELAY);
    } catch (error) {
      console.error(`Failed to fetch ${stage.name} for webinar ${webinarId}:`, error);
    }
  }

  if (webinarData) {
    await progressTracker.updateSyncStage(syncLogId, webinarId, 'saving_to_db', 95);
    await BatchOperations.syncCompleteWebinarData(
      webinarData,
      registrants,
      participants,
      polls,
      qa,
      connectionId
    );
    await progressTracker.logWebinarCompletion(syncLogId, webinarId, true);
  } else {
    const errorMessage = 'Failed to fetch critical webinar details';
    await progressTracker.logWebinarCompletion(syncLogId, webinarId, false, errorMessage);
    throw new Error(errorMessage);
  }
}
