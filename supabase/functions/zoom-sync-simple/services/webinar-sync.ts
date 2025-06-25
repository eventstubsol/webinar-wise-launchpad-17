
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { updateSyncLog } from './sync-log.ts';

export async function webinarSync(supabase: SupabaseClient, connection: any, syncLogId: string) {
  let processedCount = 0;
  let totalCount = 0;
  let participantSyncCount = 0;
  
  try {
    console.log(`🚀 Starting comprehensive webinar sync with participant data recovery for connection: ${connection.id}`);
    
    // Update sync log to in_progress
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      sync_stage: 'initializing'
    });

    // Step 1: Call Render backend to reset participant sync status for recovery
    console.log('🔄 Resetting participant sync status for data recovery...');
    
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
      console.log(`✅ Participant sync reset completed:`, resetResult);
      
      await updateSyncLog(supabase, syncLogId, {
        sync_stage: 'participant_sync_reset',
        stage_progress_percentage: 10,
        metadata: { reset_result: resetResult }
      });
    } else {
      console.warn(`⚠️ Participant sync reset failed, continuing with regular sync...`);
    }

    // Step 2: Call Render backend to sync webinars
    console.log('📡 Calling Render backend for webinar sync...');
    
    const response = await fetch(`${renderUrl}/sync-webinars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zoom_connection_id': connection.id
      },
      body: JSON.stringify({
        connectionId: connection.id,
        syncType: 'full'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Render backend sync failed: ${response.status} - ${errorText}`);
    }

    const syncResult = await response.json();
    console.log('✅ Render backend sync completed:', syncResult);

    // Update sync progress
    await updateSyncLog(supabase, syncLogId, {
      sync_stage: 'webinars_synced',
      stage_progress_percentage: 50,
      metadata: { render_sync_result: syncResult }
    });

    // Step 3: Get webinars that need participant sync (including those reset for recovery)
    console.log('🔍 Finding webinars needing participant data sync (including recovery)...');
    
    const { data: webinarsNeedingSync, error: webinarError } = await supabase
      .from('zoom_webinars_with_calculated_status')
      .select('*')
      .eq('connection_id', connection.id)
      .eq('calculated_status', 'ended')
      .eq('participant_sync_status', 'pending') // Focus on pending status after reset
      .order('start_time', { ascending: false })
      .limit(25); // Process up to 25 webinars in one sync (increased for recovery)

    if (webinarError) {
      console.error('Error fetching webinars for participant sync:', webinarError);
      throw webinarError;
    }

    console.log(`🎯 Found ${webinarsNeedingSync?.length || 0} webinars needing participant sync (including recovery)`);
    
    totalCount = webinarsNeedingSync?.length || 0;

    // Step 4: Sync participant data for ended webinars (recovery process)
    if (webinarsNeedingSync && webinarsNeedingSync.length > 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_stage: 'syncing_participants_recovery',
        stage_progress_percentage: 60,
        total_items: totalCount
      });

      for (const webinar of webinarsNeedingSync) {
        try {
          console.log(`👥 [RECOVERY] Syncing participants for webinar: ${webinar.topic} (${webinar.webinar_id})`);
          
          // Call Render backend to sync participants for this specific webinar
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
              recoveryMode: true // Flag for recovery operation
            })
          });

          if (participantResponse.ok) {
            const participantResult = await participantResponse.json();
            console.log(`✅ [RECOVERY] Participant sync completed for webinar ${webinar.webinar_id}:`, participantResult);
            participantSyncCount++;
          } else {
            const errorText = await participantResponse.text();
            console.error(`❌ [RECOVERY] Participant sync failed for webinar ${webinar.webinar_id}: ${errorText}`);
          }

          processedCount++;

          // Update progress
          const progressPercentage = 60 + Math.round((processedCount / totalCount) * 35);
          await updateSyncLog(supabase, syncLogId, {
            processed_items: processedCount,
            stage_progress_percentage: progressPercentage
          });

        } catch (webinarError) {
          console.error(`❌ [RECOVERY] Error syncing webinar ${webinar.webinar_id}:`, webinarError);
          processedCount++;
        }
      }
    }

    // Step 5: Final status update
    await updateSyncLog(supabase, syncLogId, {
      sync_stage: 'completed_with_recovery',
      stage_progress_percentage: 100,
      metadata: {
        render_sync_result: syncResult,
        participant_syncs_attempted: totalCount,
        participant_syncs_successful: participantSyncCount,
        recovery_mode: true
      }
    });

    console.log(`🎉 Comprehensive sync with participant data recovery completed!`);
    console.log(`📊 Recovery Stats: ${processedCount}/${totalCount} webinars processed, ${participantSyncCount} participant syncs successful`);

    return {
      processedCount: processedCount + (syncResult.processedCount || 0),
      totalCount: totalCount + (syncResult.totalCount || 0),
      participantSyncs: participantSyncCount,
      recoveryMode: true
    };

  } catch (error) {
    console.error('❌ Webinar sync with participant recovery failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: error.message,
      stage_progress_percentage: 0
    });
    
    throw error;
  }
}
