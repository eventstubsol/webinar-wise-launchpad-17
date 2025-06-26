
const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    // Enhanced initialization with validation
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('=== SUPABASE SERVICE INITIALIZATION ===');
    console.log('SUPABASE_URL present:', !!this.supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!this.supabaseServiceKey);
    
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      const missing = [];
      if (!this.supabaseUrl) missing.push('SUPABASE_URL');
      if (!this.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      
      console.error('❌ Missing required Supabase environment variables:', missing);
      throw new Error(`Missing required Supabase environment variables: ${missing.join(', ')}`);
    }

    try {
      this.client = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            'X-Client-Info': 'webinar-wise-render-backend'
          }
        }
      });

      console.log('✅ Supabase service initialized successfully');
    } catch (initError) {
      console.error('❌ Failed to initialize Supabase client:', initError);
      throw new Error(`Failed to initialize Supabase client: ${initError.message}`);
    }
  }

  async testConnection() {
    const testId = Math.random().toString(36).substring(7);
    console.log(`🔍 [${testId}] Testing Supabase connection...`);
    
    try {
      // Test with a simple query to zoom_connections table
      const { data, error, count } = await this.client
        .from('zoom_connections')
        .select('id', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        console.error(`❌ [${testId}] Supabase connection test failed:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return false;
      }

      console.log(`✅ [${testId}] Supabase connection test successful (found ${count || 0} connections)`);
      return true;
    } catch (error) {
      console.error(`💥 [${testId}] Supabase connection test error:`, error);
      return false;
    }
  }

  async getConnectionById(connectionId, userId) {
    const queryId = Math.random().toString(36).substring(7);
    console.log(`🔍 [${queryId}] Getting connection ${connectionId} for user ${userId}`);
    
    try {
      const { data, error } = await this.client
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error(`❌ [${queryId}] Error fetching connection:`, {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      console.log(`✅ [${queryId}] Connection found:`, {
        id: data.id,
        status: data.connection_status,
        type: data.connection_type
      });

      return data;
    } catch (error) {
      console.error(`💥 [${queryId}] Exception fetching connection:`, error);
      return null;
    }
  }

  async createSyncLog(connectionId, syncType) {
    const logId = Math.random().toString(36).substring(7);
    console.log(`📝 [${logId}] Creating sync log for connection ${connectionId}, type: ${syncType}`);
    
    try {
      const { data, error } = await this.client
        .from('zoom_sync_logs')
        .insert({
          connection_id: connectionId,
          sync_type: syncType,
          sync_status: 'started',
          started_at: new Date().toISOString(),
          total_items: 0,
          processed_items: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ [${logId}] Error creating sync log:`, {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Failed to create sync log: ${error.message}`);
      }

      console.log(`✅ [${logId}] Sync log created successfully:`, data.id);
      return data;
    } catch (error) {
      console.error(`💥 [${logId}] Exception creating sync log:`, error);
      throw error;
    }
  }

  async updateSyncLog(syncLogId, updates) {
    const updateId = Math.random().toString(36).substring(7);
    console.log(`🔄 [${updateId}] Updating sync log ${syncLogId}`);
    
    try {
      const { error } = await this.client
        .from('zoom_sync_logs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', syncLogId);

      if (error) {
        console.error(`❌ [${updateId}] Error updating sync log:`, {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Failed to update sync log: ${error.message}`);
      }

      console.log(`✅ [${updateId}] Sync log updated successfully`);
    } catch (error) {
      console.error(`💥 [${updateId}] Exception updating sync log:`, error);
      throw error;
    }
  }
}

// Create singleton instance with error handling
let supabaseServiceInstance = null;

try {
  supabaseServiceInstance = new SupabaseService();
} catch (initError) {
  console.error('💥 Failed to create SupabaseService instance:', initError.message);
  // Create a dummy service that will fail gracefully
  supabaseServiceInstance = {
    client: null,
    testConnection: async () => {
      console.error('❌ Supabase service not initialized');
      return false;
    },
    getConnectionById: async () => {
      throw new Error('Supabase service not initialized');
    },
    createSyncLog: async () => {
      throw new Error('Supabase service not initialized');
    },
    updateSyncLog: async () => {
      throw new Error('Supabase service not initialized');
    }
  };
}

module.exports = { supabaseService: supabaseServiceInstance };
