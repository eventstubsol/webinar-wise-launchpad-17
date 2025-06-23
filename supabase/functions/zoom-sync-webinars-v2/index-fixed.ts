import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface SyncRequest {
  connectionId: string;
  syncMode?: 'full' | 'delta' | 'smart';
  dateRange?: {
    pastDays?: number;
    futureDays?: number;
  };
  resumeSyncId?: string;
}

interface WebinarQueueItem {
  webinar_id: string;
  webinar_type: 'past' | 'upcoming';
  priority?: number;
}

// Rate Limit Manager
class RateLimitManager {
  private callsPerMinute = 0;
  private callsPerSecond = 0;
  private windowStart = Date.now();
  private secondWindowStart = Date.now();
  private readonly MAX_CALLS_PER_MINUTE = 30;
  private readonly MAX_CALLS_PER_SECOND = 2;
  private retryAfter = 0;

  async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForRateLimit();
    
    try {
      const result = await fn();
      this.recordCall();
      return result;
    } catch (error: any) {
      if (error.status === 429) {
        // Handle rate limit error
        const retryAfter = parseInt(error.headers?.['retry-after'] || '60');
        this.retryAfter = Date.now() + (retryAfter * 1000);
        
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.executeWithRateLimit(fn);
      }
      throw error;
    }
  }

  private async waitForRateLimit() {
    // Check if we're in a retry-after period
    if (this.retryAfter > Date.now()) {
      const waitTime = this.retryAfter - Date.now();
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return;
    }

    // Reset windows if needed
    const now = Date.now();
    if (now - this.windowStart > 60000) {
      this.callsPerMinute = 0;
      this.windowStart = now;
    }
    if (now - this.secondWindowStart > 1000) {
      this.callsPerSecond = 0;
      this.secondWindowStart = now;
    }

    // Wait if at per-second limit
    if (this.callsPerSecond >= this.MAX_CALLS_PER_SECOND) {
      const waitTime = 1000 - (now - this.secondWindowStart);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.callsPerSecond = 0;
        this.secondWindowStart = Date.now();
      }
    }

    // Wait if at per-minute limit
    if (this.callsPerMinute >= this.MAX_CALLS_PER_MINUTE) {
      const waitTime = 60000 - (now - this.windowStart);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.callsPerMinute = 0;
        this.windowStart = Date.now();
      }
    }
  }

  private recordCall() {
    this.callsPerMinute++;
    this.callsPerSecond++;
  }
}

// Progress broadcaster
async function broadcastProgress(
  supabase: any,
  syncId: string,
  type: string,
  message: string,
  details?: any,
  percentage?: number
) {
  try {
    await supabase.from('sync_progress_updates').insert({
      sync_id: syncId,
      update_type: type,
      message,
      details: details || {},
      progress_percentage: percentage
    });
  } catch (error) {
    console.error('Failed to broadcast progress:', error);
  }
}

// Get Zoom access token
async function getZoomAccessToken(supabase: any, connectionId: string): Promise<string> {
  const { data: connection, error } = await supabase
    .from('zoom_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    throw new Error('Connection not found');
  }

  // Check if token needs refresh
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow) {
    // Token expired or expiring soon, refresh it
    const refreshResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${Deno.env.get('ZOOM_CLIENT_ID')}:${Deno.env.get('ZOOM_CLIENT_SECRET')}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token
      })
    });

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokens = await refreshResponse.json();
    
    // Update tokens in database
    await supabase
      .from('zoom_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      })
      .eq('id', connectionId);

    return tokens.access_token;
  }

  return connection.access_token;
}

// Fetch webinar list with pagination
async function fetchWebinarList(
  accessToken: string,
  type: 'past' | 'upcoming',
  dateRange: { from?: string; to?: string },
  pageSize = 100,
  nextPageToken?: string
): Promise<{ webinars: any[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    type: type === 'past' ? 'past' : 'scheduled',
    page_size: pageSize.toString(),
    ...(nextPageToken && { next_page_token: nextPageToken }),
    ...(dateRange.from && { from: dateRange.from }),
    ...(dateRange.to && { to: dateRange.to })
  });

  const response = await fetch(`https://api.zoom.us/v2/users/me/webinars?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch webinar list: ${error}`);
  }

  const data = await response.json();
  return {
    webinars: data.webinars || [],
    nextPageToken: data.next_page_token
  };
}

