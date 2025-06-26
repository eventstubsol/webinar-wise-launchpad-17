
const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    // Initialize Supabase client
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      console.error('SUPABASE_URL present:', !!this.supabaseUrl);
      console.error('SUPABASE_SERVICE_ROLE_KEY present:', !!this.supabaseServiceKey);
      throw new Error('Missing required Supabase environment variables');
    }

    this.client = createClient(this.supabaseUrl, this.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Supabase service initialized successfully');
  }

  async testConnection() {
    try {
      const { data, error } = await this.client
        .from('zoom_connections')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Supabase connection test failed:', error);
        return false;
      }

      console.log('Supabase connection test successful');
      return true;
    } catch (error) {
      console.error('Supabase connection test error:', error);
      return false;
    }
  }

  async getConnectionById(connectionId, userId) {
    const { data, error } = await this.client
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching connection:', error);
      return null;
    }

    return data;
  }

  async createSyncLog(connectionId, syncType) {
    const { data, error } = await this.client
      .from('zoom_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: syncType,
        sync_status: 'started',
        started_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating sync log:', error);
      throw error;
    }

    return data;
  }

  async updateSyncLog(syncLogId, updates) {
    const { error } = await this.client
      .from('zoom_sync_logs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);

    if (error) {
      console.error('Error updating sync log:', error);
    }
  }
}

const supabaseService = new SupabaseService();

module.exports = { supabaseService };
