
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  action: 'start' | 'progress' | 'cancel' | 'test';
  connectionId: string;
  syncType?: string;
  syncId?: string;
  webinarId?: string;
}

interface WebinarData {
  id: string;
  uuid?: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone?: string;
  agenda?: string;
  created_at?: string;
  start_url?: string;
  join_url?: string;
  password?: string;
  h323_password?: string;
  pstn_password?: string;
  encrypted_password?: string;
  settings?: any;
  status?: string;
  host_id?: string;
  host_email?: string;
  registrants_count?: number;
  occurrences?: any[];
  tracking_fields?: any[];
}

interface ProcessingResult {
  success: boolean;
  registrants: number;
  participants: number;
  error?: string;
  webinarId: string;
  webinarTitle: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log('🚀 Zoom Sync Unified - Request received:', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: SyncRequest = await req.json();
    
    console.log(`🚀 Zoom Sync Unified - Action: ${body.action}`, {
      connectionId: body.connectionId,
      syncType: body.syncType,
      syncId: body.syncId,
      webinarId: body.webinarId
    });

    // Handle different actions
    switch (body.action) {
      case 'start':
        return await handleStartSync(supabase, body);
      case 'progress':
        return await handleGetProgress(supabase, body);
      case 'cancel':
        return await handleCancelSync(supabase, body);
      case 'test':
        return await handleTestConnection(supabase, body);
      default:
        throw new Error(`Unknown action: ${body.action}`);
    }

  } catch (error) {
    console.error('❌ Zoom Sync Unified Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function handleStartSync(supabase: any, body: SyncRequest): Promise<Response> {
  const { connectionId, syncType = 'manual' } = body;
  
  if (!connectionId) {
    throw new Error('Connection ID is required');
  }

  console.log(`🔄 Starting sync for connection: ${connectionId}`);

  // Get connection details
  const { data: connection, error: connectionError } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (connectionError || !connection) {
    console.error('❌ Connection not found:', connectionError);
    throw new Error('Connection not found');
  }

  // Create sync log
  const syncId = crypto.randomUUID();
  const { error: syncLogError } = await supabase
    .from('zoom_sync_logs')
    .insert({
      id: syncId,
      connection_id: connectionId,
      sync_type: syncType,
      sync_status: 'running',
      started_at: new Date().toISOString(),
      total_items: 0,
      processed_items: 0,
      sync_stage: 'starting'
    });

  if (syncLogError) {
    console.error('❌ Failed to create sync log:', syncLogError);
    throw new Error('Failed to create sync log');
  }

  console.log(`✅ Created sync log: ${syncId}`);

  // Start the sync process asynchronously
  processWebinarSync(supabase, syncId, connection).catch(error => {
    console.error(`❌ Sync ${syncId} failed:`, error);
  });

  return new Response(
    JSON.stringify({
      success: true,
      syncId,
      message: 'Sync started successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processWebinarSync(supabase: any, syncId: string, connection: any): Promise<void> {
  let processedCount = 0;
  let errorCount = 0;
  let totalRegistrants = 0;
  let totalParticipants = 0;
  const errors: string[] = [];

  try {
    console.log(`🔄 [${syncId}] Starting webinar sync process`);
    
    // STEP 1: Database Health Check
    console.log(`🏥 [${syncId}] Running database health check...`);
    const healthCheck = await performDatabaseHealthCheck(supabase);
    if (!healthCheck.success) {
      throw new Error(`Database health check failed: ${healthCheck.error}`);
    }
    console.log(`✅ [${syncId}] Database health check passed`);
    
    // Update sync status
    await updateSyncProgress(supabase, syncId, 5, 'Initializing sync...', 0, 0);

    // Get access token
    const accessToken = await getAccessToken(connection);
    if (!accessToken) {
      throw new Error('Failed to obtain access token');
    }

    console.log(`✅ [${syncId}] Got access token`);
    await updateSyncProgress(supabase, syncId, 10, 'Fetching webinars...', 0, 0);

    // Fetch webinars
    const webinars = await fetchWebinars(accessToken);
    console.log(`📊 [${syncId}] Found ${webinars.length} webinars to process`);

    if (webinars.length === 0) {
      await completeSyncLog(supabase, syncId, 0, 0, 0, []);
      return;
    }

    // Update total items
    await supabase
      .from('zoom_sync_logs')
      .update({
        total_items: webinars.length,
        sync_stage: 'processing_webinars'
      })
      .eq('id', syncId);

    await updateSyncProgress(supabase, syncId, 20, `Processing ${webinars.length} webinars...`, 0, webinars.length);

    // Process each webinar
    for (let i = 0; i < webinars.length; i++) {
      const webinar = webinars[i];
      const progressPercent = Math.round(20 + ((i / webinars.length) * 70)); // 20-90%
      
      console.log(`🔄 [${syncId}] Processing webinar ${i + 1}/${webinars.length}: ${webinar.topic} (ID: ${webinar.id})`);
      
      try {
        await updateSyncProgress(
          supabase, 
          syncId, 
          progressPercent, 
          `Processing: ${webinar.topic} (${i + 1}/${webinars.length})`,
          processedCount,
          webinars.length
        );

        // Process webinar with enhanced data
        const result = await processWebinarWithEnhancedData(
          supabase, 
          webinar, 
          connection.id, 
          accessToken,
          syncId
        );

        if (result.success) {
          processedCount++;
          totalRegistrants += result.registrants;
          totalParticipants += result.participants;
          console.log(`✅ [${syncId}] Successfully processed: ${webinar.topic} (${result.registrants} registrants, ${result.participants} participants)`);
        } else {
          errorCount++;
          const errorMsg = `Failed to process ${webinar.topic}: ${result.error}`;
          errors.push(errorMsg);
          console.error(`❌ [${syncId}] ${errorMsg}`);
        }

      } catch (error) {
        errorCount++;
        const errorMsg = `Error processing ${webinar.topic}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ [${syncId}] ${errorMsg}`, error);
      }

      // CRITICAL: Always increment total processed (success or failure)
      // This prevents the sync from getting stuck
      const totalProcessed = processedCount + errorCount;
      
      // Add small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final completion
    console.log(`🎉 [${syncId}] Sync completed: ${processedCount}/${webinars.length} successful, ${errorCount} errors`);
    await completeSyncLog(supabase, syncId, processedCount, totalRegistrants, totalParticipants, errors);

  } catch (error) {
    console.error(`💥 [${syncId}] Critical sync error:`, error);
    await failSyncLog(supabase, syncId, error, errors);
  }
}

async function processWebinarWithEnhancedData(
  supabase: any,
  webinar: WebinarData,
  connectionId: string,
  accessToken: string,
  syncId?: string
): Promise<ProcessingResult> {
  
  const result: ProcessingResult = {
    success: false,
    registrants: 0,
    participants: 0,
    webinarId: webinar.id,
    webinarTitle: webinar.topic
  };

  try {
    console.log(`🔄 Processing webinar: ${webinar.topic} (${webinar.id})`);

    // First, upsert the webinar
    const webinarDbId = await upsertWebinar(supabase, webinar, connectionId, syncId);
    if (!webinarDbId) {
      result.error = 'Failed to save webinar to database';
      return result;
    }

    console.log(`✅ Webinar saved to database with ID: ${webinarDbId}`);

    // Determine if webinar has ended and is eligible for participant data
    const isEligibleForParticipants = isWebinarEligibleForParticipants(webinar);
    console.log(`📊 Webinar eligibility for participants: ${isEligibleForParticipants} (Status: ${webinar.status})`);

    let registrantsCount = 0;
    let participantsCount = 0;

    // Fetch registrants (available for all webinars)
    try {
      console.log(`📋 Fetching registrants for webinar: ${webinar.id}`);
      const registrants = await fetchWebinarRegistrants(accessToken, webinar.id);
      
      if (registrants && registrants.length > 0) {
        console.log(`📋 Found ${registrants.length} registrants`);
        await upsertRegistrants(supabase, registrants, webinarDbId);
        registrantsCount = registrants.length;
        console.log(`✅ Saved ${registrantsCount} registrants`);
      } else {
        console.log(`📋 No registrants found for webinar: ${webinar.id}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching registrants for ${webinar.id}:`, error);
      // Don't fail the entire webinar for registrant errors
    }

    // Fetch participants (only for ended webinars)
    if (isEligibleForParticipants) {
      try {
        console.log(`👥 Fetching participants for ended webinar: ${webinar.id}`);
        const participants = await fetchWebinarParticipants(accessToken, webinar.id);
        
        if (participants && participants.length > 0) {
          console.log(`👥 Found ${participants.length} participants`);
          await upsertParticipants(supabase, participants, webinarDbId);
          participantsCount = participants.length;
          console.log(`✅ Saved ${participantsCount} participants`);
        } else {
          console.log(`👥 No participants found for webinar: ${webinar.id}`);
        }

        // Update webinar participant sync status
        await supabase
          .from('zoom_webinars')
          .update({
            participant_sync_status: 'completed',
            participant_sync_completed_at: new Date().toISOString(),
            total_attendees: participantsCount,
            actual_participant_count: participantsCount
          })
          .eq('id', webinarDbId);

      } catch (error) {
        console.error(`❌ Error fetching participants for ${webinar.id}:`, error);
        
        // Update webinar with failed participant sync status
        await supabase
          .from('zoom_webinars')
          .update({
            participant_sync_status: 'failed',
            participant_sync_error: error.message,
            participant_sync_attempted_at: new Date().toISOString()
          })
          .eq('id', webinarDbId);
      }
    } else {
      // Update webinar to show participant sync is not applicable
      await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'not_applicable'
        })
        .eq('id', webinarDbId);
    }

    // Update webinar totals
    await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: registrantsCount,
        registrants_count: registrantsCount,
        last_synced_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    result.success = true;
    result.registrants = registrantsCount;
    result.participants = participantsCount;
    
    console.log(`✅ Completed processing: ${webinar.topic} - ${registrantsCount} registrants, ${participantsCount} participants`);
    return result;

  } catch (error) {
    console.error(`❌ Error in processWebinarWithEnhancedData for ${webinar.id}:`, error);
    result.error = error.message || 'Unknown processing error';
    return result;
  }
}

function isWebinarEligibleForParticipants(webinar: WebinarData): boolean {
  // Check if webinar has ended based on status
  if (webinar.status === 'ended') {
    return true;
  }
  
  // Fallback: check if webinar should have ended based on timing
  if (webinar.start_time && webinar.duration) {
    const startTime = new Date(webinar.start_time);
    const endTime = new Date(startTime.getTime() + (webinar.duration * 60 * 1000));
    const now = new Date();
    
    // Add 5 minute buffer after scheduled end time
    const bufferTime = new Date(endTime.getTime() + (5 * 60 * 1000));
    
    return now > bufferTime;
  }
  
  return false;
}

async function getAccessToken(connection: any): Promise<string | null> {
  try {
    console.log('🔑 Getting access token...');
    
    if (connection.connection_type === 'server_to_server') {
      // Server-to-Server OAuth
      const tokenUrl = 'https://zoom.us/oauth/token';
      const credentials = btoa(`${connection.client_id}:${connection.client_secret}`);
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: connection.account_id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token request failed:', response.status, errorText);
        throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();
      console.log('✅ Got access token');
      return tokenData.access_token;
    } else {
      // Use existing token for OAuth connections
      return connection.access_token;
    }
  } catch (error) {
    console.error('❌ Error getting access token:', error);
    return null;
  }
}

async function fetchWebinars(accessToken: string): Promise<WebinarData[]> {
  try {
    console.log('📋 Fetching webinars from Zoom API...');
    
    const response = await fetch('https://api.zoom.us/v2/users/me/webinars?page_size=300', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Webinars fetch failed:', response.status, errorText);
      throw new Error(`Failed to fetch webinars: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const webinars = data.webinars || [];
    
    console.log(`✅ Fetched ${webinars.length} webinars`);
    return webinars;
  } catch (error) {
    console.error('❌ Error fetching webinars:', error);
    throw error;
  }
}

async function fetchWebinarRegistrants(accessToken: string, webinarId: string): Promise<any[]> {
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?page_size=300`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`📋 No registrants endpoint available for webinar: ${webinarId}`);
        return [];
      }
      throw new Error(`Failed to fetch registrants: ${response.status}`);
    }

    const data = await response.json();
    return data.registrants || [];
  } catch (error) {
    console.error(`❌ Error fetching registrants for ${webinarId}:`, error);
    return [];
  }
}

async function fetchWebinarParticipants(accessToken: string, webinarId: string): Promise<any[]> {
  try {
    const response = await fetch(`https://api.zoom.us/v2/report/webinars/${webinarId}/participants?page_size=300`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`👥 No participant report available for webinar: ${webinarId}`);
        return [];
      }
      throw new Error(`Failed to fetch participants: ${response.status}`);
    }

    const data = await response.json();
    return data.participants || [];
  } catch (error) {
    console.error(`❌ Error fetching participants for ${webinarId}:`, error);
    return [];
  }
}

async function upsertWebinar(supabase: any, webinar: WebinarData, connectionId: string, syncId?: string): Promise<string | null> {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Attempting to upsert webinar: ${webinar.topic}`);
    console.log(`📝 Webinar data:`, {
      connection_id: connectionId,
      zoom_webinar_id: webinar.id,
      topic: webinar.topic
    });

    const webinarData = {
      connection_id: connectionId,
      zoom_webinar_id: String(webinar.id), // Convert to string to match database schema
      uuid: webinar.uuid || null,
      host_id: webinar.host_id || null,
      topic: webinar.topic,
      type: webinar.type,
      start_time: webinar.start_time ? new Date(webinar.start_time).toISOString() : null,
      duration: webinar.duration || 0,
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
      status: webinar.status || 'scheduled',
      occurrences: webinar.occurrences || [],
      tracking_fields: webinar.tracking_fields || [],
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert(webinarData, {
        onConflict: 'connection_id,zoom_webinar_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    const operationDuration = Date.now() - startTime;

    if (error) {
      console.error('❌ Error upserting webinar:', {
        webinarTitle: webinar.topic,
        zoomWebinarId: webinar.id,
        connectionId: connectionId,
        error: error,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        errorCode: error.code
      });

      // Log failed operation
      if (syncId) {
        await supabase
          .from('zoom_sync_operation_logs')
          .insert({
            sync_id: syncId,
            operation_type: 'webinar_upsert',
            webinar_zoom_id: String(webinar.id),
            operation_status: 'error',
            error_details: {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            },
            operation_duration_ms: operationDuration
          });
      }

      return null;
    }

    // Log successful operation
    if (syncId) {
      await supabase
        .from('zoom_sync_operation_logs')
        .insert({
          sync_id: syncId,
          operation_type: 'webinar_upsert',
          webinar_zoom_id: String(webinar.id),
          operation_status: 'success',
          operation_duration_ms: operationDuration
        });
    }

    console.log(`✅ Successfully upserted webinar: ${webinar.topic} with DB ID: ${data.id}`);
    return data.id;
  } catch (error) {
    const operationDuration = Date.now() - startTime;
    
    console.error('❌ Catch block error in upsertWebinar:', {
      webinarTitle: webinar.topic,
      error: error,
      message: error.message,
      stack: error.stack
    });

    // Log caught error
    if (syncId) {
      await supabase
        .from('zoom_sync_operation_logs')
        .insert({
          sync_id: syncId,
          operation_type: 'webinar_upsert',
          webinar_zoom_id: String(webinar.id),
          operation_status: 'error',
          error_details: {
            message: error.message,
            stack: error.stack,
            type: 'catch_block_error'
            },
            operation_duration_ms: operationDuration
          });
    }

    return null;
  }
}

async function upsertRegistrants(supabase: any, registrants: any[], webinarDbId: string): Promise<void> {
  if (!registrants || registrants.length === 0) {
    return;
  }

  try {
    for (const registrant of registrants) {
      const registrantData = {
        webinar_id: webinarDbId,
        registrant_id: registrant.id || registrant.registrant_id || `reg_${Date.now()}_${Math.random()}`,
        email: registrant.email || 'unknown@example.com',
        first_name: registrant.first_name || null,
        last_name: registrant.last_name || null,
        address: registrant.address || null,
        city: registrant.city || null,
        country: registrant.country || null,
        zip: registrant.zip || null,
        state: registrant.state || null,
        phone: registrant.phone || null,
        industry: registrant.industry || null,
        org: registrant.org || null,
        job_title: registrant.job_title || null,
        purchasing_time_frame: registrant.purchasing_time_frame || null,
        role_in_purchase_process: registrant.role_in_purchase_process || null,
        no_of_employees: registrant.no_of_employees || null,
        comments: registrant.comments || null,
        custom_questions: registrant.custom_questions || [],
        status: registrant.status || 'approved',
        join_url: registrant.join_url || null,
        registration_time: registrant.registration_time ? new Date(registrant.registration_time).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('zoom_registrants')
        .upsert(registrantData, {
          onConflict: 'webinar_id,registrant_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Error upserting registrant:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error in upsertRegistrants:', error);
    throw error;
  }
}

async function upsertParticipants(supabase: any, participants: any[], webinarDbId: string): Promise<void> {
  if (!participants || participants.length === 0) {
    return;
  }

  try {
    for (const participant of participants) {
      const participantUuid = participant.participant_uuid || participant.uuid || participant.id || `part_${Date.now()}_${Math.random()}`;
      
      const participantData = {
        webinar_id: webinarDbId,
        participant_uuid: participantUuid,
        participant_user_id: participant.user_id || participant.participant_user_id || null,
        participant_name: participant.name || participant.participant_name || 'Unknown Participant',
        participant_email: participant.user_email || participant.email || null,
        join_time: participant.join_time ? new Date(participant.join_time).toISOString() : null,
        leave_time: participant.leave_time ? new Date(participant.leave_time).toISOString() : null,
        duration: participant.duration || 0,
        attentiveness_score: participant.attentiveness_score || null,
        registration_time: participant.registration_time ? new Date(participant.registration_time).toISOString() : null,
        approval_type: participant.approval_type || null,
        connection_type: participant.connection_type || null,
        custom_questions: participant.custom_questions || [],
        user_location: participant.user_location || {},
        device_info: participant.device_info || {},
        is_rejoin_session: participant.is_rejoin_session || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('zoom_participants')
        .upsert(participantData, {
          onConflict: 'webinar_id,participant_uuid',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Error upserting participant:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error in upsertParticipants:', error);
    throw error;
  }
}

async function updateSyncProgress(
  supabase: any,
  syncId: string,
  progress: number,
  stage: string,
  processed: number,
  total: number
): Promise<void> {
  try {
    await supabase
      .from('zoom_sync_logs')
      .update({
        stage_progress_percentage: Math.min(100, Math.max(0, progress)),
        sync_stage: stage,
        processed_items: processed,
        total_items: total,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncId);
  } catch (error) {
    console.error('❌ Error updating sync progress:', error);
  }
}

async function completeSyncLog(
  supabase: any,
  syncId: string,
  processedCount: number,
  totalRegistrants: number,
  totalParticipants: number,
  errors: string[]
): Promise<void> {
  try {
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: processedCount,
        webinars_synced: processedCount,
        stage_progress_percentage: 100,
        sync_stage: 'completed',
        error_details: errors.length > 0 ? { errors, totalRegistrants, totalParticipants } : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncId);
  } catch (error) {
    console.error('❌ Error completing sync log:', error);
  }
}

async function failSyncLog(supabase: any, syncId: string, error: any, errors: string[]): Promise<void> {
  try {
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'failed',
        error_message: error.message || 'Unknown error',
        error_details: { 
          mainError: error.message,
          errors: errors,
          stack: error.stack 
        },
        completed_at: new Date().toISOString(),
        sync_stage: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', syncId);
  } catch (updateError) {
    console.error('❌ Error updating failed sync log:', updateError);
  }
}

async function handleGetProgress(supabase: any, body: SyncRequest): Promise<Response> {
  const { syncId } = body;
  
  if (!syncId) {
    throw new Error('Sync ID is required');
  }

  const { data: syncLog, error } = await supabase
    .from('zoom_sync_logs')
    .select('*')
    .eq('id', syncId)
    .single();

  if (error || !syncLog) {
    throw new Error('Sync log not found');
  }

  const progress = Math.min(100, syncLog.stage_progress_percentage || 0);
  const isComplete = syncLog.sync_status === 'completed';
  const isFailed = syncLog.sync_status === 'failed';

  return new Response(
    JSON.stringify({
      success: true,
      progress,
      status: syncLog.sync_status,
      currentOperation: syncLog.sync_stage || 'Processing...',
      processedCount: syncLog.processed_items || 0,
      totalCount: syncLog.total_items || 0,
      isComplete,
      isFailed,
      error_message: syncLog.error_message
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCancelSync(supabase: any, body: SyncRequest): Promise<Response> {
  const { syncId } = body;
  
  if (!syncId) {
    throw new Error('Sync ID is required');
  }

  await supabase
    .from('zoom_sync_logs')
    .update({
      sync_status: 'cancelled',
      completed_at: new Date().toISOString(),
      sync_stage: 'cancelled'
    })
    .eq('id', syncId);

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Sync cancelled successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleTestConnection(supabase: any, body: SyncRequest): Promise<Response> {
  const { connectionId } = body;
  
  if (!connectionId) {
    throw new Error('Connection ID is required');
  }

  // Get connection details
  const { data: connection, error: connectionError } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (connectionError || !connection) {
    throw new Error('Connection not found');
  }

  try {
    const accessToken = await getAccessToken(connection);
    if (!accessToken) {
      throw new Error('Failed to obtain access token');
    }

    // Test API call
    const response = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API test failed: ${response.status}`);
    }

    const userData = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Connection test successful',
        userInfo: {
          email: userData.email,
          account_id: userData.account_id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Connection test failed',
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// CRITICAL: Database Health Check Function
async function performDatabaseHealthCheck(supabase: any): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🏥 Running database health check...');
    
    // Test 1: Check if calculate_webinar_status function exists and works
    const { data: functionTest, error: functionError } = await supabase
      .rpc('calculate_webinar_status', {
        webinar_start_time: new Date().toISOString(),
        webinar_duration: 60
      });

    if (functionError) {
      console.error('❌ Function test failed:', functionError);
      return {
        success: false,
        error: `Database function test failed: ${functionError.message}`
      };
    }

    console.log('✅ Function test passed:', functionTest);

    // Test 2: Test a simple webinar upsert to verify no conflicts
    const testWebinarData = {
      connection_id: '00000000-0000-0000-0000-000000000000', // Use dummy UUID
      zoom_webinar_id: `health_check_${Date.now()}`,
      topic: 'Health Check Test Webinar',
      type: 5,
      duration: 60,
      status: 'ended',
      sync_status: 'health_check',
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabase
      .from('zoom_webinars')
      .upsert(testWebinarData, {
        onConflict: 'connection_id,zoom_webinar_id',
        ignoreDuplicates: false
      })
      .select('id');

    if (upsertError) {
      console.error('❌ Upsert test failed:', upsertError);
      return {
        success: false,
        error: `Database upsert test failed: ${upsertError.message}`
      };
    }

    // Clean up test record
    await supabase
      .from('zoom_webinars')
      .delete()
      .eq('zoom_webinar_id', testWebinarData.zoom_webinar_id);

    console.log('✅ Database health check completed successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return {
      success: false,
      error: `Health check exception: ${error.message}`
    };
  }
}
