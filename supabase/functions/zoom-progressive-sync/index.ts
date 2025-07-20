import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Buffer } from "https://deno.land/std@0.168.0/io/buffer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, zoom_connection_id',
  'Access-Control-Max-Age': '86400',
};

// Inline encryption class to avoid import issues
const IV_LENGTH = 16;

class SimpleTokenEncryption {
  private static async getKey(salt: string): Promise<CryptoKey> {
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_SALT') || 'default-salt-is-not-secure-change-me';
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(ENCRYPTION_KEY),
      { name: "HKDF" },
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        salt: new TextEncoder().encode(salt),
        info: new TextEncoder().encode("ZoomTokenEncryption"),
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  static async decryptToken(encryptedToken: string, salt: string): Promise<string> {
    // 1. Try to decrypt using AES-GCM
    try {
        console.log('Attempting AES-GCM decryption...');
        const key = await this.getKey(salt);
        const data = Buffer.from(encryptedToken, "base64");
        const iv = data.slice(0, IV_LENGTH);
        const encrypted = data.slice(IV_LENGTH);

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encrypted
        );
        
        console.log('Successfully decrypted token using AES-GCM.');
        return new TextDecoder().decode(decrypted);
    } catch(e: any) {
        console.log(`AES-GCM decryption failed: ${e.message}. Attempting fallbacks.`);
        
        // 2. Fallback for tokens that might be just base64 encoded
        try {
            console.log('Attempting base64 decoding fallback...');
            const decoded = atob(encryptedToken);
            console.log('Successfully decoded token using base64 fallback.');
            return decoded;
        } catch (e2: any) {
            console.log(`Base64 decoding failed: ${e2.message}. Assuming plain text token.`);
            // 3. If base64 decoding fails, it might be a plain token
            return encryptedToken;
        }
    }
  }
}

interface SyncProgress {
  total_pages: number;
  current_page: number;
  total_webinars: number;
  synced_webinars: number;
  status: 'running' | 'completed' | 'failed';
  message: string;
}

class ProgressiveZoomSync {
  private supabase: any;
  private zoomToken: string;
  private connectionId: string;
  private syncLogId: string | null = null;
  private progress: SyncProgress = {
    total_pages: 0,
    current_page: 0,
    total_webinars: 0,
    synced_webinars: 0,
    status: 'running',
    message: 'Initializing sync...'
  };

  constructor(supabase: any, zoomToken: string, connectionId: string) {
    this.supabase = supabase;
    this.zoomToken = zoomToken;
    this.connectionId = connectionId;
  }

  async startSync(): Promise<SyncProgress> {
    try {
      // Create sync log entry
      await this.createSyncLog();
      
      // Sync past webinars
      await this.syncWebinarsByType('past');
      
      // Sync upcoming webinars
      await this.syncWebinarsByType('scheduled');
      
      // Mark sync as completed
      this.progress.status = 'completed';
      this.progress.message = 'Sync completed successfully';
      await this.updateSyncLog('completed');
      
      return this.progress;
    } catch (error: any) {
      this.progress.status = 'failed';
      this.progress.message = `Sync failed: ${error.message}`;
      await this.updateSyncLog('failed', error.message);
      throw error;
    }
  }

  private async createSyncLog() {
    const { data, error } = await this.supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: this.connectionId,
        sync_type: 'webinars',
        status: 'in_progress',
        progress: this.progress,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    this.syncLogId = data.id;
  }

  private async updateSyncLog(status: string, error_message?: string) {
    if (!this.syncLogId) return;

    const updateData: any = {
      status,
      progress: this.progress,
      completed_at: new Date().toISOString()
    };

    if (error_message) {
      updateData.error_message = error_message;
    }

    await this.supabase
      .from('zoom_sync_logs')
      .update(updateData)
      .eq('id', this.syncLogId);
  }

