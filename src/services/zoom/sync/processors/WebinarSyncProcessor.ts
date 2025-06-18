
import { ZoomWebinarService } from '../../api/ZoomWebinarService';
import { BatchOperations } from '../../operations/crud/BatchOperations';
import { EnhancedSyncProgressTracker } from '../EnhancedSyncProgressTracker';
import { EnhancedRegistrantsApiClient } from '../../api/enhanced/EnhancedRegistrantsApiClient';
import { EnhancedRegistrantOperations } from '../../operations/crud/EnhancedRegistrantOperations';
import { retryApiCall, delay } from '../utils/ApiRetryManager';

const RATE_LIMIT_DELAY = 100; // 100ms between API calls (10 req/sec)

const stages = [
  { name: 'webinar_details', label: 'Fetching webinar details' },
  { name: 'registrants', label: 'Fetching registrants with pagination' },
  { name: 'participants', label: 'Fetching participants' },
  { name: 'polls', label: 'Fetching polls and responses' },
  { name: 'qa', label: 'Fetching Q&A data' },
  { name: 'recordings', label: 'Fetching recordings' }
];

/**
 * Process a single webinar with all its data sequentially using enhanced pagination
 */
export async function processWebinarSequentially(
  webinarId: string, 
  syncLogId: string, 
  connectionId: string,
  progressTracker: EnhancedSyncProgressTracker
): Promise<void> {
  let webinarData: any = null;
  let registrantsResult: any = null;
  let participants: any[] = [];
  let polls: any[] = [];
  let qa: any[] = [];

  console.log(`🎯 ENHANCED WEBINAR PROCESSING: Starting webinar ${webinarId}`);

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const stageProgress = Math.round(((i + 1) / (stages.length + 1)) * 100);
    
    try {
      await progressTracker.updateSyncStage(syncLogId, webinarId, stage.name, stageProgress);
      console.log(`📋 STAGE ${i + 1}/${stages.length}: ${stage.label} for webinar ${webinarId}`);
      
      switch (stage.name) {
        case 'webinar_details':
          webinarData = await retryApiCall(() => ZoomWebinarService.getWebinar(webinarId));
          console.log(`✅ Webinar details fetched: ${webinarData?.topic || 'Unknown'}`);
          break;

        case 'registrants':
          if (webinarData) {
            // Use enhanced pagination for complete registrant fetching
            const registrantsClient = new EnhancedRegistrantsApiClient(
              await getConnectionToken(connectionId),
              await getConnectionUserId(connectionId),
              connectionId
            );

            console.log(`🔄 ENHANCED REGISTRANTS: Starting paginated fetch for webinar ${webinarId}`);
            
            registrantsResult = await EnhancedRegistrantOperations.syncAllWebinarRegistrants(
              registrantsClient,
              webinarId,
              webinarData.id, // DB webinar ID
              await getConnectionUserId(connectionId)
            );

            console.log(`✅ ENHANCED REGISTRANTS COMPLETE: ${registrantsResult.totalSynced} registrants across ${registrantsResult.pagesProcessed} pages`);
            
            if (registrantsResult.warnings && registrantsResult.warnings.length > 0) {
              console.warn(`⚠️ REGISTRANTS WARNINGS:`, registrantsResult.warnings);
            }
          }
          break;

        case 'participants':
          if (webinarData && new Date(webinarData.start_time) < new Date()) {
            participants = await retryApiCall(() => ZoomWebinarService.getWebinarParticipants(webinarId));
            console.log(`✅ Participants fetched: ${participants?.length || 0} participants`);
          } else {
            console.log(`⏭️ Skipping participants - webinar hasn't started yet`);
          }
          break;

        case 'polls':
          polls = await retryApiCall(() => ZoomWebinarService.getWebinarPolls(webinarId));
          console.log(`✅ Polls fetched: ${polls?.length || 0} poll responses`);
          break;

        case 'qa':
          qa = await retryApiCall(() => ZoomWebinarService.getWebinarQA(webinarId));
          console.log(`✅ Q&A fetched: ${qa?.length || 0} Q&A interactions`);
          break;

        case 'recordings':
          try {
            console.log(`⏭️ Skipping recordings for webinar ${webinarId} - method not implemented`);
          } catch (error) {
            console.log(`📝 No recordings available for webinar ${webinarId}`);
          }
          break;
      }
      
      await delay(RATE_LIMIT_DELAY);
      
    } catch (error) {
      console.error(`❌ STAGE FAILED: ${stage.name} for webinar ${webinarId}:`, error);
      
      // Log detailed error information
      await progressTracker.logWebinarCompletion(
        syncLogId, 
        webinarId, 
        false, 
        `Failed at stage ${stage.name}: ${error.message}`
      );
      
      // Don't throw immediately - try to continue with other stages
      continue;
    }
  }

  // Final stage: Save all data to database
  if (webinarData) {
    try {
      await progressTracker.updateSyncStage(syncLogId, webinarId, 'saving_to_db', 95);
      console.log(`💾 SAVING TO DATABASE: Webinar ${webinarId} with all fetched data`);
      
      await BatchOperations.syncCompleteWebinarData(
        webinarData,
        [], // Registrants already saved by EnhancedRegistrantOperations
        participants,
        polls,
        qa,
        connectionId
      );
      
      await progressTracker.logWebinarCompletion(syncLogId, webinarId, true);
      
      console.log(`🎉 WEBINAR COMPLETE: ${webinarId} - ${registrantsResult?.totalSynced || 0} registrants, ${participants?.length || 0} participants`);
      
    } catch (saveError) {
      console.error(`❌ DATABASE SAVE FAILED for webinar ${webinarId}:`, saveError);
      await progressTracker.logWebinarCompletion(
        syncLogId, 
        webinarId, 
        false, 
        `Database save failed: ${saveError.message}`
      );
      throw saveError;
    }
  } else {
    const errorMessage = 'Failed to fetch critical webinar details';
    console.error(`❌ WEBINAR FAILED: ${webinarId} - ${errorMessage}`);
    await progressTracker.logWebinarCompletion(syncLogId, webinarId, false, errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Helper function to get connection token (implement based on your connection structure)
 */
async function getConnectionToken(connectionId: string): Promise<string> {
  // This should fetch the access token from your zoom_connections table
  // Implementation depends on your connection structure
  const { data: connection } = await import('@/integrations/supabase/client').then(m => 
    m.supabase.from('zoom_connections').select('access_token').eq('id', connectionId).single()
  );
  return connection?.access_token || '';
}

/**
 * Helper function to get connection user ID
 */
async function getConnectionUserId(connectionId: string): Promise<string> {
  const { data: connection } = await import('@/integrations/supabase/client').then(m => 
    m.supabase.from('zoom_connections').select('user_id').eq('id', connectionId).single()
  );
  return connection?.user_id || '';
}
