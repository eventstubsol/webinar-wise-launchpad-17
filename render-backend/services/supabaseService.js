
const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    if (!process.env.DATABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required Supabase environment variables');
    }

    // Extract Supabase URL from DATABASE_URL if needed
    const supabaseUrl = process.env.SUPABASE_URL || this.extractSupabaseUrl(process.env.DATABASE_URL);
    
    this.client = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  extractSupabaseUrl(databaseUrl) {
    // Convert postgres:// URL to https:// Supabase URL
    const match = databaseUrl.match(/\/\/([^:]+)/);
    if (match) {
      return `https://${match[1]}.supabase.co`;
    }
    throw new Error('Could not extract Supabase URL from DATABASE_URL');
  }

  // User and credential management
  async getUserCredentials(userId) {
    const { data, error } = await this.client
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getConnectionWithCredentials(connectionId) {
    const { data: connection, error: connError } = await this.client
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError) throw connError;

    const { data: credentials, error: credError } = await this.client
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', connection.user_id)
      .eq('is_active', true)
      .single();

    if (credError && credError.code !== 'PGRST116') throw credError;

    return {
      connection,
      credentials
    };
  }

  // Connection management
  async createZoomConnection(connectionData) {
    const { data, error } = await this.client
      .from('zoom_connections')
      .insert(connectionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateZoomConnection(id, updates) {
    const { data, error } = await this.client
      .from('zoom_connections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getZoomConnection(id) {
    const { data, error } = await this.client
      .from('zoom_connections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async deleteZoomConnection(id) {
    const { error } = await this.client
      .from('zoom_connections')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Sync logging
  async createSyncLog(logData) {
    const { data, error } = await this.client
      .from('zoom_sync_logs')
      .insert(logData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSyncLog(id, updates) {
    const { error } = await this.client
      .from('zoom_sync_logs')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async getSyncLog(id) {
    const { data, error } = await this.client
      .from('zoom_sync_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new SupabaseService();