// Fetch complete webinar details
async function fetchWebinarDetails(
  accessToken: string,
  webinarId: string,
  type: 'past' | 'upcoming'
): Promise<any> {
  const endpoint = type === 'past' 
    ? `https://api.zoom.us/v2/past_webinars/${webinarId}`
    : `https://api.zoom.us/v2/webinars/${webinarId}`;

  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch webinar details: ${error}`);
  }

  return response.json();
}

// Fetch additional webinar data
async function fetchAdditionalWebinarData(
  accessToken: string,
  webinarId: string,
  type: 'past' | 'upcoming',
  rateLimiter: RateLimitManager
): Promise<any> {
  const additionalData: any = {};

  // Fetch tracking sources (only for upcoming webinars)
  if (type === 'upcoming') {
    try {
      additionalData.trackingSources = await rateLimiter.executeWithRateLimit(async () => {
        const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/tracking_sources`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.tracking_sources || [];
        }
        return [];
      });
    } catch (error) {
      console.error(`Failed to fetch tracking sources for ${webinarId}:`, error);
    }
  }

  // Fetch polls, Q&A, absentees for past webinars
  if (type === 'past') {
    try {
      additionalData.polls = await rateLimiter.executeWithRateLimit(async () => {
        const response = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/polls`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.questions || [];
        }
        return [];
      });
    } catch (error) {
      console.error(`Failed to fetch polls for ${webinarId}:`, error);
    }

    try {
      additionalData.qa = await rateLimiter.executeWithRateLimit(async () => {
        const response = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/qa`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.questions || [];
        }
        return [];
      });
    } catch (error) {
      console.error(`Failed to fetch Q&A for ${webinarId}:`, error);
    }
  }

  return additionalData;
}

