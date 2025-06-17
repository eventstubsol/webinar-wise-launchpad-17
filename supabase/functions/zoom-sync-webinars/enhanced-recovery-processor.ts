
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { syncWebinarWithValidation } from './webinar-sync-handler.ts';
import { findAndClearStuckSyncs, validateConnectionData } from './sync-recovery.ts';
import { ComprehensiveWebinarFetcher } from './comprehensive-webinar-fetcher.ts';

// Per-webinar timeout: 5 minutes maximum
const WEBINAR_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_SYNC_DURATION = 20 * 60 * 1000; // 20 minutes total

// Problem webinar blacklist - webinars that consistently cause issues
const PROBLEM_WEBINARS = new Set(['88268187504']);

export async function processRecoverySync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`=== STARTING ENHANCED RECOVERY SYNC FOR CONNECTION: ${connection.id} ===`);
  
  try {
    // Step 1: Force clear ALL active syncs for this connection
    await forceClearAllActiveSyncs(supabase, connection.id);
    
    // Step 2: Validate current data state
    const currentCounts = await validateConnectionData(supabase, connection.id);
    console.log('Pre-sync data state:', currentCounts);

    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      started_at: new Date().toISOString(),
      sync_stage: 'enhanced_recovery_initialization',
      stage_progress_percentage: 5
    });

    // Initialize Zoom API client
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // ENHANCED: Use comprehensive webinar fetching strategy
    console.log('=== USING COMPREHENSIVE WEBINAR FETCHING STRATEGY ===');
    await updateSyncStage(supabase, syncLogId, null, 'comprehensive_webinar_fetch', 10);
    
    const webinarFetcher = new ComprehensiveWebinarFetcher(client, connection.id);
    const fetchResult = await webinarFetcher.fetchAllWebinars();
    
    const webinars = fetchResult.webinars;
    const fetchSummary = fetchResult.summary;
    
    console.log(`=== COMPREHENSIVE WEBINAR FETCH COMPLETED ===`);
    console.log(`Expected from logs: 43 webinars`);
    console.log(`Actually fetched: ${fetchSummary.finalCount} webinars`);
    console.log(`Fetch breakdown:`, fetchSummary);
    
    if (webinars.length === 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        processed_items: 0,
        completed_at: new Date().toISOString(),
        sync_stage: 'completed',
        stage_progress_percentage: 100,
        error_message: 'No webinars found using comprehensive fetch strategy',
        error_details: { fetchSummary }
      });
      return;
    }
    
    await updateSyncLog(supabase, syncLogId, {
      total_items: webinars.length,
      error_details: { 
        comprehensiveFetchSummary: fetchSummary,
        expectedWebinars: 43,
        actuallyFetched: fetchSummary.finalCount
      }
    });

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const skippedWebinars: string[] = [];
    
    const syncStartTime = Date.now();
    
    console.log(`=== PROCESSING ${webinars.length} WEBINARS WITH ENHANCED ERROR HANDLING ===`);
    
    for (const webinar of webinars) {
      const webinarStartTime = Date.now();
      
      try {
        // Global timeout check
        const elapsedTime = Date.now() - syncStartTime;
        if (elapsedTime > MAX_SYNC_DURATION) {
          console.log(`⏰ Global sync timeout reached at ${Math.round(elapsedTime / 1000)}s, stopping at ${processedCount}/${webinars.length}`);
          await updateSyncLog(supabase, syncLogId, {
            sync_status: 'partial',
            error_message: `Global sync timeout after ${Math.round(elapsedTime / 1000 / 60)} minutes`,
            completed_at: new Date().toISOString()
          });
          break;
        }
        
        const progress = Math.round((processedCount / webinars.length) * 80) + 15;
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'processing_webinar', progress);
        
        console.log(`=== PROCESSING WEBINAR ${webinar.id} (${processedCount + 1}/${webinars.length}) ===`);
        console.log(`Title: ${webinar.topic}`);
        console.log(`Start: ${webinar.start_time}`);
        console.log(`Global elapsed: ${Math.round(elapsedTime / 1000)}s`);
        
        // Check if webinar is in problem list
        if (PROBLEM_WEBINARS.has(webinar.id?.toString())) {
          console.log(`⚠️ Webinar ${webinar.id} is in problem webinar blacklist, skipping...`);
          skippedWebinars.push(`${webinar.id} (blacklisted)`);
          skippedCount++;
          processedCount++;
          continue;
        }
        
        // Enhanced existing webinar check with correct column name (topic, not title)
        console.log(`Checking if webinar ${webinar.id} already exists...`);
        const { data: existingWebinar, error: checkError } = await Promise.race([
          supabase
            .from('zoom_webinars')
            .select('id, topic, webinar_id')
            .eq('connection_id', connection.id)
            .eq('webinar_id', webinar.id?.toString())
            .maybeSingle(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database check timeout')), 10000)
          )
        ]);
        
        if (checkError) {
          console.error(`❌ Error checking existing webinar ${webinar.id}:`, checkError);
          errors.push(`Webinar ${webinar.id}: Database check failed - ${checkError.message}`);
          failedCount++;
          processedCount++;
          continue;
        }
        
        if (existingWebinar) {
          console.log(`✅ Webinar ${webinar.id} already exists (DB ID: ${existingWebinar.id}), skipping...`);
          skippedWebinars.push(`${webinar.id} (exists)`);
          skippedCount++;
          processedCount++;
          
          // Update progress immediately after skip
          await updateSyncLog(supabase, syncLogId, {
            processed_items: processedCount,
            stage_progress_percentage: Math.round((processedCount / webinars.length) * 80) + 15
          });
          continue;
        }
        
        console.log(`🔄 Processing new webinar ${webinar.id}...`);
        
        // Per-webinar timeout protection
        const webinarPromise = processWebinarWithTimeout(
          client, 
          webinar, 
          connection.id, 
          supabase,
          syncLogId
        );
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Webinar ${webinar.id} timeout after ${WEBINAR_TIMEOUT_MS / 1000}s`)), WEBINAR_TIMEOUT_MS)
        );
        
        const insertionResult = await Promise.race([webinarPromise, timeoutPromise]);
        
        if (insertionResult.success) {
          console.log(`✅ Successfully synced webinar ${webinar.id}`);
          successCount++;
        } else {
          console.error(`❌ Failed to sync webinar ${webinar.id}: ${insertionResult.error}`);
          errors.push(`Webinar ${webinar.id}: ${insertionResult.error}`);
          failedCount++;
        }
        
        processedCount++;
        
        // Update progress
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount,
          stage_progress_percentage: Math.round((processedCount / webinars.length) * 80) + 15
        });
        
        console.log(`⏱️ Webinar ${webinar.id} processed in ${Date.now() - webinarStartTime}ms`);
        
      } catch (webinarError) {
        const processingTime = Date.now() - webinarStartTime;
        console.error(`❌ Critical error processing webinar ${webinar.id} after ${processingTime}ms:`, webinarError);
        
        if (webinarError.message.includes('timeout')) {
          console.log(`⏰ Webinar ${webinar.id} timed out, adding to problem list`);
          PROBLEM_WEBINARS.add(webinar.id?.toString());
          skippedWebinars.push(`${webinar.id} (timeout)`);
          skippedCount++;
        } else {
          errors.push(`Webinar ${webinar.id}: ${webinarError.message}`);
          failedCount++;
        }
        processedCount++;
        
        // Force continue to next webinar
        await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'webinar_failed', null);
      }
    }
    
    // Final validation and completion
    console.log('Final data validation...');
    const finalCounts = await validateConnectionData(supabase, connection.id);
    
    const syncStatus = failedCount === 0 && skippedCount < webinars.length ? 'completed' : 
                      successCount > 0 ? 'partial' : 'failed';
    
    console.log(`=== ENHANCED RECOVERY SYNC COMPLETED ===`);
    console.log(`Status: ${syncStatus}`);
    console.log(`Processed: ${processedCount}/${webinars.length}`);
    console.log(`Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);
    console.log(`Final data counts:`, finalCounts);
    
    if (skippedWebinars.length > 0) {
      console.log(`Skipped webinars:`, skippedWebinars);
    }
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: syncStatus,
      processed_items: processedCount,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      error_message: errors.length > 0 ? `${failedCount} webinars failed, ${skippedCount} skipped` : null,
      error_details: { 
        errors, 
        skippedWebinars,
        successCount, 
        failedCount,
        skippedCount,
        finalCounts,
        problemWebinars: Array.from(PROBLEM_WEBINARS),
        comprehensiveFetchSummary: fetchSummary
      }
    });
    
  } catch (error) {
    console.error('❌ Enhanced recovery sync failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: `Enhanced recovery sync failed: ${error.message}`,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
    
    throw error;
  }
}

