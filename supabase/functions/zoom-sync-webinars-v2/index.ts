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
  webinar_uuid?: string;
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
        'Authorization': `Basic ${btoa(`${Deno.env.get('ZOOM_OAUTH_CLIENT_ID')}:${Deno.env.get('ZOOM_OAUTH_CLIENT_SECRET')}`)}`
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
  webinarUuid: string | undefined,
  type: 'past' | 'upcoming'
): Promise<any> {
  let endpoint: string;
  
  // For past webinars, we need to use the UUID if available, otherwise fall back to regular endpoint
  if (type === 'past' && webinarUuid) {
    // URL encode the UUID to handle special characters like = and /
    const encodedUuid = encodeURIComponent(webinarUuid);
    endpoint = `https://api.zoom.us/v2/past_webinars/${encodedUuid}`;
    console.log(`[SYNC] Fetching past webinar details using UUID: ${webinarUuid} (encoded: ${encodedUuid})`);
  } else {
    // For upcoming webinars or if UUID is not available, use the regular endpoint
    endpoint = `https://api.zoom.us/v2/webinars/${webinarId}`;
    console.log(`[SYNC] Fetching ${type} webinar details using ID: ${webinarId}`);
  }

  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[SYNC] Failed to fetch webinar details for ${webinarId}: ${error}`);
    
    // If past webinar endpoint fails with UUID, try with ID
    if (type === 'past' && webinarUuid && response.status === 404) {
      console.log(`[SYNC] Past webinar not found with UUID, trying with ID...`);
      const idEndpoint = `https://api.zoom.us/v2/webinars/${webinarId}`;
      const idResponse = await fetch(idEndpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (idResponse.ok) {
        const data = await idResponse.json();
        console.log(`[SYNC] Successfully fetched webinar details using ID fallback`);
        return data;
      }
    }
    
    throw new Error(`Failed to fetch webinar details: ${error}`);
  }

  const data = await response.json();
  console.log(`[SYNC] Successfully fetched details for webinar ${webinarId}: ${data.topic}`);
  
  // Log which fields are missing
  const missingFields = [];
  if (!data.host_email) missingFields.push('host_email');
  if (!data.registrants_count && data.registrants_count !== 0) missingFields.push('registrants_count');
  if (!data.participants_count && data.participants_count !== 0) missingFields.push('participants_count');
  if (!data.settings) missingFields.push('settings');
  
  if (missingFields.length > 0) {
    console.log(`[SYNC] Missing data fields for webinar ${webinarId}: ${missingFields.join(', ')}`);
  }
  
  return data;
}

