
import { updateSyncLog, updateSyncStage } from './database-operations.ts';
import { SyncOperation } from './types.ts';

// Registrant-focused processor that only handles registrant data
export async function processRegistrantFocusedSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`=== STARTING REGISTRANT-FOCUSED SYNC FOR CONNECTION: ${connection.id} ===`);
  
  try {
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'in_progress',
      started_at: new Date().toISOString(),
      sync_stage: 'registrant_focused_initialization',
      stage_progress_percentage: 5
    });

    // Initialize Zoom API client
    const zoomApi = await import('./zoom-api-client.ts');
    const client = await zoomApi.createZoomAPIClient(connection, supabase);
    
    // Get existing webinars from database (don't fetch new ones)
    console.log('=== FETCHING EXISTING WEBINARS FROM DATABASE ===');
    await updateSyncStage(supabase, syncLogId, null, 'fetching_existing_webinars', 10);
    
    const { data: existingWebinars, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('id, webinar_id, topic, start_time')
      .eq('connection_id', connection.id)
      .order('start_time', { ascending: false });
    
    if (webinarError) {
      throw new Error(`Failed to fetch existing webinars: ${webinarError.message}`);
    }
    
    if (!existingWebinars || existingWebinars.length === 0) {
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        processed_items: 0,
        completed_at: new Date().toISOString(),
        sync_stage: 'completed',
        stage_progress_percentage: 100,
        error_message: 'No existing webinars found to fetch registrants for'
      });
      return;
    }
    
    console.log(`=== FOUND ${existingWebinars.length} EXISTING WEBINARS ===`);
    
    await updateSyncLog(supabase, syncLogId, {
      total_items: existingWebinars.length,
      error_details: { 
        processingMode: 'registrants_only',
        existingWebinarsCount: existingWebinars.length
      }
    });

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let noRegistrantsCount = 0;
    const errors: string[] = [];
    const registrantSummary: any[] = [];
    
    console.log(`=== PROCESSING REGISTRANTS FOR ${existingWebinars.length} WEBINARS ===`);
    
    for (const webinar of existingWebinars) {
      try {
        const progress = Math.round((processedCount / existingWebinars.length) * 80) + 15;
        await updateSyncStage(supabase, syncLogId, webinar.webinar_id?.toString(), 'processing_registrants', progress);
        
        console.log(`=== PROCESSING REGISTRANTS FOR WEBINAR ${webinar.webinar_id} (${processedCount + 1}/${existingWebinars.length}) ===`);
        console.log(`Title: ${webinar.topic}`);
        console.log(`DB ID: ${webinar.id}`);
        
        // Multi-strategy registrant fetching
        const registrantResult = await fetchRegistrantsWithMultipleStrategies(
          client, 
          webinar.webinar_id, 
          webinar.topic
        );
        
        if (registrantResult.success && registrantResult.registrants.length > 0) {
          console.log(`✅ Found ${registrantResult.registrants.length} registrants for webinar ${webinar.webinar_id}`);
          
          // Process registrants
          const insertResult = await processWebinarRegistrants(
            supabase,
            registrantResult.registrants,
            webinar.id,
            webinar.webinar_id
          );
          
          if (insertResult.success) {
            successCount++;
            registrantSummary.push({
              webinarId: webinar.webinar_id,
              title: webinar.topic,
              registrantsFound: registrantResult.registrants.length,
              registrantsInserted: insertResult.insertedCount,
              strategy: registrantResult.strategy
            });
          } else {
            errors.push(`Webinar ${webinar.webinar_id}: Database insertion failed - ${insertResult.error}`);
            failedCount++;
          }
        } else if (registrantResult.success && registrantResult.registrants.length === 0) {
          console.log(`ℹ️ No registrants found for webinar ${webinar.webinar_id}`);
          noRegistrantsCount++;
          registrantSummary.push({
            webinarId: webinar.webinar_id,
            title: webinar.topic,
            registrantsFound: 0,
            registrantsInserted: 0,
            strategy: registrantResult.strategy
          });
        } else {
          console.error(`❌ Failed to fetch registrants for webinar ${webinar.webinar_id}: ${registrantResult.error}`);
          errors.push(`Webinar ${webinar.webinar_id}: ${registrantResult.error}`);
          failedCount++;
        }
        
        processedCount++;
        
        // Update progress
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount,
          stage_progress_percentage: Math.round((processedCount / existingWebinars.length) * 80) + 15
        });
        
      } catch (webinarError) {
        console.error(`❌ Critical error processing registrants for webinar ${webinar.webinar_id}:`, webinarError);
        errors.push(`Webinar ${webinar.webinar_id}: ${webinarError.message}`);
        failedCount++;
        processedCount++;
      }
    }
    
    const syncStatus = failedCount === 0 ? 'completed' : 
                      successCount > 0 ? 'partial' : 'failed';
    
    console.log(`=== REGISTRANT-FOCUSED SYNC COMPLETED ===`);
    console.log(`Status: ${syncStatus}`);
    console.log(`Processed: ${processedCount}/${existingWebinars.length}`);
    console.log(`Success: ${successCount}, Failed: ${failedCount}, No Registrants: ${noRegistrantsCount}`);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: syncStatus,
      processed_items: processedCount,
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      error_message: errors.length > 0 ? `${failedCount} webinars failed, ${noRegistrantsCount} had no registrants` : null,
      error_details: { 
        errors, 
        successCount, 
        failedCount,
        noRegistrantsCount,
        registrantSummary,
        processingMode: 'registrants_only'
      }
    });
    
  } catch (error) {
    console.error('❌ Registrant-focused sync failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: `Registrant-focused sync failed: ${error.message}`,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });
    
    throw error;
  }
}

