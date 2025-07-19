import axios, { AxiosError } from 'axios';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DirectZoomSync } from './DirectZoomSyncService';

// Updated with your actual Render deployment URL
const RENDER_API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://webinar-wise-launchpad-17.onrender.com'
  : 'https://webinar-wise-launchpad-17.onrender.com';

interface ValidationCredentialsPayload {
  account_id: string;
  client_id: string;
  client_secret: string;
}

// Enhanced ApiResponse interface with all expected properties
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  // Sync-specific properties
  syncId?: string;
  status?: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  currentOperation?: string;
  total_items?: number;
  processed_items?: number;
  error_message?: string;
  // Connection-specific properties
  connection?: any;
  // Service availability
  isServiceAvailable?: boolean;
  retryAfter?: number;
}

class RenderZoomServiceClass {
  private serviceHealthy: boolean = true;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // 1 minute
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second
  private isWakingUp: boolean = false;
  private useDirectSync: boolean = false;

  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }
      
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('Failed to get auth headers:', error);
      throw new Error('Authentication required');
    }
  }

  private async checkServiceHealth(): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if checked recently
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.serviceHealthy;
    }

    try {
      console.log('🏥 Checking Render service health...');
      const response = await axios.get(`${RENDER_API_BASE_URL}/health`, {
        timeout: 10000, // 10 second timeout for health check
        headers: {
          'Accept': 'application/json',
        }
      });

      this.serviceHealthy = response.status === 200;
      this.lastHealthCheck = now;
      
      console.log(`🏥 Service health check: ${this.serviceHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      return this.serviceHealthy;
    } catch (error) {
      console.error('🏥 Service health check failed:', error);
      this.serviceHealthy = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  private async waitForService(retryCount: number = 0): Promise<boolean> {
    if (retryCount >= this.maxRetries) {
      return false;
    }

    // Show wake-up message on first attempt
    if (retryCount === 0 && !this.isWakingUp) {
      this.isWakingUp = true;
      toast.loading('Waking up sync service... This may take 30-60 seconds on free tier.', {
        id: 'service-wakeup',
        duration: 60000
      });
    }

    const isHealthy = await this.checkServiceHealth();
    
    if (isHealthy) {
      if (this.isWakingUp) {
        toast.success('Sync service is ready!', { id: 'service-wakeup' });
        this.isWakingUp = false;
      }
      return true;
    }

    console.log(`⏳ Service unavailable, waiting ${this.retryDelay}ms before retry ${retryCount + 1}/${this.maxRetries}...`);
    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    
    // Exponential backoff
    this.retryDelay = Math.min(this.retryDelay * 2, 10000);
    
    return this.waitForService(retryCount + 1);
  }

  private async makeRequest<T = any>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET', 
    data?: any,
    skipHealthCheck: boolean = false
  ): Promise<ApiResponse<T>> {
    // Skip health check for the health endpoint itself
    if (!skipHealthCheck && endpoint !== '/health') {
      const serviceAvailable = await this.waitForService();
      
      if (!serviceAvailable) {
        if (this.isWakingUp) {
          toast.dismiss('service-wakeup');
          this.isWakingUp = false;
        }
        
        return {
          success: false,
          error: 'Sync service is currently unavailable. The service may be sleeping (free tier limitation).',
          isServiceAvailable: false,
          retryAfter: 60
        };
      }
    }

    try {
      const headers = endpoint === '/health' 
        ? { 'Accept': 'application/json' }
        : await this.getAuthHeaders();
      
      const config = {
        method,
        url: `${RENDER_API_BASE_URL}${endpoint}`,
        headers,
        timeout: endpoint === '/health' ? 10000 : 60000,
        ...(data && { data })
      };

      console.log(`🚀 Making authenticated request to: ${config.url}`);
      
      const response = await axios(config);
      
      // Reset retry delay on successful request
      this.retryDelay = 1000;
      
      if (response.data.success === false) {
        throw new Error(response.data.error || 'Request failed');
      }
      
      return {
        ...response.data,
        isServiceAvailable: true
      };
    } catch (error) {
      console.error(`❌ Render API Error (${endpoint}):`, error);
      
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          console.log(`📍 Render endpoint ${endpoint} not found (404) - this is expected for some endpoints`);
          return {
            success: false,
            error: `Endpoint ${endpoint} not available on Render backend`,
            isServiceAvailable: true
          };
        }
        
        if (error.response?.status === 401) {
          console.error('Authorization failed - likely missing Supabase env vars on Render');
          
          this.useDirectSync = true;
          
          return {
            success: false,
            error: 'Backend authorization failed. Using direct mode.',
            isServiceAvailable: false
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
        isServiceAvailable: false
      };
    }
  }

  async validateCredentials(credentials: any): Promise<any> {
    console.log('🔄 Starting Zoom credential validation...');

    try {
      // First try Supabase Edge Function
      console.log('📡 Attempting validation with Supabase Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('validate-zoom-credentials', {
        body: {
          account_id: credentials.account_id,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret
        }
      });

      if (error) {
        console.error('Supabase Edge Function error:', error);
        throw error;
      }

      if (data?.success) {
        console.log('✅ Validation successful via Supabase Edge Function');
        return {
          success: true,
          connection: data.connection,
          message: data.message || 'Credentials validated successfully'
        };
      }

      throw new Error(data?.error || 'Validation failed');

    } catch (supabaseError) {
      console.error('Supabase validation failed:', supabaseError);
      
      // Since Render backend doesn't have the validate-credentials endpoint,
      // we'll return a more helpful error message
      return {
        success: false,
        error: 'Credential validation service is currently unavailable. Please check your Zoom credentials and try again.',
        details: supabaseError instanceof Error ? supabaseError.message : 'Unknown error'
      };
    }
  }

  async healthCheck(): Promise<ApiResponse> {
    return this.makeRequest('/health', 'GET', undefined, true);
  }

  async testConnection(connectionId?: string): Promise<ApiResponse> {
    if (this.useDirectSync) {
      return DirectZoomSync.testConnection(connectionId!);
    }
    
    const endpoint = connectionId 
      ? `/test-connection?connection_id=${connectionId}`
      : '/test-connection';
    return this.makeRequest(endpoint);
  }

  async refreshToken(refreshToken: string, connectionId?: string): Promise<ApiResponse> {
    return this.makeRequest('/refresh-token', 'POST', { 
      refresh_token: refreshToken, 
      connection_id: connectionId 
    });
  }

  async startSync(connectionId: string, syncType: string = 'manual'): Promise<ApiResponse> {
    // Show initial sync message
    toast.loading('Starting sync process...', { id: 'sync-start' });
    
    const result = await this.makeRequest('/start-sync', 'POST', { 
      connection_id: connectionId, 
      sync_type: syncType 
    });
    
    if (result.success) {
      toast.success('Sync started successfully!', { id: 'sync-start' });
    } else {
      toast.dismiss('sync-start');
    }
    
    return result;
  }

  async getSyncProgress(syncId: string): Promise<ApiResponse> {
    return this.makeRequest(`/sync-progress/${syncId}`);
  }

  async cancelSync(syncId: string): Promise<ApiResponse> {
    return this.makeRequest(`/cancel-sync/${syncId}`, 'POST');
  }

  async syncWebinars(connectionId: string, options: any = {}): Promise<ApiResponse> {
    // If direct sync mode is enabled, use it
    if (this.useDirectSync) {
      console.log('Using direct sync mode due to authorization issues');
      return DirectZoomSync.syncWebinars(connectionId);
    }
    
    // Show initial sync message
    toast.loading('Syncing webinars...', { id: 'webinar-sync' });
    
    const result = await this.makeRequest('/sync-webinars', 'POST', { 
      connection_id: connectionId, 
      ...options 
    });
    
    // Check if we need to fallback to direct sync
    if (!result.success && result.error?.includes('Authorization')) {
      console.log('Authorization failed, falling back to direct sync');
      toast.dismiss('webinar-sync');
      this.useDirectSync = true;
      return DirectZoomSync.syncWebinars(connectionId);
    }
    
    if (result.success) {
      toast.success('Webinars synced successfully!', { id: 'webinar-sync' });
    } else {
      toast.dismiss('webinar-sync');
    }
    
    return result;
  }

  async runPerformanceTest(connectionId: string): Promise<ApiResponse> {
    return this.makeRequest('/performance-test', 'POST', { connection_id: connectionId });
  }

  async disconnectAccount(connectionId: string): Promise<ApiResponse> {
    return this.makeRequest('/disconnect', 'POST', { connection_id: connectionId });
  }

  // Helper method to get service status
  getServiceStatus(): { healthy: boolean; lastCheck: number; directSyncMode: boolean } {
    return {
      healthy: this.serviceHealthy,
      lastCheck: this.lastHealthCheck,
      directSyncMode: this.useDirectSync
    };
  }

  // Force a health check
  async forceHealthCheck(): Promise<boolean> {
    this.lastHealthCheck = 0; // Reset cache
    return this.checkServiceHealth();
  }

  // New method to pre-warm the service
  async preWarmService(): Promise<void> {
    console.log('Pre-warming Render service...');
    toast.info('Preparing sync service...', { duration: 3000 });
    
    const isHealthy = await this.checkServiceHealth();
    if (!isHealthy) {
      // Try to wake it up
      await this.waitForService();
    }
  }

  // Reset to try Render backend again
  resetDirectSyncMode(): void {
    this.useDirectSync = false;
    toast.info('Switching back to Render backend mode');
  }
}

// Export as both named and default for backward compatibility
export const RenderZoomService = new RenderZoomServiceClass();
export default RenderZoomService;
