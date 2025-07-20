import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "./cors.ts";
import { SimpleTokenEncryption } from "./encryption.ts";

// Types
interface SyncRequest {
  connectionId: string;
  syncLogId?: string; // Sync log ID passed from backend
  syncMode?: 'full' | 'delta' | 'smart';
  dateRange?: {
    pastDays?: number;
    futureDays?: number;
  };
  resumeSyncId?: string;
  syncType?: string;
  requestId?: string;
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
    // Update sync log with progress
    await supabase.from('zoom_sync_logs').update({
      current_operation: message,
      sync_progress: percentage || 0,
      updated_at: new Date().toISOString()
    }).eq('id', syncId);
  } catch (error) {
    console.error('Failed to broadcast progress:', error);
  }
}

// Get Zoom access token
async function getZoomAccessToken(supabase: any, connectionId: string): Promise<string> {
  const { data: connection, error } = await supabase
    .from('zoom_connections')
    .select('access_token, refresh_token, token_expires_at, zoom_email')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    throw new Error('Connection not found');
  }

  // Decrypt the current access token
  let decryptedToken: string;
  try {
    decryptedToken = await SimpleTokenEncryption.decryptToken(
      connection.access_token,
      connection.zoom_email
    );
  } catch (error) {
    console.error('Failed to decrypt access token:', error);
    throw new Error('Failed to decrypt access token');
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
    
    // Encrypt the new access token
    const encryptedAccessToken = await SimpleTokenEncryption.encryptToken(
      tokens.access_token,
      connection.zoom_email
    );
    
    // Update tokens in database
    await supabase
      .from('zoom_connections')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      })
      .eq('id', connectionId);

    return tokens.access_token;
  }

  return decryptedToken;
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

  console.log(`[SYNC] Fetching ${type} webinars with params:`, params.toString());

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
  console.log(`[SYNC] Fetched ${data.webinars?.length || 0} ${type} webinars from page`);
  
  return {
    webinars: data.webinars || [],
    nextPageToken: data.next_page_token
  };
}