// Multi-strategy registrant fetching with enhanced error handling
async function fetchRegistrantsWithMultipleStrategies(
  client: any,
  webinarId: string,
  webinarTitle: string
): Promise<{ success: boolean; registrants: any[]; error?: string; strategy?: string }> {
  
  console.log(`🔍 Trying multiple strategies to fetch registrants for webinar ${webinarId}...`);
  
  // Strategy 1: Standard webinar registrants
  try {
    console.log(`📋 Strategy 1: Standard webinar registrants for ${webinarId}...`);
    const registrants = await client.getWebinarRegistrants(webinarId);
    if (registrants && registrants.length > 0) {
      console.log(`✅ Strategy 1 successful: Found ${registrants.length} registrants`);
      return { success: true, registrants, strategy: 'standard_webinar' };
    }
    console.log(`⚠️ Strategy 1: No registrants found`);
  } catch (error) {
    console.log(`⚠️ Strategy 1 failed: ${error.message}`);
  }

  // Strategy 2: Meeting registrants (webinars are sometimes stored as meetings)
  try {
    console.log(`📋 Strategy 2: Meeting registrants for ${webinarId}...`);
    const registrants = await client.getMeetingRegistrants(webinarId);
    if (registrants && registrants.length > 0) {
      console.log(`✅ Strategy 2 successful: Found ${registrants.length} registrants`);
      return { success: true, registrants, strategy: 'meeting_registrants' };
    }
    console.log(`⚠️ Strategy 2: No registrants found`);
  } catch (error) {
    console.log(`⚠️ Strategy 2 failed: ${error.message}`);
  }

  // Strategy 3: All registrant statuses (approved, denied, pending)
  try {
    console.log(`📋 Strategy 3: All registrant statuses for ${webinarId}...`);
    const allRegistrants = [];
    const statuses = ['approved', 'denied', 'pending'];
    
    for (const status of statuses) {
      try {
        const registrants = await client.getWebinarRegistrants(webinarId, { status });
        if (registrants && registrants.length > 0) {
          console.log(`✅ Found ${registrants.length} ${status} registrants`);
          allRegistrants.push(...registrants);
        }
      } catch (statusError) {
        console.log(`⚠️ Failed to fetch ${status} registrants: ${statusError.message}`);
      }
    }
    
    if (allRegistrants.length > 0) {
      console.log(`✅ Strategy 3 successful: Found ${allRegistrants.length} total registrants`);
      return { success: true, registrants: allRegistrants, strategy: 'all_statuses' };
    }
    console.log(`⚠️ Strategy 3: No registrants found in any status`);
  } catch (error) {
    console.log(`⚠️ Strategy 3 failed: ${error.message}`);
  }

  // Strategy 4: Alternative API endpoints
  try {
    console.log(`📋 Strategy 4: Alternative API endpoints for ${webinarId}...`);
    const registrants = await client.getAlternativeRegistrants(webinarId);
    if (registrants && registrants.length > 0) {
      console.log(`✅ Strategy 4 successful: Found ${registrants.length} registrants`);
      return { success: true, registrants, strategy: 'alternative_endpoint' };
    }
    console.log(`⚠️ Strategy 4: No registrants found`);
  } catch (error) {
    console.log(`⚠️ Strategy 4 failed: ${error.message}`);
  }

  // All strategies failed or found no registrants
  console.log(`❌ All strategies exhausted for webinar ${webinarId}`);
  return { 
    success: true, 
    registrants: [], 
    strategy: 'no_registrants_found',
    error: 'No registrants found using any strategy'
  };
}

