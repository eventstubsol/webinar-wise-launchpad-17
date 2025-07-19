
/**
 * Comprehensive sync processor with enhanced data fetching and status fixing
 */

// Zoom API client for edge functions
class ZoomApiClient {
  static async get(endpoint: string, accessToken: string): Promise<any> {
    try {
      const url = `https://api.zoom.us/v2${endpoint}`;
      console.log(`🔗 Making API call to: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data, statusCode: response.status };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error.message,
        statusCode: 500,
        retryable: true
      };
    }
  }
}

// Zoom Registrant Service for edge functions
class ZoomRegistrantService {
  static async getAllRegistrants(webinarId: string, accessToken: string, options: {
    includeAllStatuses?: boolean;
    occurrenceId?: string;
    pageSize?: number;
  } = {}): Promise<any> {
    const { includeAllStatuses = true, occurrenceId, pageSize = 300 } = options;
    
    try {
      const allRegistrants: any[] = [];
      const statuses = includeAllStatuses ? ['approved', 'pending', 'denied'] : ['approved'];
      
      for (const status of statuses) {
        let nextPageToken: string | undefined;
        let hasMore = true;
        
        while (hasMore) {
          const endpoint = occurrenceId 
            ? `/webinars/${webinarId}/registrants?occurrence_id=${occurrenceId}&status=${status}&page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`
            : `/webinars/${webinarId}/registrants?status=${status}&page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
          
          const response = await ZoomApiClient.get(endpoint, accessToken);
          
          if (!response.success) {
            console.error(`Failed to fetch ${status} registrants:`, response.error);
            break;
          }
          
          const registrants = response.data?.registrants || [];
          
          const statusRegistrants = registrants.map((r: any) => ({
            ...r,
            registration_status: status,
            occurrence_id: occurrenceId || null
          }));
          
          allRegistrants.push(...statusRegistrants);
          
          nextPageToken = response.data?.next_page_token;
          hasMore = !!nextPageToken && registrants.length === pageSize;
        }
      }
      
      return {
        success: true,
        data: allRegistrants,
        statusCode: 200
      };
      
    } catch (error) {
      console.error('Error fetching registrants:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch registrants',
        statusCode: 500,
        retryable: true
      };
    }
  }
}

