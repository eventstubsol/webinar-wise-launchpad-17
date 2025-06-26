
/**
 * Enhanced participant database operations with proper error handling and session tracking
 * FIXED: Now handles upserts correctly with comprehensive validation
 */

/**
 * Save participants to database with enhanced error handling and session tracking
 * FIXED: Uses proper unique constraint and handles all edge cases
 */
export async function saveParticipantsToDatabase(
  supabase: any,
  participants: any[],
  webinarId: string,
  debugMode = false
): Promise<{ success: boolean; error?: any; savedCount?: number }> {
  try {
    if (!participants || participants.length === 0) {
      console.log('📭 No participants to save');
      return { success: true, savedCount: 0 };
    }

    console.log(`💾 Saving ${participants.length} participants to database`);

    if (debugMode) {
      console.log(`DEBUG: Sample participant data:`, participants[0]);
    }

    // CRITICAL: Pre-validation before database insertion
    const validatedParticipants = participants.map((participant, index) => {
      try {
        // Import validation function
        const { validateParticipantData } = require('./participant-transformer.ts');
        return validateParticipantData(participant, index);
      } catch (error) {
        console.error(`❌ Validation failed for participant ${index}:`, error.message);
        throw error;
      }
    });

    console.log(`✅ All ${validatedParticipants.length} participants passed validation`);

    // Enhanced upsert with proper conflict resolution
    const { data, error } = await supabase
      .from('zoom_participants')
      .upsert(validatedParticipants, {
        onConflict: 'webinar_id,participant_id', // Use the unique constraint we created
        ignoreDuplicates: false
      });

    if (error) {
      console.error('❌ Database upsert error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Enhanced error analysis
      if (error.message.includes('unique constraint')) {
        console.error('❌ Unique constraint violation - analyzing data...');
        const duplicateAnalysis = validatedParticipants.map((p, i) => ({
          index: i,
          participant_id: p.participant_id,
          webinar_id: p.webinar_id,
          email: p.participant_email,
          session_id: p.participant_session_id
        }));
        console.error('❌ Participant analysis:', duplicateAnalysis);
      }
      
      if (error.message.includes('foreign key')) {
        console.error('❌ Foreign key violation - webinar_id may not exist in zoom_webinars table');
      }
      
      return { success: false, error };
    }

    console.log(`✅ Successfully saved ${participants.length} participants to database`);
    
    if (debugMode) {
      console.log(`DEBUG: Database operation completed successfully`);
    }

    return { success: true, savedCount: participants.length };

  } catch (error) {
    console.error('❌ Critical error in saveParticipantsToDatabase:', error);
    console.error('❌ Stack trace:', error.stack);
    return { success: false, error };
  }
}

/**
 * Update participant session tracking after all participants are saved
 * This function analyzes and updates session sequences for participants who joined multiple times
 */
export async function updateParticipantSessionTracking(
  supabase: any,
  webinarDbId: string
): Promise<void> {
  try {
    console.log(`🔄 Updating session tracking for webinar: ${webinarDbId}`);

    // Call the database function to update session tracking
    const { error } = await supabase.rpc('update_participant_session_tracking', {
      p_webinar_id: webinarDbId
    });

    if (error) {
      console.error('❌ Failed to update session tracking:', error);
      // Don't throw - this is not critical for the main sync process
    } else {
      console.log(`✅ Updated session tracking for webinar: ${webinarDbId}`);
    }
  } catch (error) {
    console.error('❌ Error updating session tracking:', error);
    // Don't throw - this is not critical for the main sync process
  }
}
