const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  async getUserCredentials(userId) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_credentials')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching Zoom credentials:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch Zoom credentials:', error);
      return null;
    }
  }

  async getZoomConnection(connectionId) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (error) {
        console.error('Error fetching Zoom connection:', error);
        throw new Error(`Failed to fetch Zoom connection: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to get Zoom connection:', error);
      throw error;
    }
  }

  async getSyncLog(syncId) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('id', syncId)
        .single();

      if (error) {
        console.error('Error fetching sync log:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch sync log:', error);
      return null;
    }
  }

  async createSyncLog(syncLogData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_sync_logs')
        .insert([syncLogData]);

      if (error) {
        console.error('Error creating sync log:', error);
        throw new Error(`Failed to create sync log: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to create sync log:', error);
      throw error;
    }
  }

  async updateSyncLog(syncId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_sync_logs')
        .update(updateData)
        .eq('id', syncId);

      if (error) {
        console.error('Error updating sync log:', error);
        throw new Error(`Failed to update sync log: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to update sync log:', error);
      throw error;
    }
  }

  async storeWebinar(webinarData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_webinars')
        .upsert([webinarData], { onConflict: 'connection_id, webinar_id' })
        .select('id');

      if (error) {
        console.error('Error storing webinar:', error);
        throw new Error(`Failed to store webinar: ${error.message}`);
      }

      return data && data.length > 0 ? data[0].id : null;
    } catch (error) {
      console.error('Failed to store webinar:', error);
      throw error;
    }
  }

  async storeParticipants(participantData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_participants')
        .upsert(participantData, { onConflict: 'webinar_id, participant_id' });

      if (error) {
        console.error('Error storing participants:', error);
        throw new Error(`Failed to store participants: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to store participants:', error);
      throw error;
    }
  }

  async storeRegistrants(registrantData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_registrants')
        .upsert(registrantData, { onConflict: 'webinar_id, registrant_id' });

      if (error) {
        console.error('Error storing registrants:', error);
        throw new Error(`Failed to store registrants: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to store registrants:', error);
      throw error;
    }
  }

  async getWebinarByZoomId(webinarId, connectionId) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_webinars')
        .select('id')
        .eq('webinar_id', webinarId)
        .eq('connection_id', connectionId)
        .single();

      if (error) {
        console.error('Error fetching webinar by Zoom ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get webinar by Zoom ID:', error);
      return null;
    }
  }

  async updateZoomConnection(connectionId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_connections')
        .update(updateData)
        .eq('id', connectionId);

      if (error) {
        console.error('Error updating Zoom connection:', error);
        throw new Error(`Failed to update Zoom connection: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to update Zoom connection:', error);
      throw error;
    }
  }

  async getRegistrantCount(webinarId) {
    try {
      const { count, error } = await this.supabase
        .from('zoom_registrants')
        .select('*', { count: 'exact' })
        .eq('webinar_id', webinarId);

      if (error) {
        console.error('Error fetching registrant count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get registrant count:', error);
      return 0;
    }
  }

  async getParticipantMetrics(webinarId) {
    try {
      const { data, error } = await this.supabase.rpc('get_participant_metrics', {
        p_webinar_id: webinarId
      });

      if (error) {
        console.error('Error fetching participant metrics:', error);
        return {
          totalAttendees: 0,
          totalMinutes: 0,
          avgDuration: 0,
          avgAttentiveness: 0,
          avgCameraUsage: 0,
          totalInteractions: 0
        };
      }

      return {
        totalAttendees: data?.total_attendees || 0,
        totalMinutes: data?.total_minutes || 0,
        avgDuration: data?.avg_duration || 0,
        avgAttentiveness: data?.avg_attentiveness || 0,
        avgCameraUsage: data?.avg_camera_usage || 0,
        totalInteractions: data?.total_interactions || 0
      };
    } catch (error) {
      console.error('Failed to get participant metrics:', error);
      return {
        totalAttendees: 0,
        totalMinutes: 0,
        avgDuration: 0,
        avgAttentiveness: 0,
        avgCameraUsage: 0,
        totalInteractions: 0
      };
    }
  }

  async updateWebinarMetrics(webinarId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_webinars')
        .update(updateData)
        .eq('id', webinarId);

      if (error) {
        console.error('Error updating webinar metrics:', error);
        throw new Error(`Failed to update webinar metrics: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to update webinar metrics:', error);
      throw error;
    }
  }

  async updateRegistrantAttendance(webinarId, attendanceData) {
    try {
      // Prepare the updates in a single query
      const updates = attendanceData.map(item => ({
        registrant_id: item.registrant_id,
        attended: item.attended,
        join_time: item.join_time,
        leave_time: item.leave_time,
        duration: item.duration
      }));

      // Execute the batch update
      const { data, error } = await this.supabase
        .from('zoom_registrants')
        .upsert(
          updates.map(update => ({
            webinar_id: webinarId,
            registrant_id: update.registrant_id,
            attended: update.attended,
            join_time: update.join_time,
            leave_time: update.leave_time,
            duration: update.duration
          })),
          { onConflict: 'webinar_id, registrant_id' }
        );

      if (error) {
        console.error('Error updating registrant attendance:', error);
        throw new Error(`Failed to update registrant attendance: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to update registrant attendance:', error);
      throw error;
    }
  }

  async updateWebinarStatus(webinarId, connectionId) {
    try {
      console.log(`🔄 Updating status for webinar DB ID: ${webinarId}`);
      
      const { data, error } = await this.supabase
        .rpc('batch_update_webinar_statuses');
      
      if (error) {
        console.error('Error updating webinar statuses:', error);
        throw error;
      }
      
      console.log(`✅ Batch status update completed:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Failed to update webinar status:`, error);
      throw error;
    }
  }

  async getWebinarsWithCalculatedStatus(connectionId, limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_webinars_with_calculated_status')
        .select('*')
        .eq('connection_id', connectionId)
        .order('start_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching webinars with calculated status:', error);
        throw error;
      }

      console.log(`📊 Fetched ${data?.length || 0} webinars with calculated status`);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch webinars with calculated status:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseService();
