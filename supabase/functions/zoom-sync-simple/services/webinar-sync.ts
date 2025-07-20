
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { updateSyncLog } from './sync-log.ts';

export async function webinarSync(supabase: SupabaseClient, connection: any, syncLogId: string) {
  let processedCount = 0;
  let totalCount = 0;
  let participantSyncCount = 0;
  
  try {
    console.log(`🚀 Starting ENHANCED comprehensive webinar sync with participant data recovery for connection: ${connection.id}`);
    
    // Update sync log to in_progress
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      sync_stage: 'initializing'
    });

    // Step 1: Call Render backend to reset participant sync status for recovery
    console.log('🔄 Resetting participant sync status for enhanced data recovery...');
    
    const renderUrl = Deno.env.get('RENDER_BACKEND_URL') || 'https://webinar-wise-launchpad-17.onrender.com';
    
    const resetResponse = await fetch(`${renderUrl}/reset-participant-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zoom_connection_id': connection.id
      },
      body: JSON.stringify({
        connectionId: connection.id
      })
    });

    if (resetResponse.ok) {
      const resetResult = await resetResponse.json();
      console.log(`✅ Enhanced participant sync reset completed:`, resetResult);
      
      await updateSyncLog(supabase, syncLogId, {
        sync_stage: 'enhanced_participant_sync_reset',
        stage_progress_percentage: 10,
        metadata: { 
          reset_result: resetResult,
          enhanced_recovery: true
        }
      });
    } else {
      console.warn(`⚠️ Participant sync reset failed, continuing with enhanced sync...`);
    }

    // Step 2: Call Render backend to sync webinars with enhanced processing
    console.log('📡 Calling Render backend for enhanced webinar sync...');
    
    const response = await fetch(`${renderUrl}/sync-webinars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zoom_connection_id': connection.id
      },
      body: JSON.stringify({
        connectionId: connection.id,
        syncType: 'full',
        enhancedRecovery: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Enhanced Render backend sync failed: ${response.status} - ${errorText}`);
    }

    const syncResult = await response.json();
    console.log('✅ Enhanced Render backend sync completed:', syncResult);

    // Update sync progress
    await updateSyncLog(supabase, syncLogId, {
      sync_stage: 'enhanced_webinars_synced',
      stage_progress_percentage: 50,
      metadata: { 
        render_sync_result: syncResult,
        enhanced_processing: true
      }
    });

    // Step 3: Get webinars that need participant sync with enhanced filtering
    console.log('🔍 Finding webinars needing ENHANCED participant data sync...');
    
    const { data: webinarsNeedingSync, error: webinarError } = await supabase
      .from('zoom_webinars_with_calculated_status')
      .select('*')
      .eq('connection_id', connection.id)
      .eq('calculated_status', 'ended')
      .in('participant_sync_status', ['pending', 'not_applicable', 'failed']) // Enhanced to include failed syncs
      .order('start_time', { ascending: false })
      .limit(30); // Increased limit for comprehensive recovery

    if (webinarError) {
      console.error('Error fetching webinars for enhanced participant sync:', webinarError);
      throw webinarError;
    }

    console.log(`🎯 Found ${webinarsNeedingSync?.length || 0} webinars needing ENHANCED participant sync`);
    
    totalCount = webinarsNeedingSync?.length || 0;

    // Step 4: Enhanced participant data sync with comprehensive recovery
    if (webinarsNeedingSync && webinarsNeedingSync.length > 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_stage: 'enhanced_syncing_participants_recovery',
        stage_progress_percentage: 60,
        total_items: totalCount
      });

      for (const webinar of webinarsNeedingSync) {
        try {
          console.log(`👥 [ENHANCED RECOVERY] Syncing participants for webinar: ${webinar.topic} (${webinar.webinar_id})`);
          
          // Call Render backend to sync participants with enhanced processing
          const participantResponse = await fetch(`${renderUrl}/sync-webinars`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'zoom_connection_id': connection.id
            },
            body: JSON.stringify({
              connectionId: connection.id,
              syncType: 'participants',
              webinarId: webinar.webinar_id,
              webinarDbId: webinar.id,
              enhancedRecovery: true,
              comprehensiveValidation: true
            })
          });

          if (participantResponse.ok) {
            const participantResult = await participantResponse.json();
            console.log(`✅ [ENHANCED RECOVERY] Participant sync completed for webinar ${webinar.webinar_id}:`, participantResult);
            participantSyncCount++;
          } else {
            const errorText = await participantResponse.text();
            console.error(`❌ [ENHANCED RECOVERY] Participant sync failed for webinar ${webinar.webinar_id}: ${errorText}`);
          }

          processedCount++;

          // Update progress with enhanced tracking
          const progressPercentage = 60 + Math.round((processedCount / totalCount) * 35);
          await updateSyncLog(supabase, syncLogId, {
            processed_items: processedCount,
            stage_progress_percentage: progressPercentage,
            metadata: {
              current_webinar: webinar.topic,
              enhanced_processing: true
            }
          });

        } catch (webinarError) {
          console.error(`❌ [ENHANCED RECOVERY] Error syncing webinar ${webinar.webinar_id}:`, webinarError);
          processedCount++;
        }
      }
    }

    // Step 5: Final status update with enhanced results
    await updateSyncLog(supabase, syncLogId, {
      sync_stage: 'completed_with_enhanced_recovery',
      stage_progress_percentage: 100,
      metadata: {
        render_sync_result: syncResult,
        participant_syncs_attempted: totalCount,
        participant_syncs_successful: participantSyncCount,
        enhanced_recovery_mode: true,
        comprehensive_validation: true
      }
    });

    console.log(`🎉 ENHANCED comprehensive sync with participant data recovery completed!`);
    console.log(`📊 Enhanced Recovery Stats: ${processedCount}/${totalCount} webinars processed, ${participantSyncCount} participant syncs successful`);

    return {
      processedCount: processedCount + (syncResult.processedCount || 0),
      totalCount: totalCount + (syncResult.totalCount || 0),
      participantSyncs: participantSyncCount,
      enhancedRecoveryMode: true,
      comprehensiveValidation: true
    };

  } catch (error) {
    console.error('❌ Enhanced webinar sync with participant recovery failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: error.message,
      stage_progress_percentage: 0,
      metadata: {
        enhanced_recovery_attempted: true,
        error_details: error.stack
      }
    });
    
    throw error;
  }
}