// Zoom Participant Service for edge functions  
class ZoomParticipantService {
  static async getAllParticipants(webinarId: string, accessToken: string, options: {
    pageSize?: number;
    occurrenceId?: string;
  } = {}): Promise<any> {
    const { pageSize = 300, occurrenceId } = options;
    
    try {
      const allParticipants: any[] = [];
      let nextPageToken: string | undefined;
      let hasMore = true;
      
      while (hasMore) {
        const endpoint = occurrenceId
          ? `/webinars/${webinarId}/participants?occurrence_id=${occurrenceId}&page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`
          : `/webinars/${webinarId}/participants?page_size=${pageSize}${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
        
        const response = await ZoomApiClient.get(endpoint, accessToken);
        
        if (!response.success) {
          console.error('Failed to fetch participants:', response.error);
          break;
        }
        
        const participants = response.data?.participants || [];
        allParticipants.push(...participants);
        
        nextPageToken = response.data?.next_page_token;
        hasMore = !!nextPageToken && participants.length === pageSize;
      }
      
      return {
        success: true,
        data: allParticipants,
        statusCode: 200
      };
      
    } catch (error) {
      console.error('Error fetching participants:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch participants',
        statusCode: 500,
        retryable: true
      };
    }
  }
}

export interface ComprehensiveSyncResults {
  webinarsSynced: number;
  registrantsSynced: number;
  participantsSynced: number;
  statusesFixed: number;
  errors: Array<{ webinarId: string; error: string; type: string }>;
}

/**
 * Calculate webinar status based on timing
 */
function calculateWebinarStatus(webinar: any): { status: string; isEligibleForParticipantSync: boolean } {
  if (!webinar.start_time || !webinar.duration) {
    return { status: 'unknown', isEligibleForParticipantSync: false };
  }

  const now = new Date();
  const startTime = new Date(webinar.start_time);
  const endTime = new Date(startTime.getTime() + webinar.duration * 60 * 1000);
  const bufferEnd = new Date(endTime.getTime() + 5 * 60 * 1000);

  let status: string;
  let isEligibleForParticipantSync = false;

  if (now < startTime) {
    status = 'upcoming';
  } else if (now >= startTime && now <= bufferEnd) {
    status = 'live';
    isEligibleForParticipantSync = true; // Live webinars might have some participant data
  } else {
    status = 'ended';
    isEligibleForParticipantSync = true; // Past webinars should have participant data
  }

  return { status, isEligibleForParticipantSync };
}

/**
 * Determine participant sync status based on webinar timing
 */
function determineParticipantSyncStatus(webinar: any): string {
  const { isEligibleForParticipantSync } = calculateWebinarStatus(webinar);
  
  if (!isEligibleForParticipantSync) {
    return 'not_applicable';
  }
  
  // If it's eligible but hasn't been synced yet, mark as pending
  return 'pending';
}

/**
 * Main comprehensive sync processor
 */
export async function processComprehensiveWebinarSync(
  supabase: any,
  syncOperation: any,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log(`🚀 Starting comprehensive webinar sync for connection: ${connection.id}`);
  
  const results: ComprehensiveSyncResults = {
    webinarsSynced: 0,
    registrantsSynced: 0,
    participantsSynced: 0,
    statusesFixed: 0,
    errors: []
  };

  try {
    // Step 1: Fix all existing webinar statuses first
    console.log(`🔧 Phase 1: Fixing webinar statuses...`);
    await updateSyncStage(supabase, syncLogId, 'fixing_statuses', 10);
    
    const statusFixResults = await fixWebinarStatuses(supabase, connection.id);
    results.statusesFixed = statusFixResults.updatedCount;
    console.log(`✅ Fixed ${results.statusesFixed} webinar statuses`);

    // Step 2: Get all webinars for sync
    console.log(`📊 Phase 2: Fetching webinars for comprehensive sync...`);
    await updateSyncStage(supabase, syncLogId, 'fetching_webinars', 20);
    
    const { data: webinars, error: webinarsError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('connection_id', connection.id)
      .order('start_time', { ascending: false });

    if (webinarsError) {
      throw new Error(`Failed to fetch webinars: ${webinarsError.message}`);
    }

    console.log(`📊 Found ${webinars.length} webinars for comprehensive sync`);

    // Step 3: Process each webinar with enhanced sync
    const totalWebinars = webinars.length;
    for (let i = 0; i < webinars.length; i++) {
      const webinar = webinars[i];
      const progressPercent = Math.round(20 + ((i / totalWebinars) * 70)); // 20-90%
      
      console.log(`🔄 Processing webinar ${i + 1}/${totalWebinars}: ${webinar.topic}`);
      await updateSyncStage(supabase, syncLogId, `processing_webinar_${i + 1}`, progressPercent);

      try {
        const webinarResults = await processWebinarComprehensively(supabase, webinar, connection.id);
        
        if (webinarResults.success) {
          results.webinarsSynced++;
          results.registrantsSynced += webinarResults.registrants;
          results.participantsSynced += webinarResults.participants;
        } else {
          results.errors.push({
            webinarId: webinar.zoom_webinar_id,
            error: webinarResults.error || 'Unknown error',
            type: 'webinar_processing'
          });
        }
      } catch (error) {
        console.error(`❌ Failed to process webinar ${webinar.zoom_webinar_id}:`, error);
        results.errors.push({
          webinarId: webinar.zoom_webinar_id,
          error: error.message,
          type: 'webinar_processing'
        });
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 4: Final validation and cleanup
    console.log(`🔍 Phase 4: Final validation...`);
    await updateSyncStage(supabase, syncLogId, 'validation', 95);
    
    const validationResults = await validateSyncResults(supabase, connection.id);
    console.log(`📊 Validation results:`, validationResults);

    // Complete sync
    await updateSyncStage(supabase, syncLogId, 'completed', 100);
    
    console.log(`🎉 Comprehensive sync completed:`, results);

  } catch (error) {
    console.error(`💥 Comprehensive sync failed:`, error);
    
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', syncLogId);
    
    throw error;
  }
}

/**
 * Fix webinar statuses using database function
 */
async function fixWebinarStatuses(supabase: any, connectionId: string): Promise<{ updatedCount: number }> {
  try {
    // Use the database function to fix all statuses
    const { data, error } = await supabase.rpc('system_update_webinar_statuses');
    
    if (error) {
      console.error('Failed to fix webinar statuses:', error);
      return { updatedCount: 0 };
    }

    const result = data[0];
    console.log(`✅ Status fix results: Updated ${result.updated_count}, Upcoming: ${result.upcoming_count}, Live: ${result.live_count}, Ended: ${result.ended_count}`);
    
    return { updatedCount: result.updated_count };
  } catch (error) {
    console.error('Error fixing webinar statuses:', error);
    return { updatedCount: 0 };
  }
}

/**
 * Process individual webinar comprehensively
 */
async function processWebinarComprehensively(
  supabase: any,
  webinar: any,
  connectionId: string
): Promise<{ success: boolean; registrants: number; participants: number; error?: string }> {
  console.log(`🔄 Comprehensive processing webinar ${webinar.zoom_webinar_id}: ${webinar.topic}`);
  
  try {
    // Calculate proper status and sync eligibility
    const statusInfo = calculateWebinarStatus(webinar);
    const participantSyncStatus = determineParticipantSyncStatus(webinar);
    
    console.log(`📊 Webinar status: ${statusInfo.status}, Participant sync eligible: ${statusInfo.isEligibleForParticipantSync}`);

    // Update webinar with correct status and participant sync status
    const { error: webinarUpdateError } = await supabase
      .from('zoom_webinars')
      .update({
        status: statusInfo.status,
        participant_sync_status: participantSyncStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinar.id);

    if (webinarUpdateError) {
      console.error(`❌ Failed to update webinar status:`, webinarUpdateError);
    }

    let registrantCount = 0;
    let participantCount = 0;

    // Get connection details for API calls
    const { data: connectionData, error: connectionError } = await supabase
      .from('zoom_connections')
      .select('access_token')
      .eq('id', connectionId)
      .single();

    if (connectionError || !connectionData?.access_token) {
      console.error(`❌ Failed to get access token:`, connectionError);
      throw new Error('Access token not available');
    }

    // Fetch registrants for all webinars (always available)
    console.log(`📝 Fetching registrants for webinar ${webinar.zoom_webinar_id}`);
    try {
      const registrantsResponse = await ZoomRegistrantService.getAllRegistrants(webinar.zoom_webinar_id, connectionData.access_token);
      const registrants = registrantsResponse.success ? registrantsResponse.data : [];
      console.log(`📊 Found ${registrants.length} registrants`);

      if (registrants.length > 0) {
        const transformedRegistrants = registrants.map(r => ({
          webinar_id: webinar.id,
          registrant_id: r.id || r.registrant_id,
          email: r.email,
          first_name: r.first_name,
          last_name: r.last_name,
          registration_time: r.registration_time || r.created_at,
          status: r.status || 'approved',
          join_url: r.join_url,
          city: r.city,
          state: r.state,
          country: r.country,
          phone: r.phone,
          job_title: r.job_title,
          org: r.org,
          industry: r.industry,
          custom_questions: r.custom_questions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: registrantError } = await supabase
          .from('zoom_registrants')
          .upsert(transformedRegistrants, {
            onConflict: 'webinar_id,registrant_id',
            ignoreDuplicates: false
          });

        if (registrantError) {
          console.error(`❌ Failed to save registrants:`, registrantError);
        } else {
          registrantCount = registrants.length;
          console.log(`✅ Saved ${registrantCount} registrants`);
        }
      }
    } catch (registrantError) {
      console.error(`❌ Failed to fetch registrants:`, registrantError);
    }

    // Fetch participants only for eligible webinars (past/live)
    if (statusInfo.isEligibleForParticipantSync) {
      console.log(`👥 Fetching participants for webinar ${webinar.zoom_webinar_id}`);
      try {
        const participantsResponse = await ZoomParticipantService.getAllParticipants(webinar.zoom_webinar_id, connectionData.access_token);
        const participants = participantsResponse.success ? participantsResponse.data : [];
        console.log(`📊 Found ${participants.length} participants`);

        if (participants.length > 0) {
          const transformedParticipants = participants.map(p => ({
            webinar_id: webinar.id,
            participant_id: p.id || p.participant_id || p.user_id,
            participant_name: p.name || p.participant_name,
            participant_email: p.email || p.participant_email,
            join_time: p.join_time,
            leave_time: p.leave_time,
            duration: p.duration,
            attentiveness_score: p.attentiveness_score,
            device_info: p.device ? JSON.stringify(p.device) : null,
            user_location: p.location ? JSON.stringify(p.location) : null,
            participant_user_id: p.user_id,
            participant_uuid: p.participant_uuid,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const { error: participantError } = await supabase
            .from('zoom_participants')
            .upsert(transformedParticipants, {
              onConflict: 'webinar_id,participant_id',
              ignoreDuplicates: false
            });

          if (participantError) {
            console.error(`❌ Failed to save participants:`, participantError);
          } else {
            participantCount = participants.length;
            console.log(`✅ Saved ${participantCount} participants`);
          }
        }

        // Update participant sync status
        const finalParticipantSyncStatus = participants.length > 0 ? 'synced' : 'no_participants';
        await supabase
          .from('zoom_webinars')
          .update({
            participant_sync_status: finalParticipantSyncStatus,
            participant_sync_attempted_at: new Date().toISOString(),
            participant_sync_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', webinar.id);

      } catch (participantError) {
        console.error(`❌ Failed to fetch participants:`, participantError);
        
        // Update sync status to failed
        await supabase
          .from('zoom_webinars')
          .update({
            participant_sync_status: 'failed',
            participant_sync_attempted_at: new Date().toISOString(),
            participant_sync_error: participantError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', webinar.id);
      }
    } else {
      // Mark as not applicable for future webinars
      await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'not_applicable',
          updated_at: new Date().toISOString()
        })
        .eq('id', webinar.id);
    }

    // Update webinar counts
    await updateWebinarCounts(supabase, webinar.id, registrantCount, participantCount);

    console.log(`✅ Successfully processed webinar ${webinar.zoom_webinar_id}: ${registrantCount} registrants, ${participantCount} participants`);

    return {
      success: true,
      registrants: registrantCount,
      participants: participantCount
    };

  } catch (error) {
    console.error(`❌ Failed to process webinar ${webinar.zoom_webinar_id}:`, error);
    return {
      success: false,
      registrants: 0,
      participants: 0,
      error: error.message
    };
  }
}

/**
 * Update webinar counts using correct column names
 */
async function updateWebinarCounts(supabase: any, webinarDbId: string, registrantCount: number, participantCount: number): Promise<void> {
  try {
    console.log(`📊 Updating webinar counts: ${registrantCount} registrants, ${participantCount} participants`);
    
    const totalAbsentees = Math.max(0, registrantCount - participantCount);
    
    const { error } = await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: registrantCount,
        total_attendees: participantCount,
        total_absentees: totalAbsentees,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (error) {
      console.error(`❌ Failed to update webinar counts:`, error);
    } else {
      console.log(`✅ Updated webinar counts successfully`);
    }
  } catch (error) {
    console.error(`❌ Error updating webinar counts:`, error);
  }
}

/**
 * Update sync stage with progress
 */
async function updateSyncStage(supabase: any, syncLogId: string, stage: string, progress: number): Promise<void> {
  try {
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_stage: stage,
        stage_progress_percentage: progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);
  } catch (error) {
    console.error('Failed to update sync stage:', error);
  }
}

/**
 * Validate sync results
 */
async function validateSyncResults(supabase: any, connectionId: string): Promise<any> {
  try {
    // Get counts of webinars by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('zoom_webinars')
      .select('status, participant_sync_status')
      .eq('connection_id', connectionId);

    if (statusError) {
      console.error('Failed to get status counts:', statusError);
      return { error: statusError.message };
    }

    // Count registrants and participants
    const { data: registrantCounts, error: registrantError } = await supabase
      .from('zoom_registrants')
      .select('webinar_id')
      .in('webinar_id', statusCounts.map((w: any) => w.id));

    const { data: participantCounts, error: participantError } = await supabase
      .from('zoom_participants')
      .select('webinar_id')
      .in('webinar_id', statusCounts.map((w: any) => w.id));

    return {
      totalWebinars: statusCounts.length,
      totalRegistrants: registrantCounts?.length || 0,
      totalParticipants: participantCounts?.length || 0,
      statusDistribution: statusCounts.reduce((acc: any, webinar: any) => {
        acc[webinar.status] = (acc[webinar.status] || 0) + 1;
        return acc;
      }, {}),
      participantSyncDistribution: statusCounts.reduce((acc: any, webinar: any) => {
        acc[webinar.participant_sync_status] = (acc[webinar.participant_sync_status] || 0) + 1;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Validation error:', error);
    return { error: error.message };
  }
}
