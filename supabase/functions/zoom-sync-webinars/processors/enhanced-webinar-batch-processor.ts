
/**
 * Enhanced webinar batch processing with timeout protection
 */
import { updateSyncStage } from '../database-operations.ts';
import { syncWebinarParticipants } from './participant-processor.ts';
import { syncWebinarRegistrants } from './registrant-processor.ts';
import { 
  mergeWebinarData, 
  deriveWebinarStatus, 
  validateDataIntegrity 
} from './status-derivation.ts';

export interface BatchProcessingResults {
  totalWebinars: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  insertCount: number;
  updateCount: number;
  fieldMappingSuccessCount: number;
  fieldMappingErrorCount: number;
  processedForParticipants: number;
  skippedForParticipants: number;
  totalParticipantsSynced: number;
  processedForRegistrants: number;
  skippedForRegistrants: number;
  totalRegistrantsSynced: number;
}

export async function processWebinarBatch(
  supabase: any,
  client: any,
  webinars: any[],
  connection: any,
  syncLogId: string,
  syncStartTime: number,
  syncTimeoutMs: number,
  debugMode: boolean
): Promise<BatchProcessingResults> {
  const totalWebinars = webinars.length;
  
  // Initialize comprehensive tracking
  const results: BatchProcessingResults = {
    totalWebinars,
    processedCount: 0,
    successCount: 0,
    errorCount: 0,
    insertCount: 0,
    updateCount: 0,
    fieldMappingSuccessCount: 0,
    fieldMappingErrorCount: 0,
    processedForParticipants: 0,
    skippedForParticipants: 0,
    totalParticipantsSynced: 0,
    processedForRegistrants: 0,
    skippedForRegistrants: 0,
    totalRegistrantsSynced: 0
  };

  for (const [index, webinar] of webinars.entries()) {
    // Overall timeout check
    if (Date.now() - syncStartTime > syncTimeoutMs) {
      console.error(`❌ ENHANCED SYNC: Overall timeout exceeded ${syncTimeoutMs}ms`);
      throw new Error(`Enhanced sync operation timed out after ${syncTimeoutMs}ms`);
    }
    
    try {
      const baseProgress = 20 + Math.round((index / totalWebinars) * 50);
      
      await updateSyncStage(
        supabase, 
        syncLogId, 
        webinar.id?.toString(), 
        'processing_webinar_enhanced', 
        baseProgress
      );
      
      console.log(`🔄 ENHANCED PROCESSING: Webinar ${webinar.id} (${index + 1}/${totalWebinars})`);
      
      // Enhanced API data logging
      console.log(`📊 ENHANCED API ANALYSIS for webinar ${webinar.id}:`);
      console.log(`  📋 Available fields (${Object.keys(webinar).length}): [${Object.keys(webinar).slice(0, 10).join(', ')}...]`);
      console.log(`  🔍 Status: ${webinar.status}, Start: ${webinar.start_time}, Duration: ${webinar.duration}`);

      // Get detailed webinar data with timeout
      const webinarDetails = await fetchWebinarDetailsWithTimeout(client, webinar.id, debugMode);
      
      // Enhanced data merging and validation
      const mergedWebinarData = await processWebinarData(webinar, webinarDetails, debugMode);
      if (!mergedWebinarData) {
        results.fieldMappingErrorCount++;
        results.errorCount++;
        results.processedCount++;
        continue;
      }

      // Check if webinar exists and sync
      const { webinarDbId, isNewWebinar } = await syncWebinarData(
        supabase, 
        mergedWebinarData, 
        connection.id
      );
      
      // Track operations
      if (isNewWebinar) {
        results.insertCount++;
        console.log(`✅ ENHANCED INSERT: ${webinar.id} -> DB ID: ${webinarDbId}`);
      } else {
        results.updateCount++;
        console.log(`✅ ENHANCED UPDATE: ${webinar.id} -> DB ID: ${webinarDbId}`);
      }
      
      results.fieldMappingSuccessCount++;
      results.successCount++;

      // Enhanced participant sync with timeout
      const participantResult = await syncParticipantsWithTimeout(
        supabase,
        client,
        webinar.id,
        webinarDbId,
        mergedWebinarData,
        syncLogId,
        baseProgress,
        debugMode
      );
      
      updateParticipantResults(results, participantResult);

      // Enhanced registrant sync with timeout
      const registrantResult = await syncRegistrantsWithTimeout(
        supabase,
        client,
        webinar.id,
        webinarDbId,
        mergedWebinarData,
        syncLogId,
        baseProgress,
        debugMode
      );
      
      updateRegistrantResults(results, registrantResult);

      results.processedCount++;
      
    } catch (error) {
      console.error(`❌ ENHANCED PROCESSING: Failed for webinar ${webinar.id}:`, error);
      results.fieldMappingErrorCount++;
      results.errorCount++;
      results.processedCount++;
    }
  }
  
  return results;
}

async function fetchWebinarDetailsWithTimeout(client: any, webinarId: string, debugMode: boolean): Promise<any> {
  try {
    const detailsPromise = client.getWebinar(webinarId);
    const detailsTimeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Webinar details timeout')), 30000)
    );
    
    const webinarDetails = await Promise.race([detailsPromise, detailsTimeoutPromise]);
    console.log(`📊 ENHANCED DETAILS: Fetched for webinar ${webinarId}`);
    return webinarDetails;
  } catch (detailsError) {
    console.warn(`⚠️ ENHANCED DETAILS: Failed for ${webinarId}, using basic data:`, detailsError.message);
    return null;
  }
}