// Process a single webinar
async function processWebinar(
  supabase: any,
  accessToken: string,
  queueItem: any,
  rateLimiter: RateLimitManager,
  syncId: string
): Promise<void> {
  try {
    // Mark as processing
    await supabase
      .from('webinar_sync_queue')
      .update({ 
        processing_status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', queueItem.id);

    // Fetch complete webinar details
    const webinarDetails = await rateLimiter.executeWithRateLimit(() => 
      fetchWebinarDetails(accessToken, queueItem.webinar_id, queueItem.webinar_type)
    );

    // Fetch additional data
    const additionalData = await fetchAdditionalWebinarData(
      accessToken,
      queueItem.webinar_id,
      queueItem.webinar_type,
      rateLimiter
    );

    // Prepare data for upsert
    const webinarData = {
      webinar_id: webinarDetails.id || webinarDetails.uuid,
      topic: webinarDetails.topic,
      type: webinarDetails.type,
      start_time: webinarDetails.start_time,
      duration: webinarDetails.duration,
      timezone: webinarDetails.timezone,
      created_at: webinarDetails.created_at,
      start_url: webinarDetails.start_url,
      join_url: webinarDetails.join_url,
      status: webinarDetails.status,
      
      // Host information
      host_id: webinarDetails.host_id,
      host_email: webinarDetails.host_email,
      
      // Registration settings
      registration_url: webinarDetails.registration_url,
      approval_type: webinarDetails.settings?.approval_type,
      registration_type: webinarDetails.settings?.registration_type,
      
      // Meeting settings
      audio: webinarDetails.settings?.audio,
      auto_recording: webinarDetails.settings?.auto_recording,
      enforce_login: webinarDetails.settings?.enforce_login,
      hd_video: webinarDetails.settings?.hd_video,
      hd_video_for_attendees: webinarDetails.settings?.hd_video_for_attendees,
      send_1080p_video_to_attendees: webinarDetails.settings?.send_1080p_video_to_attendees,
      host_video: webinarDetails.settings?.host_video,
      on_demand: webinarDetails.settings?.on_demand,
      panelists_video: webinarDetails.settings?.panelists_video,
      practice_session: webinarDetails.settings?.practice_session,
      question_answer: webinarDetails.settings?.question_answer,
      registrants_confirmation_email: webinarDetails.settings?.registrants_confirmation_email,
      registrants_email_notification: webinarDetails.settings?.registrants_email_notification,
      registrants_restrict_number: webinarDetails.settings?.registrants_restrict_number,
      notify_registrants: webinarDetails.settings?.notify_registrants,
      post_webinar_survey: webinarDetails.settings?.post_webinar_survey,
      survey_url: webinarDetails.settings?.survey_url,
      
      // Authentication
      authentication_option: webinarDetails.settings?.authentication_option,
      authentication_domains: webinarDetails.settings?.authentication_domains,
      authentication_name: webinarDetails.settings?.authentication_name,
      
      // Email settings
      email_language: webinarDetails.settings?.email_language,
      panelists_invitation_email_notification: webinarDetails.settings?.panelists_invitation_email_notification,
      
      // Contact information
      contact_name: webinarDetails.settings?.contact_name,
      contact_email: webinarDetails.settings?.contact_email,
      
      // Q&A settings
      attendees_and_panelists_reminder_email_notification: webinarDetails.settings?.attendees_and_panelists_reminder_email_notification,
      follow_up_attendees_email_notification: webinarDetails.settings?.follow_up_attendees_email_notification,
      follow_up_absentees_email_notification: webinarDetails.settings?.follow_up_absentees_email_notification,
      
      // Password settings
      password: webinarDetails.password,
      h323_password: webinarDetails.h323_password,
      pstn_password: webinarDetails.pstn_password,
      encrypted_password: webinarDetails.encrypted_password,
      
      // Agenda
      agenda: webinarDetails.agenda,
      
      // Tracking fields
      tracking_fields: webinarDetails.tracking_fields,
      
      // Recurrence
      recurrence: webinarDetails.recurrence,
      
      // Additional data
      additional_data: {
        ...additionalData,
        settings: webinarDetails.settings,
        occurrences: webinarDetails.occurrences || []
      },
      
      // Sync metadata
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced'
    };

    // Upsert webinar data
    const { error: upsertError } = await supabase
      .from('zoom_webinars')
      .upsert(webinarData, {
        onConflict: 'webinar_id'
      });

    if (upsertError) {
      throw upsertError;
    }

    // Mark as completed
    await supabase
      .from('webinar_sync_queue')
      .update({ 
        processing_status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', queueItem.id);

    // Broadcast progress
    await broadcastProgress(
      supabase,
      syncId,
      'webinar',
      `Processed webinar: ${webinarDetails.topic}`,
      { webinar_id: queueItem.webinar_id }
    );

  } catch (error: any) {
    console.error(`Failed to process webinar ${queueItem.webinar_id}:`, error);
    
    // Update queue item with error
    await supabase
      .from('webinar_sync_queue')
      .update({ 
        processing_status: 'failed',
        error_message: error.message,
        retry_count: queueItem.retry_count + 1
      })
      .eq('id', queueItem.id);

    // Broadcast error
    await broadcastProgress(
      supabase,
      syncId,
      'error',
      `Failed to process webinar ${queueItem.webinar_id}: ${error.message}`,
      { webinar_id: queueItem.webinar_id, error: error.message }
    );

    // Re-throw for higher level handling
    throw error;
  }
}

// Main sync handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { connectionId, syncMode = 'full', dateRange = { pastDays: 90, futureDays: 180 }, resumeSyncId } = await req.json() as SyncRequest;

    // Validate connection
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }

    // Initialize or resume sync
    let syncId = resumeSyncId;
    let syncState: any = null;

    if (resumeSyncId) {
      // Resume existing sync
      const { data: existingState } = await supabase
        .from('sync_state')
        .select('*')
        .eq('sync_id', resumeSyncId)
        .single();
      
      if (existingState) {
        syncState = existingState;
        await broadcastProgress(supabase, syncId!, 'status', 'Resuming sync...', { resumed: true });
      }
    }

    if (!syncId) {
      // Create new sync log
      const { data: newSync, error: syncError } = await supabase
        .from('zoom_sync_logs')
        .insert({
          connection_id: connectionId,
          status: 'running',
          started_at: new Date().toISOString(),
          sync_type: syncMode,
          metadata: { dateRange }
        })
        .select()
        .single();

      if (syncError || !newSync) {
        throw new Error('Failed to create sync log');
      }

      syncId = newSync.id;
      await broadcastProgress(supabase, syncId, 'status', 'Starting new sync...', { syncMode, dateRange });
    }

    // Get access token
    const accessToken = await getZoomAccessToken(supabase, connectionId);
    
    // Initialize rate limiter
    const rateLimiter = new RateLimitManager();

    // Calculate date ranges
    const now = new Date();
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - (dateRange.pastDays || 90));
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + (dateRange.futureDays || 180));

    // Phase 1: Fetch webinar lists
    await broadcastProgress(supabase, syncId, 'status', 'Fetching webinar lists...', {}, 0);

    const allWebinars: WebinarQueueItem[] = [];
    
    // Fetch past webinars
    let nextPageToken: string | undefined;
    let pageCount = 0;
    
    do {
      const { webinars, nextPageToken: token } = await rateLimiter.executeWithRateLimit(() =>
        fetchWebinarList(
          accessToken,
          'past',
          { from: pastDate.toISOString().split('T')[0] },
          100,
          nextPageToken
        )
      );
      
      allWebinars.push(...webinars.map(w => ({
        webinar_id: w.id || w.uuid,
        webinar_type: 'past' as const
      })));
      
      nextPageToken = token;
      pageCount++;
      
      await broadcastProgress(
        supabase,
        syncId,
        'progress',
        `Fetching past webinars... (Page ${pageCount})`,
        { pageCount, webinarCount: allWebinars.length },
        5
      );
    } while (nextPageToken);

    // Fetch upcoming webinars
    nextPageToken = undefined;
    pageCount = 0;
    const upcomingStart = allWebinars.length;
    
    do {
      const { webinars, nextPageToken: token } = await rateLimiter.executeWithRateLimit(() =>
        fetchWebinarList(
          accessToken,
          'upcoming',
          { to: futureDate.toISOString().split('T')[0] },
          100,
          nextPageToken
        )
      );
      
      allWebinars.push(...webinars.map(w => ({
        webinar_id: w.id || w.uuid,
        webinar_type: 'upcoming' as const
      })));
      
      nextPageToken = token;
      pageCount++;
      
      await broadcastProgress(
        supabase,
        syncId,
        'progress',
        `Fetching upcoming webinars... (Page ${pageCount})`,
        { pageCount, webinarCount: allWebinars.length - upcomingStart },
        10
      );
    } while (nextPageToken);

    // Phase 2: Queue webinars for processing
    await broadcastProgress(
      supabase,
      syncId,
      'status',
      `Queuing ${allWebinars.length} webinars for processing...`,
      { totalWebinars: allWebinars.length },
      15
    );

    // Insert webinars into queue
    if (allWebinars.length > 0) {
      const queueItems = allWebinars.map((w, index) => ({
        sync_id: syncId,
        webinar_id: w.webinar_id,
        webinar_type: w.webinar_type,
        priority: 5,
        scheduled_at: new Date().toISOString()
      }));

      const { error: queueError } = await supabase
        .from('webinar_sync_queue')
        .insert(queueItems);

      if (queueError) {
        throw new Error(`Failed to queue webinars: ${queueError.message}`);
      }
    }

    // Save sync state
    await supabase
      .from('sync_state')
      .upsert({
        sync_id: syncId,
        connection_id: connectionId,
        state_type: 'webinar_details',
        state_data: { totalWebinars: allWebinars.length },
        total_items: allWebinars.length,
        processed_items: 0
      });

    // Phase 3: Process webinars
    const { data: queuedItems } = await supabase
      .from('webinar_sync_queue')
      .select('*')
      .eq('sync_id', syncId)
      .eq('processing_status', 'pending')
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true });

    if (queuedItems && queuedItems.length > 0) {
      let processedCount = 0;
      
      for (const item of queuedItems) {
        try {
          await processWebinar(supabase, accessToken, item, rateLimiter, syncId);
          processedCount++;
          
          // Update progress
          const percentage = 15 + (processedCount / queuedItems.length) * 80; // 15-95%
          await broadcastProgress(
            supabase,
            syncId,
            'progress',
            `Processing webinars... (${processedCount}/${queuedItems.length})`,
            { processedCount, totalCount: queuedItems.length },
            percentage
          );
          
          // Update sync state
          await supabase
            .from('sync_state')
            .update({
              processed_items: processedCount,
              last_processed_item: item.webinar_id,
              updated_at: new Date().toISOString()
            })
            .eq('sync_id', syncId)
            .eq('state_type', 'webinar_details');
            
        } catch (error) {
          console.error(`Failed to process webinar ${item.webinar_id}:`, error);
          // Continue with next webinar
        }
      }
    }

    // Phase 4: Complete sync
    await supabase
      .from('zoom_sync_logs')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        webinars_synced: allWebinars.length,
        metadata: {
          dateRange,
          syncMode,
          totalWebinars: allWebinars.length
        }
      })
      .eq('id', syncId);

    await broadcastProgress(
      supabase,
      syncId,
      'status',
      `Sync completed successfully! Processed ${allWebinars.length} webinars.`,
      { totalWebinars: allWebinars.length },
      100
    );

    return new Response(
      JSON.stringify({
        success: true,
        syncId,
        webinarsSynced: allWebinars.length,
        message: 'Sync completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Sync error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred during sync'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
