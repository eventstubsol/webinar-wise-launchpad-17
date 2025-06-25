
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { updateSyncLog } from './sync-log.ts';

export async function webinarSync(supabase: SupabaseClient, connection: any, syncLogId: string) {
  let processedCount = 0;
  let totalCount = 0;
  let participantSyncCount = 0;
  
  try {
    console.log(`🚀 Starting comprehensive webinar sync for connection: ${connection.id}`);
    
    // Update sync log to in_progress
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      sync_stage: 'initializing'
    });

    // Step 1: Call Render backend to sync webinars
    console.log('📡 Calling Render backend for webinar sync...');
    
    const renderUrl = Deno.env.get('RENDER_BACKEND_URL') || 'https://webinar-wise-launchpad-17.onrender.com';
    
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

    // Step 2: Get webinars that need participant sync
    console.log('🔍 Finding webinars needing participant data sync...');
    
    const { data: webinarsNeedingSync, error: webinarError } = await supabase
      .from('zoom_webinars_with_calculated_status')
      .select('*')
      .eq('connection_id', connection.id)
      .eq('calculated_status', 'ended')
      .in('participant_sync_status', ['pending', 'not_applicable'])
      .order('start_time', { ascending: false })
      .limit(20); // Process up to 20 webinars in one sync

    if (webinarError) {
      console.error('Error fetching webinars for participant sync:', webinarError);
      throw webinarError;
    }

    console.log(`🎯 Found ${webinarsNeedingSync?.length || 0} webinars needing participant sync`);
    
    totalCount = webinarsNeedingSync?.length || 0;

    // Step 3: Sync participant data for ended webinars
    if (webinarsNeedingSync && webinarsNeedingSync.length > 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_stage: 'syncing_participants',
        stage_progress_percentage: 60,
        total_items: totalCount
      });

      for (const webinar of webinarsNeedingSync) {
        try {
          console.log(`👥 Syncing participants for webinar: ${webinar.topic} (${webinar.webinar_id})`);
          
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
              webinarDbId: webinar.id
            })
          });

          if (participantResponse.ok) {
            const participantResult = await participantResponse.json();
            console.log(`✅ Participant sync completed for webinar ${webinar.webinar_id}:`, participantResult);
            participantSyncCount++;
          } else {
            const errorText = await participantResponse.text();
            console.error(`❌ Participant sync failed for webinar ${webinar.webinar_id}: ${errorText}`);
          }

          processedCount++;

          // Update progress
          const progressPercentage = 60 + Math.round((processedCount / totalCount) * 30);
          await updateSyncLog(supabase, syncLogId, {
            processed_items: processedCount,
            stage_progress_percentage: progressPercentage
          });

        } catch (webinarError) {
          console.error(`❌ Error syncing webinar ${webinar.webinar_id}:`, webinarError);
          processedCount++;
        }
      }
    }

    // Step 4: Final status update
    await updateSyncLog(supabase, syncLogId, {
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      metadata: {
        render_sync_result: syncResult,
        participant_syncs_attempted: totalCount,
        participant_syncs_successful: participantSyncCount
      }
    });

    console.log(`🎉 Comprehensive sync completed!`);
    console.log(`📊 Stats: ${processedCount}/${totalCount} webinars processed, ${participantSyncCount} participant syncs successful`);

    return {
      processedCount: processedCount + (syncResult.processedCount || 0),
      totalCount: totalCount + (syncResult.totalCount || 0),
      participantSyncs: participantSyncCount
    };

  } catch (error) {
    console.error('❌ Webinar sync failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: error.message,
      stage_progress_percentage: 0
    });
    
    throw error;
  }
}