// Determine webinar status based on type and time
function determineWebinarStatus(webinarDetails: any, webinarType: 'past' | 'upcoming'): string {
  console.log(`[SYNC] Determining status for webinar ${webinarDetails.id}, type: ${webinarType}, API status: ${webinarDetails.status}`);
  
  // If it's a past webinar, it should always be 'ended'
  if (webinarType === 'past') {
    console.log(`[SYNC] Setting status to 'ended' because webinar type is 'past'`);
    return 'ended';
  }
  
  // Check if start_time is in the past
  if (webinarDetails.start_time) {
    const startTime = new Date(webinarDetails.start_time);
    const now = new Date();
    
    if (startTime < now) {
      console.log(`[SYNC] Setting status to 'ended' because start_time (${startTime}) is in the past`);
      return 'ended';
    }
  }
  
  // Use API status if provided and valid, but map 'finished' to 'ended'
  if (webinarDetails.status) {
    if (webinarDetails.status === 'finished') {
      console.log(`[SYNC] Mapping API status 'finished' to 'ended'`);
      return 'ended';
    }
    const validStatuses = ['waiting', 'started', 'scheduled', 'upcoming'];
    if (validStatuses.includes(webinarDetails.status)) {
      console.log(`[SYNC] Using API status: ${webinarDetails.status}`);
      return webinarDetails.status;
    }
  }
  
  // Default to 'upcoming' for upcoming webinars
  console.log(`[SYNC] Defaulting to 'upcoming' status`);
  return 'upcoming';
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

  console.log(`[SYNC] Fetching details for ${type} webinar ${webinarId}`);

  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[SYNC] Failed to fetch webinar details for ${webinarId}: ${error}`);
    throw new Error(`Failed to fetch webinar details: ${error}`);
  }

  const data = await response.json();
  console.log(`[SYNC] Successfully fetched details for webinar ${webinarId}: ${data.topic}`);
  
  return data;
}

// Process a single webinar (simplified version)
async function processWebinar(
  supabase: any,
  accessToken: string,
  webinarId: string,
  webinarType: 'past' | 'upcoming',
  rateLimiter: RateLimitManager,
  syncId: string,
  connectionId: string
): Promise<void> {
  try {
    console.log(`[SYNC] Processing webinar ${webinarId} (${webinarType})`);
    
    // Fetch complete webinar details
    const webinarDetails = await rateLimiter.executeWithRateLimit(() => 
      fetchWebinarDetails(accessToken, webinarId, webinarType)
    );

    console.log(`[SYNC] Processing webinar ${webinarDetails.id}: ${webinarDetails.topic}`);

    // Determine the correct status
    const status = determineWebinarStatus(webinarDetails, webinarType);

    // Prepare data for upsert
    const webinarData = {
      zoom_webinar_id: webinarDetails.id || webinarDetails.uuid,
      webinar_id: webinarDetails.id || webinarDetails.uuid,
      webinar_uuid: webinarDetails.uuid || webinarDetails.id || `webinar-${webinarDetails.id}`,
      connection_id: connectionId,
      topic: webinarDetails.topic,
      type: webinarDetails.type || 5,
      start_time: webinarDetails.start_time,
      duration: webinarDetails.duration || 0,
      timezone: webinarDetails.timezone,
      webinar_created_at: webinarDetails.created_at ? new Date(webinarDetails.created_at).toISOString() : null,
      start_url: webinarDetails.start_url,
      join_url: webinarDetails.join_url,
      status: status,
      
      // Host information
      host_id: webinarDetails.host_id || 'unknown',
      host_email: webinarDetails.host_email || webinarDetails.host?.email || null,
      
      // Registration settings
      registration_url: webinarDetails.registration_url,
      registration_required: webinarDetails.settings?.registrants_require_approval !== undefined || webinarDetails.registration_required || false,
      
      // Use provided counts or default to 0
      total_registrants: webinarDetails.registrants_count || 0,
      total_attendees: webinarDetails.participants_count || 0,
      total_absentees: 0, // Will be calculated below
      
      // Settings
      settings: webinarDetails.settings || {},
      
      // Sync metadata
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced'
    };

    // Calculate absentees
    webinarData.total_absentees = Math.max(0, webinarData.total_registrants - webinarData.total_attendees);

    // Upsert webinar data
    const { error: upsertError } = await supabase
      .from('zoom_webinars')
      .upsert(webinarData, {
        onConflict: 'connection_id,zoom_webinar_id'
      });

    if (upsertError) {
      console.error(`[SYNC] Failed to sync webinar ${webinarId}: ${upsertError.message}`);
      throw upsertError;
    }

    console.log(`[SYNC] Successfully synced webinar ${webinarId}`);

  } catch (error: any) {
    console.error(`[SYNC] Failed to process webinar ${webinarId}:`, error);
    throw error;
  }
}

// Main sync handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SYNC] ====== Starting Zoom Webinar Sync ======');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { connectionId, syncLogId, syncMode = 'full', dateRange = { pastDays: 90, futureDays: 180 }, resumeSyncId, requestId } = await req.json() as SyncRequest;

    // Validate connection
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }

    console.log(`[SYNC] Sync request received - Connection: ${connectionId}, Mode: ${syncMode}`);
    console.log(`[SYNC] Date range: ${dateRange.pastDays} days past, ${dateRange.futureDays} days future`);

    // Initialize sync
    let syncId = syncLogId || resumeSyncId;

    // Use syncLogId if provided from backend
    if (syncLogId) {
      syncId = syncLogId;
      console.log(`[SYNC] Using provided sync log ID: ${syncId}`);
      
      // Update sync log status to running if needed
      await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'running',
          started_at: new Date().toISOString(),
          metadata: { dateRange, requestId }
        })
        .eq('id', syncId);
        
      await broadcastProgress(supabase, syncId, 'status', 'Sync process started...', { syncMode, dateRange });
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

    console.log(`[SYNC] Date range: ${pastDate.toISOString()} to ${futureDate.toISOString()}`);

    // Phase 1: Fetch webinar lists
    await broadcastProgress(supabase, syncId, 'status', 'Fetching webinar lists...', {}, 0);

    const allWebinars: { id: string; type: 'past' | 'upcoming' }[] = [];
    let processedCount = 0;
    
    // Fetch past webinars
    console.log('[SYNC] Fetching past webinars...');
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
        id: w.id || w.uuid,
        type: 'past' as const
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

    console.log(`[SYNC] Found ${allWebinars.length} past webinars`);

    // Fetch upcoming webinars
    console.log('[SYNC] Fetching upcoming webinars...');
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
        id: w.id || w.uuid,
        type: 'upcoming' as const
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

    console.log(`[SYNC] Found ${allWebinars.length - upcomingStart} upcoming webinars`);
    console.log(`[SYNC] Total webinars to process: ${allWebinars.length}`);

    // Update sync log with total items
    await supabase
      .from('zoom_sync_logs')
      .update({
        total_items: allWebinars.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncId);

    // Phase 2: Process webinars
    console.log('[SYNC] Starting to process webinars...');
    
    for (const webinar of allWebinars) {
      try {
        await processWebinar(supabase, accessToken, webinar.id, webinar.type, rateLimiter, syncId, connectionId);
        processedCount++;
        
        // Update progress
        const percentage = 15 + (processedCount / allWebinars.length) * 80; // 15-95%
        await broadcastProgress(
          supabase,
          syncId,
          'progress',
          `Processing webinars... (${processedCount}/${allWebinars.length})`,
          { processedCount, totalCount: allWebinars.length },
          percentage
        );
        
        // Update sync log
        await supabase
          .from('zoom_sync_logs')
          .update({
            processed_items: processedCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', syncId);
          
      } catch (error) {
        console.error(`[SYNC] Failed to process webinar ${webinar.id}:`, error);
        // Continue with next webinar
      }
    }

    // Phase 3: Complete sync
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        completed_at: new Date().toISOString(),
        total_items: allWebinars.length,
        processed_items: processedCount,
        metadata: {
          dateRange,
          syncMode,
          totalWebinars: allWebinars.length,
          requestId
        }
      })
      .eq('id', syncId);

    await broadcastProgress(
      supabase,
      syncId,
      'status',
      `Sync completed successfully! Processed ${processedCount} webinars.`,
      { totalWebinars: allWebinars.length },
      100
    );

    console.log('[SYNC] ====== Sync Completed Successfully ======');

    return new Response(
      JSON.stringify({
        success: true,
        syncId,
        webinarsSynced: processedCount,
        message: 'Sync completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[SYNC] ====== Sync Failed ======');
    console.error('[SYNC] Error:', error);
    
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