  private async syncWebinarsByType(type: 'past' | 'scheduled') {
    let pageNumber = 1;
    let hasMorePages = true;
    const pageSize = 100;
    let retryCount = 0;
    const maxRetries = 3;

    this.progress.message = `Syncing ${type} webinars...`;
    await this.updateProgress();

    while (hasMorePages) {
      try {
        // Fetch webinars from Zoom with retry logic
        const response = await this.fetchWebinarsWithRetry(type, pageNumber, pageSize, maxRetries);
        
        if (!response || !response.webinars) {
          hasMorePages = false;
          continue;
        }

        // Update total pages and webinars count
        if (pageNumber === 1) {
          this.progress.total_pages += Math.ceil(response.total_records / pageSize);
          this.progress.total_webinars += response.total_records;
        }

        // Process each webinar with error handling
        const syncPromises = response.webinars.map(async (webinar: any) => {
          try {
            await this.syncWebinar(webinar, type);
            this.progress.synced_webinars++;
            
            // Update progress every 10 webinars
            if (this.progress.synced_webinars % 10 === 0) {
              await this.updateProgress();
            }
          } catch (error) {
            console.error(`Failed to sync webinar ${webinar.id}:`, error);
            // Continue with other webinars even if one fails
          }
        });

        // Process webinars in batches of 5 to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < syncPromises.length; i += batchSize) {
          await Promise.all(syncPromises.slice(i, i + batchSize));
        }

        // Check if there are more pages
        hasMorePages = pageNumber < response.page_count;
        pageNumber++;
        this.progress.current_page++;
        
        // Update progress after each page
        await this.updateProgress();

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

        // Reset retry count on successful page
        retryCount = 0;

      } catch (error: any) {
        console.error(`Error syncing ${type} webinars page ${pageNumber}:`, error);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.error(`Max retries reached for page ${pageNumber}, moving to next page`);
          pageNumber++;
          retryCount = 0;
        } else {
          console.log(`Retrying page ${pageNumber} (attempt ${retryCount + 1}/${maxRetries})`);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }
  }

