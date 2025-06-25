
const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    if (!process.env.DATABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required Supabase environment variables: DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }

    // Extract Supabase URL from DATABASE_URL if needed
    const supabaseUrl = process.env.SUPABASE_URL || this.extractSupabaseUrl(process.env.DATABASE_URL);
    
    try {
      this.client = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      console.log('✅ Supabase client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  extractSupabaseUrl(databaseUrl) {
    try {
      // Convert postgres:// URL to https:// Supabase URL
      const match = databaseUrl.match(/\/\/([^:]+)/);
      if (match) {
        return `https://${match[1]}.supabase.co`;
      }
      throw new Error('Could not extract Supabase URL from DATABASE_URL');
    } catch (error) {
      console.error('Error extracting Supabase URL:', error);
      throw error;
    }
  }

  // User and credential management
  async getUserCredentials(userId) {
    try {
      const { data, error } = await this.client
        .from('zoom_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error getting user credentials:', error);
      throw error;
    }
  }

  async getConnectionWithCredentials(connectionId) {
    try {
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
    } catch (error) {
      console.error('Error getting connection with credentials:', error);
      throw error;
    }
  }

  // Connection management
  async createZoomConnection(connectionData) {
    try {
      const { data, error } = await this.client
        .from('zoom_connections')
        .insert(connectionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating zoom connection:', error);
      throw error;
    }
  }

  async updateZoomConnection(id, updates) {
    try {
      const { data, error } = await this.client
        .from('zoom_connections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating zoom connection:', error);
      throw error;
    }
  }

  async getZoomConnection(id) {
    try {
      const { data, error } = await this.client
        .from('zoom_connections')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting zoom connection:', error);
      throw error;
    }
  }

  async deleteZoomConnection(id) {
    try {
      const { error } = await this.client
        .from('zoom_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting zoom connection:', error);
      throw error;
    }
  }

  // Sync logging
  async createSyncLog(logData) {
    try {
      const { data, error } = await this.client
        .from('zoom_sync_logs')
        .insert(logData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating sync log:', error);
      throw error;
    }
  }

  async updateSyncLog(id, updates) {
    try {
      const { error } = await this.client
        .from('zoom_sync_logs')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating sync log:', error);
      throw error;
    }
  }

  async getSyncLog(id) {
    try {
      const { data, error } = await this.client
        .from('zoom_sync_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting sync log:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseService();
