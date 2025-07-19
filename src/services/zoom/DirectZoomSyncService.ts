import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import axios from 'axios';

/**
 * Direct Zoom Sync Service
 * This bypasses the Render backend and syncs directly via browser
 * Used as fallback when Render backend is unavailable or misconfigured
 */
class DirectZoomSyncService {
  private readonly ZOOM_API_BASE = 'https://api.zoom.us/v2';

  /**
   * Get a fresh access token using credentials
   */
  private async getAccessToken(credentials: any): Promise<string> {
    try {
      // For Server-to-Server OAuth app
      const tokenUrl = 'https://zoom.us/oauth/token';
      const auth = btoa(`${credentials.client_id}:${credentials.client_secret}`);
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: credentials.account_id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || 'Failed to get access token');
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw new Error('Failed to authenticate with Zoom. Please check your credentials.');
    }
  }

  /**
   * Fetch webinars from Zoom API
   */
  private async fetchWebinars(accessToken: string, userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.ZOOM_API_BASE}/users/${userId}/webinars?page_size=100`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch webinars');
      }

      const data = await response.json();
      return data.webinars || [];
    } catch (error) {
      console.error('Failed to fetch webinars:', error);
      throw error;
    }
  }

  /**
   * Main sync function
   */
  async syncWebinars(connectionId: string) {
    console.log('🚀 Using Direct Sync (browser-based sync)...');
    
    let syncLogId: string | null = null;
    
    try {
      // Show info message
      toast.info('Using direct sync mode - this may take a moment', {
        duration: 5000
      });

      // Get the connection details
      const { data: connection, error: connError } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connError || !connection) {
        throw new Error('Failed to fetch connection details');
      }

      // Get user's Zoom credentials
      const { data: credentials, error: credError } = await supabase
        .from('zoom_credentials')
        .select('*')
        .eq('user_id', connection.user_id)
        .eq('is_active', true)
        .single();

      if (credError || !credentials) {
        throw new Error('No Zoom credentials found. Please set up your Zoom credentials in Settings.');
      }

      // Create sync log
      const { data: syncLog, error: logError } = await supabase
        .from('zoom_sync_logs')
        .insert({
          connection_id: connectionId,
          sync_type: 'manual',
          sync_status: 'running',
          status: 'running',
          started_at: new Date().toISOString(),
          total_items: 0,
          processed_items: 0,
          current_operation: 'Starting direct sync...',
          sync_progress: 10
        })
        .select()
        .single();

      if (logError || !syncLog) {
        throw new Error('Failed to create sync log');
      }

      syncLogId = syncLog.id;
      toast.loading('Fetching webinars from Zoom...', { id: 'direct-sync' });

      // Update progress
      await supabase
        .from('zoom_sync_logs')
        .update({
          metadata: { current_operation: 'Authenticating with Zoom...' },
          sync_stage: 'authenticating',
        })
        .eq('id', syncLogId);

      // Get access token
      const accessToken = await this.getAccessToken(credentials);

      // Update connection with new token
      await supabase
        .from('zoom_connections')
        .update({
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
          last_sync_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      // Update progress
      await supabase
        .from('zoom_sync_logs')
        .update({
          metadata: { current_operation: 'Fetching webinars...' },
          stage_progress_percentage: 40
        })
        .eq('id', syncLogId);

      // Fetch webinars
      const webinars = await this.fetchWebinars(accessToken, connection.zoom_user_id);
      
      // Update progress
      await supabase
        .from('zoom_sync_logs')
        .update({
          current_operation: `Processing ${webinars.length} webinars...`,
          sync_progress: 60,
          total_items: webinars.length
        })
        .eq('id', syncLogId);

      // Process webinars
      let processedCount = 0;
      const errors: any[] = [];

      for (const webinar of webinars) {
        try {
          // Check if webinar exists
          const { data: existingWebinar } = await supabase
            .from('zoom_webinars')
            .select('id')
            .eq('zoom_webinar_id', webinar.id)
            .eq('connection_id', connectionId)
            .single();

          const webinarData = {
            connection_id: connectionId,
            webinar_id: webinar.id,
            uuid: webinar.uuid || webinar.id,
            topic: webinar.topic,
            start_time: webinar.start_time,
            duration: webinar.duration,
            timezone: webinar.timezone,
            agenda: webinar.agenda,
            host_email: webinar.host_email,
            type: webinar.type,
            registration_url: webinar.registration_url,
            status: webinar.status || 'scheduled',
            join_url: webinar.join_url,
            total_registrants: 0,
            total_attendees: 0,
            raw_data: webinar,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          if (existingWebinar) {
            // Update existing
            await supabase
              .from('zoom_webinars')
              .update(webinarData)
              .eq('id', existingWebinar.id);
          } else {
            // Insert new
            await supabase
              .from('zoom_webinars')
              .insert({
                ...webinarData,
                host_id: webinar.host_id || 'unknown',
                zoom_webinar_id: webinar.id,
                created_at: new Date().toISOString()
              });
          }

          processedCount++;

          // Update progress
          const progress = 60 + Math.floor((processedCount / webinars.length) * 30);
          await supabase
            .from('zoom_sync_logs')
            .update({
              sync_progress: progress,
              processed_items: processedCount
            })
            .eq('id', syncLogId);

        } catch (error: any) {
          console.error(`Error processing webinar ${webinar.id}:`, error);
          errors.push({
            webinar_id: webinar.id,
            error: error.message
          });
        }
      }

      // Update sync log with completion
      await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'completed',
          status: 'completed',
          total_items: webinars.length,
          processed_items: processedCount,
          completed_at: new Date().toISOString(),
          current_operation: `Sync completed! Processed ${processedCount} of ${webinars.length} webinars.`,
          sync_progress: 100,
          error_details: errors.length > 0 ? { errors } : {}
        })
        .eq('id', syncLogId);

      toast.success(`Synced ${processedCount} webinars successfully!`, { 
        id: 'direct-sync' 
      });

      return {
        success: true,
        data: {
          webinarsCount: processedCount,
          totalWebinars: webinars.length,
          errors
        },
        syncId: syncLogId
      };

    } catch (error: any) {
      console.error('Direct sync error:', error);
      
      // Update sync log with error
      if (syncLogId) {
        await supabase
          .from('zoom_sync_logs')
          .update({
            sync_status: 'failed',
            status: 'failed',
            error_message: `Sync error: ${error.message}`,
            completed_at: new Date().toISOString(),
            current_operation: 'Sync failed',
            sync_progress: 0
          })
          .eq('id', syncLogId);
      }
      
      toast.error(error.message || 'Direct sync failed', { id: 'direct-sync' });
      
      return {
        success: false,
        error: error.message || 'Direct sync failed'
      };
    }
  }

  /**
   * Test connection without syncing
   */
  async testConnection(connectionId: string) {
    try {
      const { data: connection, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (error || !connection) {
        return {
          success: false,
          error: 'Connection not found'
        };
      }

      // Get credentials and test token
      const { data: credentials, error: credError } = await supabase
        .from('zoom_credentials')
        .select('*')
        .eq('user_id', connection.user_id)
        .eq('is_active', true)
        .single();

      if (credError || !credentials) {
        return {
          success: false,
          error: 'No Zoom credentials found'
        };
      }

      // Try to get token
      const accessToken = await this.getAccessToken(credentials);
      
      return {
        success: true,
        data: connection,
        message: 'Connection test successful'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const DirectZoomSync = new DirectZoomSyncService();
