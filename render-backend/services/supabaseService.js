
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
}

module.exports = new SupabaseService();
