
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZoomClient {
  getWebinars(): Promise<any[]>;
  getWebinarRegistrants(webinarId: string): Promise<any[]>;
  getWebinarParticipants(webinarId: string): Promise<any[]>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}

class EnhancedZoomClient implements ZoomClient {
  private token: string;
  private baseUrl = 'https://api.zoom.us/v2';

  constructor(token: string) {
    this.token = token;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint} - Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ API Response: ${endpoint} - Success`);
    return data;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 Testing Zoom API connection...');
      const data = await this.makeRequest('/users/me');
      console.log(`✅ Connection test successful for user: ${data.email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getWebinars(): Promise<any[]> {
    try {
      console.log('📋 Fetching webinars list...');
      const data = await this.makeRequest('/users/me/webinars?page_size=300');
      const webinars = data.webinars || [];
      console.log(`✅ Found ${webinars.length} webinars`);
      return webinars;
    } catch (error) {
      console.error('❌ Failed to fetch webinars:', error);
      throw error;
    }
  }

  async getWebinarRegistrants(webinarId: string): Promise<any[]> {
    try {
      console.log(`👥 Fetching registrants for webinar ${webinarId}...`);
      const data = await this.makeRequest(`/webinars/${webinarId}/registrants?page_size=300`);
      const registrants = data.registrants || [];
      console.log(`✅ Found ${registrants.length} registrants for webinar ${webinarId}`);
      return registrants;
    } catch (error) {
      console.error(`❌ Failed to fetch registrants for webinar ${webinarId}:`, error);
      if (error.message.includes('403') || error.message.includes('401')) {
        console.error('🚨 PERMISSION ERROR: Missing webinar:read:admin scope for registrants');
      }
      throw error;
    }
  }

  async getWebinarParticipants(webinarId: string): Promise<any[]> {
    try {
      console.log(`👤 Fetching participants for webinar ${webinarId}...`);
      const data = await this.makeRequest(`/report/webinars/${webinarId}/participants?page_size=300`);
      const participants = data.participants || [];
      console.log(`✅ Found ${participants.length} participants for webinar ${webinarId}`);
      return participants;
    } catch (error) {
      console.error(`❌ Failed to fetch participants for webinar ${webinarId}:`, error);
      if (error.message.includes('403') || error.message.includes('401')) {
        console.error('🚨 PERMISSION ERROR: Missing report:read:admin scope for participants');
      }
      throw error;
    }
  }
}

// Enhanced webinar eligibility checker
function isWebinarEligibleForParticipants(webinar: any): { eligible: boolean; reason: string } {
  console.log(`🔍 Checking participant eligibility for webinar: ${webinar.topic} (${webinar.id})`);
  console.log(`  - Status: ${webinar.status}`);
  console.log(`  - Start time: ${webinar.start_time}`);
  console.log(`  - Duration: ${webinar.duration}`);

  if (!webinar.start_time) {
    const reason = 'No start time available';
    console.log(`❌ Not eligible: ${reason}`);
    return { eligible: false, reason };
  }

  const now = new Date();
  const startTime = new Date(webinar.start_time);
  const duration = webinar.duration || 60;
  const estimatedEndTime = new Date(startTime.getTime() + (duration * 60 * 1000));
  const bufferTime = new Date(estimatedEndTime.getTime() + (5 * 60 * 1000)); // 5 min buffer

  console.log(`  - Current time: ${now.toISOString()}`);
  console.log(`  - Estimated end: ${estimatedEndTime.toISOString()}`);
  console.log(`  - Buffer time: ${bufferTime.toISOString()}`);

  // Check if webinar has ended with buffer time
  if (now > bufferTime) {
    console.log(`✅ Eligible: Webinar ended with buffer time`);
    return { eligible: true, reason: 'Webinar has ended and buffer time passed' };
  }

  // Check explicit status
  const eligibleStatuses = ['ended', 'finished'];
  if (eligibleStatuses.includes(webinar.status?.toLowerCase())) {
    console.log(`✅ Eligible: Status indicates completion (${webinar.status})`);
    return { eligible: true, reason: `Status indicates webinar completed: ${webinar.status}` };
  }

  const reason = `Webinar not yet eligible - Status: ${webinar.status}, End time: ${estimatedEndTime.toISOString()}`;
  console.log(`❌ Not eligible: ${reason}`);
  return { eligible: false, reason };
}

// Enhanced data processing function
async function processWebinarWithEnhancedData(
  supabase: any,
  client: ZoomClient,
  webinar: any,
  connectionId: string,
  syncLogId: string
): Promise<{ 
  success: boolean; 
  webinarDbId?: string; 
  registrantsCount: number; 
  participantsCount: number; 
  errors: string[] 
}> {
  const errors: string[] = [];
  let registrantsCount = 0;
  let participantsCount = 0;

  console.log(`🔄 Processing webinar: ${webinar.topic} (${webinar.id})`);

  try {
    // Transform and upsert webinar
    const transformedWebinar = {
      connection_id: connectionId,
      zoom_webinar_id: webinar.id.toString(),
      webinar_id: webinar.id.toString(),
      uuid: webinar.uuid || null,
      host_id: webinar.host_id || null,
      topic: webinar.topic || 'Untitled Webinar',
      type: webinar.type || 5,
      start_time: webinar.start_time ? new Date(webinar.start_time).toISOString() : null,
      duration: webinar.duration || 60,
      timezone: webinar.timezone || null,
      agenda: webinar.agenda || null,
      created_at_zoom: webinar.created_at ? new Date(webinar.created_at).toISOString() : null,
      start_url: webinar.start_url || null,
      join_url: webinar.join_url || null,
      password: webinar.password || null,
      h323_password: webinar.h323_password || null,
      pstn_password: webinar.pstn_password || null,
      encrypted_password: webinar.encrypted_password || null,
      settings: webinar.settings || {},
      tracking_fields: webinar.tracking_fields || {},
      occurrences: webinar.occurrences || [],
      status: webinar.status || 'scheduled',
      sync_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log(`💾 Upserting webinar to database...`);
    const { data: webinarData, error: webinarError } = await supabase
      .from('zoom_webinars')
      .upsert(transformedWebinar, {
        onConflict: 'connection_id,zoom_webinar_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (webinarError) {
      console.error(`❌ Error upserting webinar:`, webinarError);
      errors.push(`Failed to save webinar to database: ${webinarError.message}`);
      return { success: false, registrantsCount: 0, participantsCount: 0, errors };
    }

    if (!webinarData?.id) {
      console.error(`❌ No webinar ID returned from upsert`);
      errors.push('Failed to get webinar ID after database insert');
      return { success: false, registrantsCount: 0, participantsCount: 0, errors };
    }

    const webinarDbId = webinarData.id;
    console.log(`✅ Webinar saved with DB ID: ${webinarDbId}`);

    // Check participant eligibility
    const eligibility = isWebinarEligibleForParticipants(webinar);
    
    if (!eligibility.eligible) {
      console.log(`⏭️ Skipping participant/registrant sync: ${eligibility.reason}`);
      
      // Update participant sync status
      await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'not_applicable',
          participant_sync_error: eligibility.reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', webinarDbId);

      return { 
        success: true, 
        webinarDbId, 
        registrantsCount: 0, 
        participantsCount: 0, 
        errors 
      };
    }

    console.log(`✅ Webinar eligible for participant data collection`);

    // Set participant sync status to pending
    await supabase
      .from('zoom_webinars')
      .update({
        participant_sync_status: 'pending',
        participant_sync_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    // Process registrants
    try {
      console.log(`👥 Attempting to fetch registrants...`);
      const registrants = await client.getWebinarRegistrants(webinar.id);
      
      if (registrants && registrants.length > 0) {
        console.log(`📝 Processing ${registrants.length} registrants...`);
        
        const transformedRegistrants = registrants.map(registrant => ({
          webinar_id: webinarDbId,
          registrant_id: registrant.id || registrant.registrant_id,
          email: registrant.email,
          first_name: registrant.first_name || null,
          last_name: registrant.last_name || null,
          address: registrant.address || null,
          city: registrant.city || null,
          state: registrant.state || null,
          zip: registrant.zip || null,
          country: registrant.country || null,
          phone: registrant.phone || null,
          industry: registrant.industry || null,
          org: registrant.org || null,
          job_title: registrant.job_title || null,
          purchasing_time_frame: registrant.purchasing_time_frame || null,
          role_in_purchase_process: registrant.role_in_purchase_process || null,
          no_of_employees: registrant.no_of_employees || null,
          comments: registrant.comments || null,
          custom_questions: registrant.custom_questions || [],
          registration_time: registrant.registration_time || new Date().toISOString(),
          status: registrant.status || 'approved',
          join_url: registrant.join_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: registrantsError } = await supabase
          .from('zoom_registrants')
          .upsert(transformedRegistrants, {
            onConflict: 'webinar_id,registrant_id',
            ignoreDuplicates: false
          });

        if (registrantsError) {
          console.error(`❌ Error saving registrants:`, registrantsError);
          errors.push(`Failed to save registrants: ${registrantsError.message}`);
        } else {
          registrantsCount = registrants.length;
          console.log(`✅ Successfully saved ${registrantsCount} registrants`);
        }
      } else {
        console.log(`📭 No registrants found for webinar ${webinar.id}`);
      }
    } catch (registrantError) {
      console.error(`❌ Error processing registrants:`, registrantError);
      errors.push(`Registrant processing failed: ${registrantError.message}`);
    }

    // Process participants
    try {
      console.log(`👤 Attempting to fetch participants...`);
      const participants = await client.getWebinarParticipants(webinar.id);
      
      if (participants && participants.length > 0) {
        console.log(`📊 Processing ${participants.length} participants...`);
        
        const transformedParticipants = participants.map(participant => ({
          webinar_id: webinarDbId,
          participant_id: participant.participant_uuid || participant.id || participant.user_id || `${participant.email}_${participant.join_time}` || `unknown_${Date.now()}`,
          participant_uuid: participant.participant_uuid || null,
          participant_user_id: participant.participant_user_id || null,
          participant_name: participant.name || participant.participant_name,
          participant_email: participant.email || participant.participant_email,
          join_time: participant.join_time ? new Date(participant.join_time).toISOString() : null,
          leave_time: participant.leave_time ? new Date(participant.leave_time).toISOString() : null,
          duration: participant.duration || 0,
          attentiveness_score: participant.attentiveness_score || null,
          approval_type: participant.approval_type || null,
          connection_type: participant.connection_type || null,
          registration_time: participant.registration_time ? new Date(participant.registration_time).toISOString() : null,
          custom_questions: participant.custom_questions || [],
          user_location: participant.user_location || {},
          device_info: participant.device_info || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: participantsError } = await supabase
          .from('zoom_participants')
          .upsert(transformedParticipants, {
            onConflict: 'webinar_id,participant_id',
            ignoreDuplicates: false
          });

        if (participantsError) {
          console.error(`❌ Error saving participants:`, participantsError);
          errors.push(`Failed to save participants: ${participantsError.message}`);
        } else {
          participantsCount = participants.length;
          console.log(`✅ Successfully saved ${participantsCount} participants`);
        }
      } else {
        console.log(`📭 No participants found for webinar ${webinar.id}`);
      }
    } catch (participantError) {
      console.error(`❌ Error processing participants:`, participantError);
      errors.push(`Participant processing failed: ${participantError.message}`);
    }

    // Update webinar metrics and sync status
    const syncStatus = errors.length === 0 ? 'completed' : 
                      (registrantsCount > 0 || participantsCount > 0) ? 'partial' : 'failed';
    
    await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: registrantsCount,
        total_attendees: participantsCount,
        total_absentees: Math.max(0, registrantsCount - participantsCount),
        participant_sync_status: syncStatus,
        participant_sync_completed_at: new Date().toISOString(),
        participant_sync_error: errors.length > 0 ? errors.join('; ') : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    console.log(`🎯 Final metrics - Registrants: ${registrantsCount}, Participants: ${participantsCount}, Errors: ${errors.length}`);

    return {
      success: true,
      webinarDbId,
      registrantsCount,
      participantsCount,
      errors
    };

  } catch (error) {
    console.error(`💥 Critical error processing webinar ${webinar.id}:`, error);
    errors.push(`Critical processing error: ${error.message}`);
    return { success: false, registrantsCount: 0, participantsCount: 0, errors };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`🚀 Zoom Sync Unified - Request received: ${new Date().toISOString()}`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, connectionId, syncType, syncId, webinarId } = await req.json();
    console.log(`🚀 Zoom Sync Unified - Action: ${action}`, { connectionId, syncType, syncId, webinarId });

    if (action === 'start') {
      // Get connection details
      const { data: connection, error: connectionError } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connection) {
        console.error('❌ Connection not found:', connectionError);
        return Response.json({ 
          success: false, 
          error: 'Connection not found' 
        }, { headers: corsHeaders });
      }

      // Create sync log
      const { data: syncLog, error: syncLogError } = await supabase
        .from('zoom_sync_logs')
        .insert({
          connection_id: connectionId,
          sync_type: syncType,
          sync_status: 'running',
          started_at: new Date().toISOString(),
          sync_stage: 'initializing',
          stage_progress_percentage: 5
        })
        .select('id')
        .single();

      if (syncLogError || !syncLog) {
        console.error('❌ Failed to create sync log:', syncLogError);
        return Response.json({ 
          success: false, 
          error: 'Failed to initialize sync' 
        }, { headers: corsHeaders });
      }

      const newSyncId = syncLog.id;
      
      // Initialize Zoom client and test connection
      const client = new EnhancedZoomClient(connection.access_token);
      const connectionTest = await client.testConnection();
      
      if (!connectionTest.success) {
        await supabase
          .from('zoom_sync_logs')
          .update({
            sync_status: 'failed',
            error_message: `Connection test failed: ${connectionTest.error}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', newSyncId);

        return Response.json({
          success: false,
          error: `Zoom API connection failed: ${connectionTest.error}`
        }, { headers: corsHeaders });
      }

      // Start async processing
      processWebinarsAsync(supabase, client, newSyncId, connectionId);

      return Response.json({
        success: true,
        syncId: newSyncId,
        message: 'Sync started successfully'
      }, { headers: corsHeaders });

    } else if (action === 'progress') {
      const { data: syncLog } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('id', syncId)
        .single();

      if (!syncLog) {
        return Response.json({
          success: false,
          error: 'Sync not found'
        }, { headers: corsHeaders });
      }

      return Response.json({
        success: true,
        progress: syncLog.stage_progress_percentage || 0,
        status: syncLog.sync_status,
        currentOperation: syncLog.sync_stage || 'Processing...',
        processedCount: syncLog.processed_items || 0,
        totalCount: syncLog.total_items || 0,
        error_message: syncLog.error_message
      }, { headers: corsHeaders });
    }

    return Response.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('💥 Sync function error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { headers: corsHeaders });
  }
});

async function processWebinarsAsync(
  supabase: any, 
  client: ZoomClient, 
  syncId: string, 
  connectionId: string
) {
  console.log(`🔄 [${syncId}] Starting async webinar processing...`);
  
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalRegistrants = 0;
  let totalParticipants = 0;
  const allErrors: string[] = [];

  try {
    // Update progress: Fetching webinars
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_stage: 'fetching_webinars',
        stage_progress_percentage: 10
      })
      .eq('id', syncId);

    const webinars = await client.getWebinars();
    console.log(`📊 [${syncId}] Found ${webinars.length} webinars to process`);

    await supabase
      .from('zoom_sync_logs')
      .update({
        total_items: webinars.length,
        sync_stage: 'processing_webinars',
        stage_progress_percentage: 15
      })
      .eq('id', syncId);

    // Process each webinar
    for (let i = 0; i < webinars.length; i++) {
      const webinar = webinars[i];
      console.log(`🔄 [${syncId}] Processing webinar ${i + 1}/${webinars.length}: ${webinar.topic} (ID: ${webinar.id})`);

      try {
        const result = await processWebinarWithEnhancedData(
          supabase, 
          client, 
          webinar, 
          connectionId, 
          syncId
        );

        if (result.success) {
          totalSuccess++;
          totalRegistrants += result.registrantsCount;
          totalParticipants += result.participantsCount;
          console.log(`✅ [${syncId}] Successfully processed: ${webinar.topic} (${result.registrantsCount} registrants, ${result.participantsCount} participants)`);
        } else {
          allErrors.push(`${webinar.topic}: ${result.errors.join(', ')}`);
          console.log(`❌ [${syncId}] Failed to process ${webinar.topic}: ${result.errors.join(', ')}`);
        }

        // Add any individual errors to the collection
        allErrors.push(...result.errors);

      } catch (error) {
        const errorMsg = `${webinar.topic}: ${error.message}`;
        allErrors.push(errorMsg);
        console.error(`❌ [${syncId}] Failed to process ${webinar.topic}:`, error);
      }

      totalProcessed++;

      // Update progress
      const progressPercent = Math.round(20 + ((totalProcessed / webinars.length) * 75));
      await supabase
        .from('zoom_sync_logs')
        .update({
          processed_items: totalProcessed,
          stage_progress_percentage: progressPercent,
          sync_stage: `Processing webinar: ${webinar.topic} (${totalProcessed}/${webinars.length})`
        })
        .eq('id', syncId);
    }

    // Final completion
    const finalStatus = allErrors.length === 0 ? 'completed' : 
                       totalSuccess > 0 ? 'completed_with_errors' : 'failed';

    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: finalStatus,
        completed_at: new Date().toISOString(),
        processed_items: totalProcessed,
        webinars_synced: totalSuccess,
        stage_progress_percentage: 100,
        sync_stage: 'completed',
        error_message: allErrors.length > 0 ? `${allErrors.length} errors occurred` : null,
        error_details: allErrors.length > 0 ? { errors: allErrors.slice(0, 10) } : null,
        metadata: {
          total_webinars: webinars.length,
          successful_webinars: totalSuccess,
          failed_webinars: totalProcessed - totalSuccess,
          total_registrants: totalRegistrants,
          total_participants: totalParticipants,
          error_count: allErrors.length
        }
      })
      .eq('id', syncId);

    console.log(`🎉 [${syncId}] Sync completed: ${totalSuccess}/${webinars.length} successful, ${allErrors.length} errors`);
    console.log(`📊 [${syncId}] Data collected: ${totalRegistrants} registrants, ${totalParticipants} participants`);

  } catch (error) {
    console.error(`💥 [${syncId}] Critical sync error:`, error);
    
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'failed',
        error_message: `Critical sync failure: ${error.message}`,
        completed_at: new Date().toISOString(),
        processed_items: totalProcessed
      })
      .eq('id', syncId);
  }
}
