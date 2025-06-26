
import { updateSyncStage, updateWebinarParticipantSyncStatus } from '../database-operations.ts';
import { isWebinarEligibleForParticipantSync } from './participant-eligibility.ts';
import { transformParticipantForDatabase } from './participant-transformer.ts';
import { saveParticipantsToDatabase } from './participant-database.ts';

/**
 * Update webinar metrics after participant sync - ENHANCED VERSION WITH PROPER METRICS CALCULATION
 */
async function updateWebinarMetricsAfterParticipantSync(supabase: any, webinarDbId: string): Promise<void> {
  try {
    console.log(`📊 UPDATING METRICS after participant sync for webinar: ${webinarDbId}`);
    
    // Get participant metrics
    const { data: participants, error: participantsError } = await supabase
      .from('zoom_participants')
      .select('duration, join_time, participant_id')
      .eq('webinar_id', webinarDbId);

    if (participantsError) {
      console.error('❌ Failed to fetch participants for metrics:', participantsError);
      return;
    }

    console.log(`📊 Found ${participants?.length || 0} participants for metrics calculation`);

    // Get registrant count
    const { count: registrantCount, error: registrantsError } = await supabase
      .from('zoom_registrants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarDbId);

    if (registrantsError) {
      console.error('❌ Failed to fetch registrants count:', registrantsError);
      return;
    }

    console.log(`📊 Found ${registrantCount || 0} registrants for metrics calculation`);

    // Calculate comprehensive metrics
    const totalAttendees = participants?.length || 0;
    const totalRegistrants = registrantCount || 0;
    const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
    const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;
    const totalAbsentees = Math.max(0, totalRegistrants - totalAttendees);

    console.log(`📊 Calculated metrics:`, {
      totalAttendees,
      totalRegistrants,
      totalMinutes,
      avgDuration,
      totalAbsentees
    });

    // Prepare update with all metrics
    const updates: any = {
      total_registrants: totalRegistrants,
      total_attendees: totalAttendees,
      total_absentees: totalAbsentees,
      total_minutes: totalMinutes,
      avg_attendance_duration: avgDuration,
      updated_at: new Date().toISOString()
    };

    // Also update participant sync status to reflect completion
    if (totalAttendees > 0) {
      updates.participant_sync_status = 'completed';
      updates.participant_sync_completed_at = new Date().toISOString();
      updates.participant_sync_error = null;
    } else if (totalRegistrants > 0 && totalAttendees === 0) {
      updates.participant_sync_status = 'no_participants';
      updates.participant_sync_error = 'No participants found for this webinar';
    }

    // Update webinar with calculated metrics
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update(updates)
      .eq('id', webinarDbId);

    if (updateError) {
      console.error('❌ Failed to update webinar metrics:', updateError);
      throw updateError;
    }

    console.log(`✅ METRICS UPDATED successfully for webinar ${webinarDbId}:`);
    console.log(`  👥 Total Attendees: ${totalAttendees}`);
    console.log(`  📝 Total Registrants: ${totalRegistrants}`);
    console.log(`  ⏱️ Total Minutes: ${totalMinutes}`);
    console.log(`  📊 Avg Duration: ${avgDuration}m`);
    console.log(`  ❌ Total Absentees: ${totalAbsentees}`);
    console.log(`  ✅ Sync Status: ${updates.participant_sync_status || 'unchanged'}`);
  } catch (error) {
    console.error('❌ Error updating webinar metrics after participant sync:', error);
    // Log the error but don't throw - metrics update failure shouldn't fail the sync
  }
}

/**
 * Sync participants for a specific webinar with enhanced logging and eligibility checks
 * FIXED: Now properly completes sync status and triggers metrics update
 */
export async function syncWebinarParticipants(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string,
  webinarData?: any,
  debugMode = false
): Promise<{ count: number; skipped: boolean; reason?: string }> {
  const startTime = Date.now();
  console.log(`${debugMode ? 'DEBUG: ' : ''}🚀 Starting participant sync for webinar ${webinarId}`);
  
  try {
    // Enhanced logging: Log sync initiation
    if (debugMode) {
      console.log(`DEBUG: Sync parameters:`, {
        webinarId,
        webinarDbId,
        debugMode,
        hasWebinarData: !!webinarData
      });
    }

    // Update status to indicate sync attempt is starting
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'pending');
    console.log(`📝 Set participant sync status to 'pending' for webinar ${webinarDbId}`);

    // Check if webinar is eligible for participant sync
    if (webinarData) {
      const eligibility = isWebinarEligibleForParticipantSync(webinarData, debugMode);
      
      if (!eligibility.eligible) {
        console.log(`⏭️ SKIPPING participant sync for webinar ${webinarId}: ${eligibility.reason}`);
        
        // Update status to not_applicable for ineligible webinars
        await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'not_applicable', eligibility.reason);
        
        // Still update metrics for ineligible webinars (they might have registrants)
        await updateWebinarMetricsAfterParticipantSync(supabase, webinarDbId);
        
        return { count: 0, skipped: true, reason: eligibility.reason };
      } else {
        console.log(`✅ PROCEEDING with participant sync for webinar ${webinarId} - eligibility confirmed`);
      }
    }

    // Fetch participants from Zoom API with debug mode
    console.log(`🔄 Fetching participants from Zoom API for webinar ${webinarId}`);
    const participants = await client.getWebinarParticipants(webinarId, debugMode);
    
    const fetchTime = Date.now() - startTime;
    console.log(`⏱️ Participants fetch completed in ${fetchTime}ms`);
    
    if (!participants || participants.length === 0) {
      console.log(`📭 No participants found for webinar ${webinarId}`);
      
      // Update status to no_participants 
      await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'no_participants', 'No participants found in API response');
      
      // Update metrics even if no participants (might have registrants)
      await updateWebinarMetricsAfterParticipantSync(supabase, webinarDbId);
      
      return { count: 0, skipped: false, reason: 'No participants found in API response' };
    }
    
    console.log(`📊 Processing ${participants.length} participants for webinar ${webinarId}`);
    
    // Enhanced logging: Log raw API response structure
    if (debugMode && participants.length > 0) {
      console.log(`DEBUG: Sample participant data:`, participants[0]);
    }

    // Transform participants for database
    const transformedParticipants = participants.map((participant, index) => {
      if (debugMode && index < 2) {
        console.log(`DEBUG: Transforming participant ${index + 1}:`, participant);
      }

      const transformed = transformParticipantForDatabase(participant, webinarDbId, debugMode);
      
      return {
        ...transformed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    const transformTime = Date.now() - startTime - fetchTime;
    console.log(`🔄 Participant transformation completed in ${transformTime}ms`);

    // Save to database
    console.log(`💾 Saving ${transformedParticipants.length} participants to database`);
    const saveResult = await saveParticipantsToDatabase(supabase, transformedParticipants, webinarId, debugMode);
    
    if (!saveResult.success) {
      console.error(`❌ Failed to save participants: ${saveResult.error?.message}`);
      // Update status to failed if database save fails
      await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'failed', `Failed to save participants: ${saveResult.error?.message}`);
      throw new Error(`Failed to upsert participants: ${saveResult.error?.message}`);
    }

    console.log(`✅ Successfully saved ${participants.length} participants to database`);

    // CRITICAL: Update status to completed BEFORE metrics update
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'completed');
    console.log(`📝 Set participant sync status to 'completed' for webinar ${webinarDbId}`);

    // CRITICAL: Update metrics AFTER successful participant sync and status update
    console.log(`📊 Triggering metrics update for webinar ${webinarDbId}`);
    await updateWebinarMetricsAfterParticipantSync(supabase, webinarDbId);

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Participant sync completed successfully for webinar ${webinarId} in ${totalTime}ms`);

    return { count: participants.length, skipped: false };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    console.error(`💥 Participant sync failed for webinar ${webinarId} after ${totalTime}ms:`, error);
    
    // Update status to failed on any error
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'failed', errorMessage);
    
    throw error;
  }
}
