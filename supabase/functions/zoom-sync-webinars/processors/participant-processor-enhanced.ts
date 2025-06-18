
import { updateSyncStage, updateWebinarParticipantSyncStatus } from '../database-operations.ts';
import { isWebinarEligibleForParticipantSync } from './participant-eligibility.ts';
import { transformParticipantForDatabaseEnhanced, logTransformationIssues } from './participant-transformer-enhanced.ts';

/**
 * ENHANCED: Robust participant sync with comprehensive error handling and fallbacks
 */
export async function syncWebinarParticipantsEnhanced(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string,
  webinarData?: any,
  debugMode = false
): Promise<{ count: number; skipped: boolean; reason?: string; warnings?: string[] }> {
  const startTime = Date.now();
  const allWarnings: string[] = [];
  
  console.log(`🚀 ENHANCED PARTICIPANT SYNC: Starting for webinar ${webinarId}`);
  
  try {
    // Update status to indicate sync attempt is starting
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'pending');

    // Enhanced eligibility check
    if (webinarData) {
      const eligibility = isWebinarEligibleForParticipantSync(webinarData, debugMode);
      
      if (!eligibility.eligible) {
        console.log(`⏭️ SKIPPING participant sync for webinar ${webinarId}: ${eligibility.reason}`);
        
        let statusToSet = 'not_applicable';
        if (eligibility.diagnostics?.isFutureEvent) {
          statusToSet = 'not_applicable';
        } else if (eligibility.diagnostics?.isRecentWebinar) {
          statusToSet = 'pending'; // Will become eligible soon
        }
        
        await updateWebinarParticipantSyncStatus(supabase, webinarDbId, statusToSet, eligibility.reason);
        return { count: 0, skipped: true, reason: eligibility.reason };
      }
    }

    // Enhanced participants fetch with retry logic
    console.log(`📡 ENHANCED FETCH: Getting participants for webinar ${webinarId}`);
    let participants;
    let fetchAttempts = 0;
    const maxFetchAttempts = 3;

    while (fetchAttempts < maxFetchAttempts) {
      try {
        participants = await client.getWebinarParticipants(webinarId, debugMode);
        break;
      } catch (fetchError) {
        fetchAttempts++;
        console.error(`❌ FETCH ATTEMPT ${fetchAttempts} FAILED:`, fetchError.message);
        
        if (fetchAttempts === maxFetchAttempts) {
          throw fetchError;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, fetchAttempts) * 1000));
      }
    }
    
    const fetchTime = Date.now() - startTime;
    console.log(`✅ ENHANCED FETCH: Completed in ${fetchTime}ms`);
    
    if (!participants || participants.length === 0) {
      console.log(`📭 NO PARTICIPANTS: Found for webinar ${webinarId}`);
      
      const webinarStatus = webinarData?.status?.toLowerCase();
      if (['finished', 'ended', 'completed'].includes(webinarStatus)) {
        await updateWebinarParticipantSyncStatus(
          supabase, 
          webinarDbId, 
          'no_participants', 
          'Webinar completed but no participants found in API response'
        );
      } else {
        await updateWebinarParticipantSyncStatus(
          supabase, 
          webinarDbId, 
          'failed', 
          'No participants found - webinar may not be eligible for participant sync yet'
        );
      }
      
      return { count: 0, skipped: false, reason: 'No participants found in API response' };
    }
    
    console.log(`🔄 ENHANCED PROCESSING: Transforming ${participants.length} participants`);
    
    // Enhanced transformation with comprehensive error handling
    const transformedParticipants = [];
    const transformationWarnings = [];
    
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      
      try {
        const transformResult = transformParticipantForDatabaseEnhanced(participant, webinarDbId, debugMode);
        
        // Add timestamps
        const finalParticipant = {
          ...transformResult.participant,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        transformedParticipants.push(finalParticipant);
        
        // Collect warnings
        if (transformResult.warnings.length > 0 || transformResult.fallbacks_used.length > 0) {
          transformationWarnings.push(`Participant ${i + 1}: ${[...transformResult.warnings, ...transformResult.fallbacks_used].join(', ')}`);
          allWarnings.push(...transformResult.warnings);
          
          // Log transformation issues for debugging
          await logTransformationIssues(
            supabase,
            webinarId,
            participant,
            transformResult.warnings,
            transformResult.fallbacks_used
          );
        }
        
      } catch (transformError) {
        console.error(`❌ TRANSFORM ERROR for participant ${i + 1}:`, transformError);
        transformationWarnings.push(`Participant ${i + 1}: Transform failed - ${transformError.message}`);
        
        // Log the failed transformation
        await logTransformationIssues(
          supabase,
          webinarId,
          participant,
          [`Transform failed: ${transformError.message}`],
          []
        );
      }
    }
    
    if (transformedParticipants.length === 0) {
      console.error(`💥 TRANSFORMATION FAILED: No valid participants after transformation`);
      await updateWebinarParticipantSyncStatus(
        supabase, 
        webinarDbId, 
        'failed', 
        `All ${participants.length} participants failed transformation: ${transformationWarnings.join('; ')}`
      );
      return { count: 0, skipped: false, reason: 'All participants failed transformation', warnings: allWarnings };
    }
    
    const transformTime = Date.now() - startTime - fetchTime;
    console.log(`✅ ENHANCED TRANSFORMATION: Completed in ${transformTime}ms`);
    console.log(`  - Valid participants: ${transformedParticipants.length}/${participants.length}`);
    console.log(`  - Transformation warnings: ${transformationWarnings.length}`);

    // Enhanced database save with batch processing
    console.log(`💾 ENHANCED DATABASE SAVE: Saving ${transformedParticipants.length} participants`);
    
    const batchSize = 50; // Process in smaller batches to avoid timeouts
    let totalInserted = 0;
    let insertErrors = [];

    for (let i = 0; i < transformedParticipants.length; i += batchSize) {
      const batch = transformedParticipants.slice(i, i + batchSize);
      
      try {
        const { error, count } = await supabase
          .from('zoom_participants')
          .upsert(batch, {
            onConflict: 'webinar_id,coalesce(participant_id,generated_participant_id)',
            ignoreDuplicates: false,
            count: 'exact'
          });

        if (error) {
          console.error(`❌ BATCH SAVE ERROR (batch ${Math.floor(i/batchSize) + 1}):`, error);
          insertErrors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
        } else {
          totalInserted += (count || batch.length);
          console.log(`✅ BATCH ${Math.floor(i/batchSize) + 1} SAVED: ${count || batch.length} participants`);
        }
      } catch (batchError) {
        console.error(`💥 BATCH EXCEPTION (batch ${Math.floor(i/batchSize) + 1}):`, batchError);
        insertErrors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${batchError.message}`);
      }
    }

    const insertTime = Date.now() - startTime - fetchTime - transformTime;
    const totalTime = Date.now() - startTime;

    // Determine final status
    if (insertErrors.length > 0 && totalInserted === 0) {
      // Complete failure
      await updateWebinarParticipantSyncStatus(
        supabase, 
        webinarDbId, 
        'failed', 
        `Database save failed: ${insertErrors.join('; ')}`
      );
      return { count: 0, skipped: false, reason: 'Database save failed completely', warnings: allWarnings };
    } else if (insertErrors.length > 0) {
      // Partial success
      await updateWebinarParticipantSyncStatus(
        supabase, 
        webinarDbId, 
        'synced', 
        `Partial success: ${insertErrors.length} batch errors`
      );
    } else {
      // Complete success
      await updateWebinarParticipantSyncStatus(supabase, webinarDbId, 'synced');
    }

    // Success logging
    console.log(`🎉 ENHANCED PARTICIPANT SYNC COMPLETED for webinar ${webinarId}:`);
    console.log(`  - Total participants processed: ${participants.length}`);
    console.log(`  - Successfully transformed: ${transformedParticipants.length}`);
    console.log(`  - Successfully saved: ${totalInserted}`);
    console.log(`  - Transformation warnings: ${transformationWarnings.length}`);
    console.log(`  - Insert errors: ${insertErrors.length}`);
    console.log(`  - Fetch time: ${fetchTime}ms`);
    console.log(`  - Transform time: ${transformTime}ms`);
    console.log(`  - Insert time: ${insertTime}ms`);
    console.log(`  - Total time: ${totalTime}ms`);

    return { 
      count: totalInserted, 
      skipped: false, 
      warnings: allWarnings.concat(transformationWarnings, insertErrors)
    };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    // Enhanced error categorization
    let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    let statusToSet = 'failed';
    
    if (errorMessage.includes('Scope Error') || errorMessage.includes('Authentication expired')) {
      statusToSet = 'failed';
      errorMessage = `API Access Error: ${errorMessage}`;
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      statusToSet = 'failed';
      errorMessage = `Webinar not found for participant sync: ${errorMessage}`;
    }
    
    await updateWebinarParticipantSyncStatus(supabase, webinarDbId, statusToSet, errorMessage);
    
    console.error(`💥 ENHANCED PARTICIPANT SYNC FAILED for webinar ${webinarId}:`);
    console.error(`  - Error type: ${error.constructor.name}`);
    console.error(`  - Error message: ${errorMessage}`);
    console.error(`  - Time spent: ${totalTime}ms`);
    console.error(`  - Stack trace:`, error.stack);
    
    throw error;
  }
}
