
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';
import { syncWebinarParticipantsEnhanced } from './processors/participant-processor-enhanced.ts';
import { createZoomAPIClient } from './zoom-api-client.ts';

/**
 * ENHANCED: Process webinar sync with robust participant handling
 */
export async function processEnhancedWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`🚀 ENHANCED SYNC PROCESSOR: Starting for connection ${connection.id}`);
  
  try {
    await updateSyncStage(supabase, syncLogId, null, 'initializing', 5);
    
    const client = await createZoomAPIClient(connection, supabase);
    console.log(`✅ ENHANCED API CLIENT: Created successfully`);
    
    // Get webinars list
    await updateSyncStage(supabase, syncLogId, null, 'fetching_webinars', 10);
    
    let webinars;
    if (syncOperation.syncType === 'single' && syncOperation.webinarId) {
      // Single webinar sync
      const webinarDetails = await client.getWebinar(syncOperation.webinarId);
      webinars = [webinarDetails];
    } else if (syncOperation.syncType === 'participants_only') {
      // Participants-only sync for specific webinars
      const webinarIds = syncOperation.webinarIds || [];
      if (webinarIds.length === 0) {
        // Get finished webinars that need participant sync
        const { data: webinarsToSync } = await supabase
          .from('zoom_webinars')
          .select('webinar_id')
          .eq('connection_id', connection.id)
          .eq('status', 'finished')
          .in('participant_sync_status', ['failed', 'pending']);
        
        webinars = await Promise.all(
          (webinarsToSync || []).map(w => client.getWebinar(w.webinar_id))
        );
      } else {
        webinars = await Promise.all(
          webinarIds.map(id => client.getWebinar(id))
        );
      }
    } else {
      // Full sync - get all webinars
      const from = new Date();
      from.setDate(from.getDate() - 90); // Last 90 days
      webinars = await client.listWebinarsWithRange({ from, type: 'past' });
    }

    console.log(`📋 ENHANCED SYNC: Processing ${webinars.length} webinars`);
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const webinar of webinars) {
      try {
        processedCount++;
        const progress = Math.floor((processedCount / webinars.length) * 80) + 15; // 15-95%
        
        await updateSyncStage(
          supabase, 
          syncLogId, 
          webinar.id, 
          'processing_participants', 
          progress
        );

        console.log(`🎯 ENHANCED SYNC: Processing webinar ${webinar.id} (${processedCount}/${webinars.length})`);
        
        // Get or create webinar in database
        const { data: existingWebinar } = await supabase
          .from('zoom_webinars')
          .select('id')
          .eq('webinar_id', webinar.id)
          .eq('connection_id', connection.id)
          .single();

        let webinarDbId;
        if (existingWebinar) {
          webinarDbId = existingWebinar.id;
        } else {
          // Create basic webinar record
          const { data: newWebinar, error: createError } = await supabase
            .from('zoom_webinars')
            .insert({
              connection_id: connection.id,
              webinar_id: webinar.id,
              topic: webinar.topic || 'Unknown Topic',
              start_time: webinar.start_time,
              duration: webinar.duration,
              status: 'finished' // We're only syncing past webinars in this context
            })
            .select('id')
            .single();

          if (createError) {
            console.error(`❌ Failed to create webinar record for ${webinar.id}:`, createError);
            errorCount++;
            errors.push(`${webinar.id}: ${createError.message}`);
            continue;
          }
          
          webinarDbId = newWebinar.id;
        }

        // Enhanced participant sync
        const participantResult = await syncWebinarParticipantsEnhanced(
          supabase,
          client,
          webinar.id,
          webinarDbId,
          webinar,
          syncOperation.options?.verboseLogging || false
        );

        if (participantResult.skipped) {
          console.log(`⏭️ Skipped participants for ${webinar.id}: ${participantResult.reason}`);
        } else {
          console.log(`✅ Synced ${participantResult.count} participants for webinar ${webinar.id}`);
          if (participantResult.warnings && participantResult.warnings.length > 0) {
            console.warn(`⚠️ Warnings for ${webinar.id}:`, participantResult.warnings);
          }
        }

        successCount++;
        
      } catch (webinarError) {
        console.error(`❌ ENHANCED SYNC ERROR for webinar ${webinar.id}:`, webinarError);
        errorCount++;
        errors.push(`${webinar.id}: ${webinarError.message}`);
      }
    }

    // Final update
    await updateSyncStage(supabase, syncLogId, null, 'completed', 100);
    
    const finalStatus = errorCount === 0 ? 'completed' : 
                       successCount > 0 ? 'completed_with_errors' : 'failed';
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: finalStatus,
      completed_at: new Date().toISOString(),
      total_items: webinars.length,
      processed_items: processedCount,
      failed_items: errorCount,
      error_message: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
      error_details: errors.length > 0 ? { errors } : null
    });

    console.log(`🎉 ENHANCED SYNC COMPLETED:`);
    console.log(`  - Total webinars: ${webinars.length}`);
    console.log(`  - Processed: ${processedCount}`);
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Final status: ${finalStatus}`);
    
  } catch (error) {
    console.error(`💥 ENHANCED SYNC PROCESSOR FAILED:`, error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
    
    throw error;
  }
}
