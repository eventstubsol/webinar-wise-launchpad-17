
import { updateSyncStage } from './database-operations.ts';
import { 
  transformWebinarWithStatusDetection,
  transformRegistrantForDatabase
} from './data-transformers.ts';
import { updateWebinarMetrics } from './metrics-calculator.ts';
import { processParticipantsForWebinar } from './participant-processor.ts';

/**
 * Sync webinar with comprehensive validation and error handling
 */
export async function syncWebinarWithValidation(
  supabase: any,
  webinarData: any,
  registrants: any[],
  participants: any[],
  connectionId: string
): Promise<{ success: boolean; error?: string; webinarId?: string }> {
  console.log(`Starting validated webinar sync for webinar ${webinarData.id}`);
  
  try {
    // Transform webinar with enhanced status detection
    const transformedWebinar = transformWebinarWithStatusDetection(webinarData, connectionId);
    
    console.log(`Transformed webinar ${webinarData.id}:`, {
      id: transformedWebinar.webinar_id,
      status: transformedWebinar.status,
      title: transformedWebinar.topic,
      startTime: transformedWebinar.start_time
    });

    // Use proper upsert to prevent data deletion
    const { data: webinarRecord, error: webinarError } = await supabase
      .from('zoom_webinars')
      .upsert(
        transformedWebinar,
        {
          onConflict: 'connection_id,webinar_id',
          ignoreDuplicates: false
        }
      )
      .select('id')
      .maybeSingle();

    if (webinarError) {
      console.error('Webinar insertion failed:', webinarError);
      return { 
        success: false, 
        error: `Database insertion failed: ${webinarError.message}` 
      };
    }

    let webinarDbId = webinarRecord?.id;
    
    // If no record returned, fetch the existing one
    if (!webinarDbId) {
      const { data: existingWebinar, error: fetchError } = await supabase
        .from('zoom_webinars')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('webinar_id', webinarData.id?.toString() || webinarData.webinar_id?.toString())
        .maybeSingle();
        
      if (fetchError) {
        console.error('Failed to fetch existing webinar:', fetchError);
        return { success: false, error: `Failed to fetch existing webinar: ${fetchError.message}` };
      }
      
      if (!existingWebinar) {
        console.error('No webinar record found after upsert');
        return { success: false, error: 'No webinar record found after upsert' };
      }
      
      webinarDbId = existingWebinar.id;
    }

    console.log(`Webinar processed successfully with ID: ${webinarDbId}`);
    
    // Process registrants if available
    if (registrants && registrants.length > 0) {
      console.log(`Processing ${registrants.length} registrants for webinar ${webinarData.id}`);
      
      const transformedRegistrants = registrants.map(registrant => 
        transformRegistrantForDatabase(registrant, webinarDbId)
      );
      
      const { error: registrantsError } = await supabase
        .from('zoom_registrants')
        .upsert(
          transformedRegistrants,
          {
            onConflict: 'webinar_id,registrant_id',
            ignoreDuplicates: false
          }
        );

      if (registrantsError) {
        console.error('Registrants insertion failed:', registrantsError);
        console.log(`Continuing despite registrants error for webinar ${webinarData.id}`);
      } else {
        console.log(`Successfully processed ${transformedRegistrants.length} registrants`);
      }
    }

    // Process participants using the dedicated processor with fixed constraints
    if (participants && participants.length > 0) {
      const participantResult = await processParticipantsForWebinar(
        supabase,
        participants,
        webinarDbId,
        webinarData.id
      );
      
      if (participantResult.successfulInserts === 0 && participants.length > 0) {
        console.error(`❌ Failed to insert any participants for webinar ${webinarData.id}`);
        console.error(`Transformation errors: ${participantResult.transformationErrors.length}`);
        console.error(`Batch errors: ${participantResult.batchErrors.length}`);
      } else {
        console.log(`✅ Participant processing completed: ${participantResult.successfulInserts}/${participants.length} successful`);
      }
    }

    // Update webinar metrics
    await updateWebinarMetrics(supabase, webinarDbId, registrants || [], participants || []);

    return { 
      success: true, 
      webinarId: webinarDbId 
    };
    
  } catch (error) {
    console.error(`❌ Validation error for webinar ${webinarData.id}:`, error);
    return { 
      success: false, 
      error: `Validation failed: ${error.message}` 
    };
  }
}