// Process and insert registrants for a webinar
async function processWebinarRegistrants(
  supabase: any,
  registrants: any[],
  webinarDbId: string,
  webinarId: string
): Promise<{ success: boolean; error?: string; insertedCount?: number }> {
  
  try {
    console.log(`💾 Processing ${registrants.length} registrants for webinar ${webinarId}...`);
    
    // Transform registrants for database
    const transformedRegistrants = registrants.map(registrant => {
      return {
        webinar_id: webinarDbId,
        registrant_id: registrant.id || registrant.registrant_id || `reg_${Date.now()}_${Math.random()}`,
        email: registrant.email,
        first_name: registrant.first_name,
        last_name: registrant.last_name,
        address: registrant.address,
        city: registrant.city,
        state: registrant.state,
        zip: registrant.zip,
        country: registrant.country,
        phone: registrant.phone,
        industry: registrant.industry,
        org: registrant.org,
        job_title: registrant.job_title,
        purchasing_time_frame: registrant.purchasing_time_frame,
        role_in_purchase_process: registrant.role_in_purchase_process,
        no_of_employees: registrant.no_of_employees,
        comments: registrant.comments,
        status: registrant.status || 'approved',
        registration_time: registrant.registration_time || registrant.create_time || new Date().toISOString(),
        join_url: registrant.join_url,
        create_time: registrant.create_time,
        custom_questions: registrant.custom_questions ? JSON.stringify(registrant.custom_questions) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    console.log(`Transformed ${transformedRegistrants.length} registrants for database insertion`);
    
    // Insert registrants with proper upsert handling
    const { data: insertedRegistrants, error: insertError } = await supabase
      .from('zoom_registrants')
      .upsert(
        transformedRegistrants,
        {
          onConflict: 'webinar_id,registrant_id',
          ignoreDuplicates: false
        }
      )
      .select('id');

    if (insertError) {
      console.error('Registrant insertion failed:', insertError);
      return { 
        success: false, 
        error: `Database insertion failed: ${insertError.message}` 
      };
    }

    const insertedCount = insertedRegistrants?.length || transformedRegistrants.length;
    console.log(`✅ Successfully inserted ${insertedCount} registrants`);
    
    return { 
      success: true,
      insertedCount
    };
    
  } catch (error) {
    console.error(`❌ Error processing registrants for webinar ${webinarId}:`, error);
    return { 
      success: false, 
      error: `Processing failed: ${error.message}` 
    };
  }
}