// Fetch registrant count for a webinar
async function fetchRegistrantCount(
  accessToken: string,
  webinarId: string,
  rateLimiter: RateLimitManager
): Promise<number> {
  try {
    console.log(`[SYNC] Fetching registrant count for webinar ${webinarId}`);
    
    const response = await rateLimiter.executeWithRateLimit(async () => {
      return await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?page_size=1`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    });

    if (response.ok) {
      const data = await response.json();
      const count = data.total_records || 0;
      console.log(`[SYNC] Found ${count} registrants for webinar ${webinarId}`);
      return count;
    }
    
    console.log(`[SYNC] Could not fetch registrant count for webinar ${webinarId}`);
    return 0;
  } catch (error) {
    console.error(`[SYNC] Error fetching registrant count for ${webinarId}:`, error);
    return 0;
  }
}

// Fetch participant/attendee data for past webinars
async function fetchParticipantData(
  accessToken: string,
  webinarId: string,
  webinarUuid: string | undefined,
  rateLimiter: RateLimitManager
): Promise<{ count: number; uniqueCount: number; avgDuration: number; allParticipants: any[] }> {
  try {
    console.log(`[SYNC] Fetching participant data for webinar ${webinarId}`);
    
    // For webinars, we need to use the report API to get ALL participants (not just panelists)
    // The regular participants endpoint only returns panelists for webinars
    let endpoint: string;
    // Try report endpoint first (includes all attendees)
    endpoint = `https://api.zoom.us/v2/report/webinars/${webinarId}/participants`;
    console.log(`[SYNC] Using report API for webinar participants: ${webinarId}`);
    
    // Note: If report endpoint fails, we'll try the past_webinars endpoint as fallback
    
    // Fetch all participants with pagination
    let allParticipants: any[] = [];
    let nextPageToken: string | undefined;
    let pageCount = 0;
    
    do {
      const url = endpoint + `?page_size=300${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
      
      const response = await rateLimiter.executeWithRateLimit(async () => {
        return await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      });

      if (!response.ok) {
        console.log(`[SYNC] Could not fetch participant data for webinar ${webinarId} (status: ${response.status})`);
        
        // If report endpoint fails and this is the first attempt, try fallback endpoints
        if (pageCount === 0 && endpoint.includes('/report/')) {
          console.log(`[SYNC] Report API failed, trying fallback endpoints...`);
          
          // Try with UUID if available
          if (webinarUuid) {
            const encodedUuid = encodeURIComponent(webinarUuid);
            endpoint = `https://api.zoom.us/v2/past_webinars/${encodedUuid}/participants`;
            console.log(`[SYNC] Trying past_webinars with UUID: ${webinarUuid}`);
            continue;
          } else {
            // Fallback to ID
            endpoint = `https://api.zoom.us/v2/past_webinars/${webinarId}/participants`;
            console.log(`[SYNC] Trying past_webinars with ID: ${webinarId}`);
            continue;
          }
        }
        
        break;
      }
      
      const data = await response.json();
      const participants = data.participants || [];
      allParticipants.push(...participants);
      
      nextPageToken = data.next_page_token;
      pageCount++;
      
      console.log(`[SYNC] Fetched page ${pageCount} with ${participants.length} participants`);
    } while (nextPageToken && pageCount < 10); // Safety limit of 10 pages
    
    // Calculate unique participants
    const uniqueParticipants = new Map();
    let totalDuration = 0;
    let validParticipants = 0;
    
    allParticipants.forEach((p: any) => {
      // Use email as primary identifier, fall back to user_id or id
      const identifier = p.email || p.user_id || p.id || `participant_${validParticipants}`;
      
      if (!uniqueParticipants.has(identifier)) {
        uniqueParticipants.set(identifier, {
          ...p,
          totalDuration: p.duration || 0,
          sessionCount: 1
        });
      } else {
        // Update existing participant with cumulative duration
        const existing = uniqueParticipants.get(identifier);
        existing.totalDuration += (p.duration || 0);
        existing.sessionCount++;
      }
      
      if (p.duration && p.duration > 0) {
        totalDuration += p.duration;
        validParticipants++;
      }
    });
    
    const uniqueCount = uniqueParticipants.size;
    const avgDuration = validParticipants > 0 ? Math.round(totalDuration / validParticipants) : 0;
    
    console.log(`[SYNC] Total participant sessions: ${allParticipants.length}`);
    console.log(`[SYNC] Unique attendees: ${uniqueCount}`);
    console.log(`[SYNC] Average duration: ${avgDuration} seconds`);
    
    return { 
      count: allParticipants.length, // Total sessions
      uniqueCount: uniqueCount, // Unique attendees
      avgDuration,
      allParticipants: Array.from(uniqueParticipants.values())
    };
  } catch (error) {
    console.error(`[SYNC] Error fetching participant data for ${webinarId}:`, error);
    return { count: 0, uniqueCount: 0, avgDuration: 0, allParticipants: [] };
  }
}