async function forceClearAllActiveSyncs(supabase: any, connectionId: string): Promise<void> {
  console.log(`🧹 Force clearing ALL active syncs for connection: ${connectionId}`);
  
  try {
    const { data: activeSyncs, error: findError } = await supabase
      .from('zoom_sync_logs')
      .select('id, sync_status, created_at, current_webinar_id')
      .eq('connection_id', connectionId)
      .in('sync_status', ['started', 'in_progress']);

    if (findError) {
      console.error('Error finding active syncs:', findError);
      return;
    }

    if (activeSyncs && activeSyncs.length > 0) {
      console.log(`🔄 Force clearing ${activeSyncs.length} active syncs...`);
      
      const { error: updateError } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'failed',
          error_message: 'Force cleared for enhanced recovery sync',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', activeSyncs.map(s => s.id));

      if (updateError) {
        console.error('Error force clearing syncs:', updateError);
      } else {
        console.log(`✅ Successfully force cleared ${activeSyncs.length} stuck syncs`);
      }
    } else {
      console.log('✅ No active syncs to clear');
    }
  } catch (error) {
    console.error('Error in forceClearAllActiveSyncs:', error);
  }
}

async function processWebinarWithTimeout(
  client: any,
  webinar: any,
  connectionId: string,
  supabase: any,
  syncLogId: string
): Promise<{ success: boolean; error?: string }> {
  
  try {
    // Fetch webinar details with timeout
    console.log(`📋 Fetching details for webinar ${webinar.id}...`);
    const webinarDetails = await client.getWebinar(webinar.id);
    
    // Fetch registrants with timeout
    console.log(`👥 Fetching registrants for webinar ${webinar.id}...`);
    let registrants = [];
    try {
      registrants = await client.getWebinarRegistrants(webinar.id);
      console.log(`✅ Fetched ${registrants.length} registrants`);
    } catch (registrantError) {
      console.log(`⚠️ No registrants for webinar ${webinar.id}: ${registrantError.message}`);
    }

    // Fetch participants with timeout
    console.log(`🎯 Fetching participants for webinar ${webinar.id}...`);
    let participants = [];
    try {
      participants = await client.getWebinarParticipants(webinar.id);
      console.log(`✅ Fetched ${participants.length} participants`);
    } catch (participantError) {
      console.log(`⚠️ No participants for webinar ${webinar.id}: ${participantError.message}`);
    }
    
    // Process webinar with validation
    console.log(`💾 Saving webinar ${webinar.id} to database...`);
    await updateSyncStage(supabase, syncLogId, webinar.id?.toString(), 'saving_webinar', null);
    
    const insertionResult = await syncWebinarWithValidation(
      supabase,
      webinarDetails,
      registrants,
      participants,
      connectionId
    );
    
    return insertionResult;
    
  } catch (error) {
    console.error(`❌ Error in processWebinarWithTimeout for ${webinar.id}:`, error);
    return { success: false, error: error.message };
  }
}