async function processWebinarData(webinar: any, webinarDetails: any, debugMode: boolean): Promise<any | null> {
  try {
    const mergedWebinarData = mergeWebinarData(webinar, webinarDetails || webinar);
    mergedWebinarData.status = deriveWebinarStatus(mergedWebinarData);
    
    // Enhanced data integrity validation
    if (!validateDataIntegrity(mergedWebinarData, webinar.id)) {
      console.error(`❌ ENHANCED VALIDATION: Failed for webinar ${webinar.id}, skipping...`);
      return null;
    }

    // Log enhanced field mapping success
    const populatedFieldCount = Object.values(mergedWebinarData).filter(val => 
      val !== null && val !== undefined && val !== ''
    ).length;
    console.log(`✅ ENHANCED FIELD MAPPING: ${populatedFieldCount}/39 fields populated for webinar ${webinar.id}`);
    
    return mergedWebinarData;
  } catch (mergeError) {
    console.error(`❌ ENHANCED MERGE: Failed for webinar ${webinar.id}:`, mergeError);
    return null;
  }
}

async function syncWebinarData(supabase: any, mergedWebinarData: any, connectionId: string): Promise<{ webinarDbId: string; isNewWebinar: boolean }> {
  // Check if webinar exists
  const existingCheck = await supabase
    .from('zoom_webinars')
    .select('id')
    .eq('connection_id', connectionId)
    .eq('webinar_id', mergedWebinarData.id?.toString())
    .maybeSingle();
  
  const isNewWebinar = !existingCheck.data;
  
  // Enhanced webinar sync with timeout
  try {
    const { syncBasicWebinarData } = await import('./webinar-processor.ts');
    const syncPromise = syncBasicWebinarData(supabase, mergedWebinarData, connectionId);
    const syncTimeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Webinar sync timeout')), 60000)
    );
    
    const webinarDbId = await Promise.race([syncPromise, syncTimeoutPromise]);
    return { webinarDbId, isNewWebinar };
  } catch (syncError) {
    console.error(`❌ ENHANCED SYNC: Failed for webinar sync:`, syncError);
    throw syncError;
  }
}

async function syncParticipantsWithTimeout(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string,
  mergedWebinarData: any,
  syncLogId: string,
  baseProgress: number,
  debugMode: boolean
): Promise<any> {
  try {
    await updateSyncStage(
      supabase, 
      syncLogId, 
      webinarId?.toString(), 
      'syncing_participants_enhanced', 
      baseProgress + 10
    );
    
    const participantPromise = syncWebinarParticipants(
      supabase, 
      client, 
      webinarId, 
      webinarDbId,
      mergedWebinarData,
      debugMode
    );
    const participantTimeoutPromise = new Promise<any>((_, reject) => 
      setTimeout(() => reject(new Error('Participant sync timeout')), 120000)
    );
    
    return await Promise.race([participantPromise, participantTimeoutPromise]);
  } catch (participantError) {
    console.error(`❌ ENHANCED PARTICIPANTS: Error for webinar ${webinarId}:`, participantError);
    const { updateWebinarParticipantSyncStatus } = await import('../database-operations.ts');
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'failed', participantError.message);
    return { skipped: true, reason: 'Error occurred', count: 0 };
  }
}

async function syncRegistrantsWithTimeout(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string,
  mergedWebinarData: any,
  syncLogId: string,
  baseProgress: number,
  debugMode: boolean
): Promise<any> {
  try {
    await updateSyncStage(
      supabase, 
      syncLogId, 
      webinarId?.toString(), 
      'syncing_registrants_enhanced', 
      baseProgress + 15
    );
    
    const registrantPromise = syncWebinarRegistrants(
      supabase, 
      client, 
      webinarId, 
      webinarDbId,
      mergedWebinarData,
      debugMode
    );
    const registrantTimeoutPromise = new Promise<any>((_, reject) => 
      setTimeout(() => reject(new Error('Registrant sync timeout')), 60000)
    );
    
    return await Promise.race([registrantPromise, registrantTimeoutPromise]);
  } catch (registrantError) {
    console.error(`❌ ENHANCED REGISTRANTS: Error for webinar ${webinarId}:`, registrantError);
    return { skipped: true, reason: 'Error occurred', count: 0 };
  }
}

function updateParticipantResults(results: BatchProcessingResults, participantResult: any): void {
  if (!participantResult.skipped) {
    results.processedForParticipants++;
    results.totalParticipantsSynced += participantResult.count;
    console.log(`✅ ENHANCED PARTICIPANTS: ${participantResult.count} synced`);
  } else {
    results.skippedForParticipants++;
    console.log(`⏭️ ENHANCED PARTICIPANTS: Skipped - ${participantResult.reason}`);
  }
}

function updateRegistrantResults(results: BatchProcessingResults, registrantResult: any): void {
  if (!registrantResult.skipped) {
    results.processedForRegistrants++;
    results.totalRegistrantsSynced += registrantResult.count;
    console.log(`✅ ENHANCED REGISTRANTS: ${registrantResult.count} synced`);
  } else {
    results.skippedForRegistrants++;
    console.log(`⏭️ ENHANCED REGISTRANTS: Skipped - ${registrantResult.reason}`);
  }
}