// Fetch additional webinar data
async function fetchAdditionalWebinarData(
  accessToken: string,
  webinarId: string,
  webinarUuid: string | undefined,
  type: 'past' | 'upcoming',
  rateLimiter: RateLimitManager
): Promise<any> {
  const additionalData: any = {};

  console.log(`[SYNC] Fetching additional data for ${type} webinar ${webinarId}`);

  // Fetch registrant count for all webinars
  additionalData.registrantCount = await fetchRegistrantCount(accessToken, webinarId, rateLimiter);

  // Fetch participant data for past webinars
  if (type === 'past') {
    const participantData = await fetchParticipantData(accessToken, webinarId, webinarUuid, rateLimiter);
    additionalData.participantCount = participantData.uniqueCount; // Use unique count for attendees
    additionalData.totalParticipantSessions = participantData.count; // Total sessions (including rejoins)
    additionalData.avgAttendanceDuration = participantData.avgDuration;
    additionalData.uniqueParticipants = participantData.allParticipants; // Store for later participant sync
  }

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
      console.error(`[SYNC] Failed to fetch tracking sources for ${webinarId}:`, error);
    }
  }

  // Fetch polls, Q&A for past webinars
  if (type === 'past' && webinarUuid) {
    try {
      additionalData.polls = await rateLimiter.executeWithRateLimit(async () => {
        const encodedUuid = encodeURIComponent(webinarUuid);
        const response = await fetch(`https://api.zoom.us/v2/past_webinars/${encodedUuid}/polls`, {
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
      console.error(`[SYNC] Failed to fetch polls for ${webinarId}:`, error);
    }

    try {
      additionalData.qa = await rateLimiter.executeWithRateLimit(async () => {
        const encodedUuid = encodeURIComponent(webinarUuid);
        const response = await fetch(`https://api.zoom.us/v2/past_webinars/${encodedUuid}/qa`, {
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
      console.error(`[SYNC] Failed to fetch Q&A for ${webinarId}:`, error);
    }
  }

  console.log(`[SYNC] Completed fetching additional data for webinar ${webinarId}`);
  return additionalData;
}

// Process a single webinar
async function processWebinar(
  supabase: any,
  accessToken: string,
  queueItem: any,
  rateLimiter: RateLimitManager,
  syncId: string,
  connectionId: string
): Promise<void> {
  try {
    console.log(`[SYNC] Starting to process webinar ${queueItem.webinar_id} (${queueItem.webinar_type})`);
    
    // Mark as processing
    await supabase
      .from('webinar_sync_queue')
      .update({ 
        processing_status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', queueItem.id);

    // First, check if we already have this webinar with a UUID
    let webinarUuid = queueItem.webinar_uuid;
    if (!webinarUuid && queueItem.webinar_type === 'past') {
      // Try to get UUID from existing webinar record
      const { data: existingWebinar } = await supabase
        .from('zoom_webinars')
        .select('uuid')
        .eq('zoom_webinar_id', queueItem.webinar_id)
        .eq('connection_id', connectionId)
        .single();
      
      if (existingWebinar) {
        webinarUuid = existingWebinar.uuid;
        console.log(`[SYNC] Found existing UUID for webinar ${queueItem.webinar_id}: ${webinarUuid}`);
      }
    }

    // Fetch complete webinar details
    const webinarDetails = await rateLimiter.executeWithRateLimit(() => 
      fetchWebinarDetails(accessToken, queueItem.webinar_id, webinarUuid, queueItem.webinar_type)
    );

    // Update webinarUuid if we got it from the details
    if (!webinarUuid && webinarDetails.uuid) {
      webinarUuid = webinarDetails.uuid;
      console.log(`[SYNC] Got UUID from webinar details: ${webinarUuid}`);
    }

    console.log(`[SYNC] Processing webinar ${webinarDetails.id}: ${webinarDetails.topic}`);
    console.log(`[SYNC] Webinar type: ${queueItem.webinar_type}, Status from API: ${webinarDetails.status}`);

    // Fetch additional data
    const additionalData = await fetchAdditionalWebinarData(
      accessToken,
      queueItem.webinar_id,
      webinarUuid,
      queueItem.webinar_type,
      rateLimiter
    );

    // Determine the correct status
    const status = determineWebinarStatus(webinarDetails, queueItem.webinar_type);

    // Calculate counts first to ensure proper absentee calculation
    const registrantCount = additionalData.registrantCount || webinarDetails.registrants_count || 0;
    const attendeeCount = additionalData.participantCount || webinarDetails.participants_count || 0;
    const absenteeCount = Math.max(0, registrantCount - attendeeCount);
    
    console.log(`[SYNC] Webinar ${webinarDetails.id} counts - Registrants: ${registrantCount}, Attendees: ${attendeeCount}, Absentees: ${absenteeCount}`);

    // Prepare data for upsert - Using correct column names after migration
    const webinarData = {
      // Primary identifiers
      zoom_webinar_id: webinarDetails.id || webinarDetails.uuid,
      uuid: webinarUuid || webinarDetails.uuid || `webinar-${webinarDetails.id}`,
      connection_id: connectionId,
      
      // Basic information
      topic: webinarDetails.topic,
      type: webinarDetails.type || 5,
      start_time: webinarDetails.start_time,
      duration: webinarDetails.duration || 0,
      timezone: webinarDetails.timezone,
      webinar_created_at: webinarDetails.created_at ? new Date(webinarDetails.created_at).toISOString() : null,
      start_url: webinarDetails.start_url,
      join_url: webinarDetails.join_url,
      status: status, // Use our determined status
      
      // Host information
      host_id: webinarDetails.host_id || 'unknown',
      host_email: webinarDetails.host_email || webinarDetails.host?.email || null,
      alternative_hosts: webinarDetails.alternative_hosts_email ? webinarDetails.alternative_hosts_email.split(',').map((h: string) => h.trim()) : null,
      
      // Registration settings
      registration_url: webinarDetails.registration_url,
      registration_required: webinarDetails.settings?.registrants_require_approval !== undefined || webinarDetails.registration_required || false,
      approval_type: webinarDetails.settings?.approval_type || webinarDetails.approval_type,
      registration_type: webinarDetails.settings?.registration_type || webinarDetails.registration_type,
      max_registrants: webinarDetails.settings?.registrants_restrict_number || webinarDetails.max_registrants || null,
      max_attendees: webinarDetails.settings?.max_attendees || webinarDetails.max_attendees || null,
      
      // Use calculated counts
      total_registrants: registrantCount,
      total_attendees: attendeeCount, // This will now be unique attendees
      total_absentees: absenteeCount,
      total_minutes: webinarDetails.total_minutes || 0,
      avg_attendance_duration: additionalData.avgAttendanceDuration || webinarDetails.avg_attendance_duration || 0,
      actual_participant_count: additionalData.totalParticipantSessions || attendeeCount, // Total sessions
      unique_participant_count: attendeeCount, // Unique attendees
      
      // Meeting settings - with null checks
      audio: webinarDetails.settings?.audio || webinarDetails.audio || 'both',
      auto_recording: webinarDetails.settings?.auto_recording || webinarDetails.auto_recording || 'none',
      enforce_login: webinarDetails.settings?.enforce_login || false,
      hd_video: webinarDetails.settings?.hd_video || false,
      hd_video_for_attendees: webinarDetails.settings?.hd_video_for_attendees || false,
      send_1080p_video_to_attendees: webinarDetails.settings?.send_1080p_video_to_attendees || false,
      host_video: webinarDetails.settings?.host_video || false,
      on_demand: webinarDetails.settings?.on_demand || false,
      panelists_video: webinarDetails.settings?.panelists_video || false,
      practice_session: webinarDetails.settings?.practice_session || false,
      question_answer: webinarDetails.settings?.question_answer || webinarDetails.settings?.q_and_a || false,
      registrants_confirmation_email: webinarDetails.settings?.registrants_confirmation_email || false,
      registrants_email_notification: webinarDetails.settings?.registrants_email_notification || false,
      registrants_restrict_number: webinarDetails.settings?.registrants_restrict_number || 0,
      notify_registrants: webinarDetails.settings?.notify_registrants || false,
      post_webinar_survey: webinarDetails.settings?.post_webinar_survey || false,
      survey_url: webinarDetails.settings?.survey_url || webinarDetails.survey_url || null,
      
      // Authentication
      authentication_option: webinarDetails.settings?.authentication_option || null,
      authentication_domains: webinarDetails.settings?.authentication_domains || null,
      authentication_name: webinarDetails.settings?.authentication_name || null,
      
      // Email settings
      email_language: webinarDetails.settings?.email_language || webinarDetails.settings?.language || 'en-US',
      email_notification: webinarDetails.settings?.email_notification !== false,
      panelists_invitation_email_notification: webinarDetails.settings?.panelists_invitation_email_notification || false,
      alternative_hosts_email_notification: webinarDetails.settings?.alternative_hosts_email_notification || false,
      
      // Contact information
      contact_name: webinarDetails.settings?.contact_name || webinarDetails.contact_name || null,
      contact_email: webinarDetails.settings?.contact_email || webinarDetails.contact_email || null,
      
      // Email notifications
      attendees_and_panelists_reminder_email_notification: webinarDetails.settings?.attendees_and_panelists_reminder_email_notification || null,
      follow_up_attendees_email_notification: webinarDetails.settings?.follow_up_attendees_email_notification || null,
      follow_up_absentees_email_notification: webinarDetails.settings?.follow_up_absentees_email_notification || null,
      
      // Password settings (using consolidated columns)
      password: webinarDetails.password || webinarDetails.passcode || null,
      h323_password: webinarDetails.h323_password || null,
      pstn_password: webinarDetails.pstn_password || null,
      encrypted_password: webinarDetails.encrypted_password || null,
      
      // Agenda
      agenda: webinarDetails.agenda || null,
      
      // Tracking fields
      tracking_fields: webinarDetails.tracking_fields || additionalData.trackingSources || null,
      
      // Recurrence
      recurrence: webinarDetails.recurrence || null,
      occurrences: webinarDetails.occurrences || null,
      occurrence_id: webinarDetails.occurrence_id || null,
      
      // Simulive settings
      is_simulive: webinarDetails.is_simulive || false,
      record_file_id: webinarDetails.record_file_id || null,
      
      // New fields from migration
      allow_multiple_devices: webinarDetails.settings?.allow_multiple_devices || false,
      show_share_button: webinarDetails.settings?.show_share_button || false,
      allow_multiple_view_on_same_device: webinarDetails.settings?.allow_multiple_view_on_same_device || false,
      host_save_video_order: webinarDetails.settings?.host_save_video_order || false,
      enable_dedicated_pin_for_all_panelists: webinarDetails.settings?.enable_dedicated_pin_for_all_panelists || false,
      sign_language_interpretation: webinarDetails.settings?.sign_language_interpretation || null,
      global_dial_in_countries: webinarDetails.settings?.global_dial_in_countries || null,
      global_dial_in_numbers: webinarDetails.settings?.global_dial_in_numbers || null,
      registrants_restrict_by_domain: webinarDetails.settings?.registrants_restrict_by_domain || null,
      meeting_authentication: webinarDetails.settings?.meeting_authentication || false,
      add_watermark: webinarDetails.settings?.add_watermark || false,
      add_audio_watermark: webinarDetails.settings?.add_audio_watermark || false,
      audio_conferencing: webinarDetails.settings?.audio_conferencing || null,
      cloud_recording: webinarDetails.settings?.cloud_recording || null,
      language_interpretation: webinarDetails.settings?.language_interpretation || null,
      
      // Settings object
      settings: webinarDetails.settings || {},
      
      // Additional data
      additional_data: {
        ...additionalData,
        settings: webinarDetails.settings,
        occurrences: webinarDetails.occurrences || [],
        raw_response: webinarDetails
      },
      
      // Sync metadata
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced',
      sync_method: 'edge_function_v2',
      last_successful_sync: new Date().toISOString(),
      
      // Participant sync status
      participant_sync_status: queueItem.webinar_type === 'past' ? 'pending' : 'not_applicable'
    };

    // Absentees already calculated above
    
    // Log populated vs missing fields
    const populatedFields = Object.keys(webinarData).filter(key => webinarData[key] !== null && webinarData[key] !== undefined);
    const nullFields = Object.keys(webinarData).filter(key => webinarData[key] === null || webinarData[key] === undefined);
    
    console.log(`[SYNC] Populated ${populatedFields.length} fields for webinar ${queueItem.webinar_id}`);
    console.log(`[SYNC] Final webinar metrics - Registrants: ${webinarData.total_registrants}, Attendees: ${webinarData.total_attendees}, Absentees: ${webinarData.total_absentees}`);
    if (nullFields.length > 0) {
      console.log(`[SYNC] Fields with null/undefined values: ${nullFields.join(', ')}`);
    }

    // Upsert webinar data
    const { error: upsertError } = await supabase
      .from('zoom_webinars')
      .upsert(webinarData, {
        onConflict: 'connection_id,zoom_webinar_id'
      });

    if (upsertError) {
      console.error(`[SYNC] ✗ Failed to sync webinar ${queueItem.webinar_id}: ${upsertError.message}`);
      throw upsertError;
    }

    console.log(`[SYNC] ✓ Successfully synced webinar ${queueItem.webinar_id}`);

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
      { 
        webinar_id: queueItem.webinar_id,
        status: status,
        registrants: additionalData.registrantCount || 0,
        attendees: additionalData.participantCount || 0
      }
    );

  } catch (error: any) {
    console.error(`[SYNC] ✗ Failed to process webinar ${queueItem.webinar_id}:`, error);
    
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

  let syncId: string | undefined;
  let supabase: any;

  try {
    console.log('[SYNC] ====== Starting Zoom Webinar Sync ======');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }
    
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { connectionId, syncLogId, syncMode = 'full', dateRange = { pastDays: 90, futureDays: 180 }, resumeSyncId, requestId } = await req.json() as SyncRequest;

    // Validate connection
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }

    console.log(`[SYNC] Sync request received - Connection: ${connectionId}, Mode: ${syncMode}`);
    console.log(`[SYNC] Date range: ${dateRange.pastDays} days past, ${dateRange.futureDays} days future`);

    // Initialize or resume sync
    syncId = resumeSyncId;
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

    // Use syncLogId if provided from backend, otherwise check for resumeSyncId or create new
    if (syncLogId) {
      syncId = syncLogId;
      console.log(`[SYNC] Using provided sync log ID: ${syncId}`);
      
      // Update sync log status to running with initial progress
      await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'running',
          started_at: new Date().toISOString(),
          current_operation: 'Initializing sync...',
          sync_progress: 0,
          metadata: { dateRange, requestId }
        })
        .eq('id', syncId);
        
      await broadcastProgress(supabase, syncId, 'status', 'Sync process started...', { syncMode, dateRange });
    } else if (!syncId) {
      // Create new sync log
      const { data: newSync, error: syncError } = await supabase
        .from('zoom_sync_logs')
        .insert({
          connection_id: connectionId,
          sync_status: 'running',
          started_at: new Date().toISOString(),
          sync_type: syncMode,
          current_operation: 'Initializing sync...',
          sync_progress: 0,
          metadata: { dateRange, requestId }
        })
        .select()
        .single();

      if (syncError || !newSync) {
        throw new Error('Failed to create sync log');
      }

      syncId = newSync.id;
      console.log(`[SYNC] Created new sync with ID: ${syncId}`);
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

    console.log(`[SYNC] Date range: ${pastDate.toISOString()} to ${futureDate.toISOString()}`);

    // Phase 1: Fetch webinar lists
    await broadcastProgress(supabase, syncId, 'status', 'Fetching webinar lists...', {}, 0);
    
    // Update sync log
    await supabase
      .from('zoom_sync_logs')
      .update({
        current_operation: 'Fetching webinar lists...',
        sync_progress: 5
      })
      .eq('id', syncId);

    // Use a Map to avoid duplicates by webinar ID
    const webinarMap = new Map<string, WebinarQueueItem>();
    
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
      
      // Add to map to avoid duplicates
      webinars.forEach(w => {
        const id = w.id || w.uuid;
        if (id && !webinarMap.has(id)) {
          webinarMap.set(id, {
            webinar_id: id,
            webinar_uuid: w.uuid,
            webinar_type: 'past'
          });
        }
      });
      
      nextPageToken = token;
      pageCount++;
      
      await broadcastProgress(
        supabase,
        syncId,
        'progress',
        `Fetching past webinars... (Page ${pageCount})`,
        { pageCount, webinarCount: webinarMap.size },
        5
      );
    } while (nextPageToken);

    const pastWebinarCount = webinarMap.size;
    console.log(`[SYNC] Found ${pastWebinarCount} unique past webinars`);

    // Fetch upcoming webinars
    console.log('[SYNC] Fetching upcoming webinars...');
    nextPageToken = undefined;
    pageCount = 0;
    
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
      
      // Add to map, but if a webinar already exists as 'past', keep it as 'past'
      webinars.forEach(w => {
        const id = w.id || w.uuid;
        if (id && !webinarMap.has(id)) {
          webinarMap.set(id, {
            webinar_id: id,
            webinar_uuid: w.uuid,
            webinar_type: 'upcoming'
          });
        }
      });
      
      nextPageToken = token;
      pageCount++;
      
      await broadcastProgress(
        supabase,
        syncId,
        'progress',
        `Fetching upcoming webinars... (Page ${pageCount})`,
        { pageCount, webinarCount: webinarMap.size - pastWebinarCount },
        10
      );
    } while (nextPageToken);

    // Convert map to array
    const allWebinars = Array.from(webinarMap.values());
    const upcomingWebinarCount = webinarMap.size - pastWebinarCount;
    
    console.log(`[SYNC] Found ${upcomingWebinarCount} unique upcoming webinars`);
    console.log(`[SYNC] Total unique webinars to process: ${allWebinars.length}`);

    // Update sync log with correct total
    await supabase
      .from('zoom_sync_logs')
      .update({
        total_items: allWebinars.length,
        processed_items: 0,
        current_operation: `Queuing ${allWebinars.length} webinars for processing...`,
        sync_progress: 15
      })
      .eq('id', syncId);

    // Phase 2: Queue webinars for processing
    await broadcastProgress(
      supabase,
      syncId,
      'status',
      `Queuing ${allWebinars.length} webinars for processing...`,
      { totalWebinars: allWebinars.length },
      15
    );

    // Insert webinars into queue with UUID
    if (allWebinars.length > 0) {
      const queueItems = allWebinars.map((w, index) => ({
        sync_id: syncId,
        webinar_id: w.webinar_id,
        webinar_uuid: w.webinar_uuid,
        webinar_type: w.webinar_type,
        priority: 5,
        scheduled_at: new Date().toISOString()
      }));

      // First, need to add webinar_uuid column to the table if it doesn't exist
      await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE webinar_sync_queue 
          ADD COLUMN IF NOT EXISTS webinar_uuid TEXT;
        `
      }).catch(() => {
        // Column might already exist, ignore error
      });

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
    console.log('[SYNC] Starting to process queued webinars...');
    
    const { data: queuedItems } = await supabase
      .from('webinar_sync_queue')
      .select('*')
      .eq('sync_id', syncId)
      .eq('processing_status', 'pending')
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true });

    let processedCount = 0;
    let failedCount = 0;
    
    if (queuedItems && queuedItems.length > 0) {
      for (const item of queuedItems) {
        try {
          await processWebinar(supabase, accessToken, item, rateLimiter, syncId, connectionId);
          processedCount++;
          
          // Update progress
          const percentage = 15 + (processedCount / queuedItems.length) * 80; // 15-95%
          const currentOperation = `Processing webinars (${processedCount}/${queuedItems.length})`;
          
          await broadcastProgress(
            supabase,
            syncId,
            'progress',
            currentOperation,
            { processedCount, totalCount: queuedItems.length },
            percentage
          );
          
          // Update sync log
          await supabase
            .from('zoom_sync_logs')
            .update({
              processed_items: processedCount,
              current_operation: currentOperation,
              sync_progress: Math.round(percentage)
            })
            .eq('id', syncId);
          
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
          console.error(`[SYNC] Failed to process webinar ${item.webinar_id}:`, error);
          failedCount++;
          // Continue with next webinar
        }
      }
      
      console.log(`[SYNC] Processed ${processedCount} webinars successfully, ${failedCount} failed`);
    }

    // Phase 4: Complete sync
    const finalProcessedCount = processedCount;
    const finalMessage = `Sync completed successfully! Processed ${processedCount} webinars.`;
    
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_items: allWebinars.length,
        processed_items: finalProcessedCount,
        current_operation: finalMessage,
        sync_progress: 100,
        metadata: {
          dateRange,
          syncMode,
          totalWebinars: allWebinars.length,
          processedWebinars: finalProcessedCount,
          failedWebinars: failedCount,
          requestId
        }
      })
      .eq('id', syncId);

    await broadcastProgress(
      supabase,
      syncId,
      'status',
      finalMessage,
      { totalWebinars: allWebinars.length, processedWebinars: finalProcessedCount },
      100
    );

    console.log('[SYNC] ====== Sync Completed Successfully ======');

    return new Response(
      JSON.stringify({
        success: true,
        syncId,
        webinarsSynced: finalProcessedCount,
        message: finalMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[SYNC] ====== Sync Failed ======');
    console.error('[SYNC] Error:', error);
    
    // Update sync log to failed status if we have a syncId
    if (syncId && supabase) {
      try {
        await supabase
          .from('zoom_sync_logs')
          .update({
            sync_status: 'failed',
            status: 'failed',
            completed_at: new Date().toISOString(),
            current_operation: `Sync failed: ${error.message}`,
            sync_progress: 0,
            metadata: {
              error: error.message,
              stack: error.stack
            }
          })
          .eq('id', syncId);
          
        await broadcastProgress(
          supabase,
          syncId,
          'error',
          `Sync failed: ${error.message}`,
          { error: error.message }
        );
      } catch (updateError) {
        console.error('[SYNC] Failed to update sync log:', updateError);
      }
    }
    
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
