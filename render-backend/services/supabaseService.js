const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    // Enhanced initialization with proper key separation
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    console.log('=== SUPABASE SERVICE INITIALIZATION ===');
    console.log('SUPABASE_URL present:', !!this.supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!this.supabaseServiceKey);
    console.log('SUPABASE_ANON_KEY present:', !!this.supabaseAnonKey);
    
    if (!this.supabaseUrl || !this.supabaseServiceKey || !this.supabaseAnonKey) {
      const missing = [];
      if (!this.supabaseUrl) missing.push('SUPABASE_URL');
      if (!this.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      if (!this.supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
      
      console.error('❌ Missing required Supabase environment variables:', missing);
      throw new Error(`Missing required Supabase environment variables: ${missing.join(', ')}`);
    }

    try {
      // Create Service Role client for database operations (bypasses RLS)
      this.serviceClient = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            'X-Client-Info': 'webinar-wise-render-backend-service',
            'Authorization': `Bearer ${this.supabaseServiceKey}`,
            'apikey': this.supabaseServiceKey
          }
        }
      });

      // Create Auth client for authentication verification (uses anon key)
      this.authClient = createClient(this.supabaseUrl, this.supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            'X-Client-Info': 'webinar-wise-render-backend-auth'
          }
        }
      });

      // Keep backward compatibility
      this.client = this.serviceClient;
      this.userClient = this.authClient;

      console.log('✅ Supabase service initialized successfully');
      console.log('✅ Service client initialized with Service Role key');
      console.log('✅ Auth client initialized with Anon key');
    } catch (initError) {
      console.error('❌ Failed to initialize Supabase clients:', initError);
      throw new Error(`Failed to initialize Supabase clients: ${initError.message}`);
    }
  }

  /**
   * Verify authentication token using Supabase's built-in methods
   * This replaces manual JWT verification
   */
  async verifyAuthToken(token) {
    const verifyId = Math.random().toString(36).substring(7);
    console.log(`🔍 [${verifyId}] Verifying auth token with Supabase...`);
    
    try {
      // Use auth client to verify the token
      const { data: { user }, error } = await this.authClient.auth.getUser(token);
      
      if (error) {
        console.error(`❌ [${verifyId}] Token verification failed:`, {
          message: error.message,
          status: error.status
        });
        return {
          success: false,
          error: error.message,
          user: null
        };
      }

      if (!user) {
        console.error(`❌ [${verifyId}] No user returned from token verification`);
        return {
          success: false,
          error: 'Invalid token - no user found',
          user: null
        };
      }

      console.log(`✅ [${verifyId}] Token verified successfully for user: ${user.id}`);
      return {
        success: true,
        user: user,
        error: null
      };

    } catch (error) {
      console.error(`💥 [${verifyId}] Token verification exception:`, error);
      return {
        success: false,
        error: error.message || 'Token verification failed',
        user: null
      };
    }
  }

  async testConnection() {
    const testId = Math.random().toString(36).substring(7);
    console.log(`🔍 [${testId}] Testing Supabase connection with Service Role...`);
    
    try {
      // Test with a simple query to zoom_connections table
      const { data, error, count } = await this.serviceClient
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
      const { data, error } = await this.serviceClient
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

  async getCredentialsByUserId(userId) {
    const queryId = Math.random().toString(36).substring(7);
    console.log(`🔍 [${queryId}] Getting credentials for user ${userId} with Service Role`);
    
    try {
      const { data, error } = await this.serviceClient
        .from('zoom_credentials')
        .select('client_id, client_secret, account_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error(`❌ [${queryId}] Error fetching credentials:`, {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      console.log(`✅ [${queryId}] Credentials found for user`);
      return data;
    } catch (error) {
      console.error(`💥 [${queryId}] Exception fetching credentials:`, error);
      return null;
    }
  }

  async updateConnection(connectionId, updates) {
    const updateId = Math.random().toString(36).substring(7);
    console.log(`🔄 [${updateId}] Updating connection ${connectionId} with Service Role`);
    
    try {
      const { data, error } = await this.serviceClient
        .from('zoom_connections')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)
        .select()
        .single();

      if (error) {
        console.error(`❌ [${updateId}] Error updating connection:`, {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      console.log(`✅ [${updateId}] Connection updated successfully`);
      return data;
    } catch (error) {
      console.error(`💥 [${updateId}] Exception updating connection:`, error);
      return null;
    }
  }

  async createSyncLog(connectionId, syncType) {
    const logId = Math.random().toString(36).substring(7);
    console.log(`📝 [${logId}] Creating sync log for connection ${connectionId}, type: ${syncType}`);
    
    try {
      const { data, error } = await this.serviceClient
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
      const { error } = await this.serviceClient
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

// Create singleton instance with enhanced error handling
let supabaseServiceInstance = null;

try {
  supabaseServiceInstance = new SupabaseService();
} catch (initError) {
  console.error('💥 Failed to create SupabaseService instance:', initError.message);
  // Create a dummy service that will fail gracefully
  supabaseServiceInstance = {
    serviceClient: null,
    authClient: null,
    client: null,
    userClient: null,
    verifyAuthToken: async () => ({
      success: false,
      error: 'Supabase service not initialized',
      user: null
    }),
    testConnection: async () => {
      console.error('❌ Supabase service not initialized');
      return false;
    },
    getConnectionById: async () => {
      throw new Error('Supabase service not initialized');
    },
    getCredentialsByUserId: async () => {
      throw new Error('Supabase service not initialized');
    },
    updateConnection: async () => {
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