  private async fetchWebinarsWithRetry(type: string, pageNumber: number, pageSize: number, maxRetries: number): Promise<any> {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.fetchWebinarsFromZoom(type, pageNumber, pageSize);
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a rate limit error (429)
        if (error.message?.includes('429')) {
          const retryAfter = parseInt(error.headers?.get('Retry-After') || '60');
          console.log(`Rate limited. Waiting ${retryAfter} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        } else if (attempt < maxRetries) {
          // Exponential backoff for other errors
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  private async fetchWebinarsFromZoom(type: string, pageNumber: number, pageSize: number) {
    const url = `https://api.zoom.us/v2/users/me/webinars?type=${type}&page_size=${pageSize}&page_number=${pageNumber}`;
    
    console.log(`Fetching ${type} webinars - Page ${pageNumber}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.zoomToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error: any = new Error(`Zoom API error: ${response.status} - ${errorText}`);
      error.status = response.status;
      error.headers = response.headers;
      
      // Log specific error types
      if (response.status === 401) {
        console.error('Authentication failed - token may be expired');
      } else if (response.status === 429) {
        console.error('Rate limit exceeded');
      } else if (response.status === 404) {
        console.error('Endpoint not found or no webinars available');
      }
      
      throw error;
    }

    const data = await response.json();
    console.log(`Fetched ${data.webinars?.length || 0} webinars from page ${pageNumber}`);
    
    return data;
  }

  private async syncWebinar(webinar: any, type: string) {
    try {
      // Fetch detailed webinar info if needed
      let detailedWebinar = webinar;
      
      if (type === 'past') {
        // For past webinars, try to get additional details
        try {
          const pastDetails = await this.fetchPastWebinarDetails(webinar.id);
          if (pastDetails) {
            detailedWebinar = { ...webinar, ...pastDetails };
          }
        } catch (error) {
          console.warn(`Could not fetch past details for webinar ${webinar.id}`);
        }
      } else {
        // For scheduled webinars, get full details
        try {
          const fullDetails = await this.fetchWebinarDetails(webinar.id);
          if (fullDetails) {
            detailedWebinar = fullDetails;
          }
        } catch (error) {
          console.warn(`Could not fetch details for webinar ${webinar.id}`);
        }
      }

      // Transform webinar data to match our database schema
      const webinarData = this.transformWebinarData(detailedWebinar);

      // Upsert webinar data
      const { error } = await this.supabase
        .from('zoom_webinars')
        .upsert({
          ...webinarData,
          connection_id: this.connectionId,
          synced_at: new Date().toISOString()
        }, {
          onConflict: 'webinar_id,connection_id'
        });

      if (error) {
        console.error(`Error upserting webinar ${webinar.id}:`, error);
      }
    } catch (error) {
      console.error(`Error syncing webinar ${webinar.id}:`, error);
    }
  }

  private async fetchWebinarDetails(webinarId: string) {
    const url = `https://api.zoom.us/v2/webinars/${webinarId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.zoomToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch webinar details: ${response.status}`);
    }

    return await response.json();
  }

  private async fetchPastWebinarDetails(webinarId: string) {
    const url = `https://api.zoom.us/v2/past_webinars/${webinarId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.zoomToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  }

  private transformWebinarData(webinar: any) {
    return {
      webinar_id: webinar.id?.toString() || webinar.uuid,
      webinar_uuid: webinar.uuid || webinar.id?.toString(),
      topic: webinar.topic || 'Untitled Webinar',
      type: webinar.type || 5,
      start_time: webinar.start_time || null,
      duration: webinar.duration || 0,
      timezone: webinar.timezone || null,
      agenda: webinar.agenda || null,
      host_id: webinar.host_id || '',
      host_email: webinar.host_email || null,
      status: this.determineStatus(webinar),
      join_url: webinar.join_url || null,
      start_url: webinar.start_url || null,
      registration_url: webinar.registration_url || null,
      password: webinar.password || null,
      h323_password: webinar.h323_password || null,
      pstn_password: webinar.pstn_password || null,
      encrypted_password: webinar.encrypted_password || null,
      h323_passcode: webinar.h323_passcode || null,
      encrypted_passcode: webinar.encrypted_passcode || null,
      settings: webinar.settings || {},
      recurrence: webinar.recurrence || null,
      occurrences: webinar.occurrences || null,
      occurrence_id: webinar.occurrence_id || null,
      tracking_fields: webinar.tracking_fields || null,
      registration_required: webinar.settings?.approval_type !== undefined,
      registration_type: webinar.settings?.registration_type || null,
      approval_type: webinar.settings?.approval_type || null,
      max_registrants: webinar.settings?.registrants_restrict_number || null,
      max_attendees: webinar.settings?.attendees_restrict || null,
      alternative_hosts: webinar.settings?.alternative_hosts?.split(';').filter(Boolean) || null,
      is_simulive: webinar.is_simulive || false,
      transition_to_live: webinar.transition_to_live || false,
      creation_source: webinar.creation_source || null,
      webinar_created_at: webinar.created_at || null,
      record_file_id: webinar.record_file_id || null,
      // Analytics fields (will be populated later)
      total_registrants: webinar.total_registrants || 0,
      total_attendees: webinar.total_attendees || 0,
      total_minutes: webinar.total_minutes || 0,
      avg_attendance_duration: webinar.avg_attendance_duration || 0,
      participant_sync_status: 'pending'
    };
  }

  private determineStatus(webinar: any): string {
    if (webinar.status) {
      return webinar.status;
    }
    
    if (!webinar.start_time) {
      return 'scheduled';
    }

    const startTime = new Date(webinar.start_time);
    const now = new Date();
    const endTime = new Date(startTime.getTime() + (webinar.duration || 60) * 60000);

    if (now < startTime) {
      return 'scheduled';
    } else if (now >= startTime && now <= endTime) {
      return 'started';
    } else {
      return 'ended';
    }
  }

  private async updateProgress() {
    const percentage = this.progress.total_webinars > 0 
      ? Math.round((this.progress.synced_webinars / this.progress.total_webinars) * 100)
      : 0;
      
    this.progress.message = `Syncing webinars... ${percentage}% complete (${this.progress.synced_webinars}/${this.progress.total_webinars})`;
    
    await this.updateSyncLog('in_progress');
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('Progressive sync request received');
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get connection ID from request
    const body = await req.json();
    const connection_id = body.connection_id;
    
    if (!connection_id) {
      return new Response(
        JSON.stringify({ error: 'Connection ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Looking up connection:', connection_id);

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('id', connection_id)
      .single();

    if (connectionError || !connection) {
      console.error('Connection lookup error:', connectionError);
      throw new Error('Connection not found');
    }

    console.log('Found connection, decrypting token...');

    // Decrypt access token
    const encryptionKey = Deno.env.get('ZOOM_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Use the static method correctly
    const accessToken = await SimpleTokenEncryption.decryptToken(
      connection.encrypted_access_token,
      encryptionKey
    );

    console.log('Token decrypted, starting sync...');

    // Start progressive sync
    const sync = new ProgressiveZoomSync(supabase, accessToken, connection_id);
    const result = await sync.startSync();

    // Update connection last sync time
    await supabase
      .from('zoom_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection_id);

    return new Response(
      JSON.stringify({ success: true, progress: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Progressive sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});