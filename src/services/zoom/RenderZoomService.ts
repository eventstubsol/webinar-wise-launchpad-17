import axios, { AxiosError } from 'axios';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DirectZoomSync } from './DirectZoomSyncService';
import { getUserFriendlyError, formatErrorForDisplay } from '@/lib/errorHandler';

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
  private healthCheckInterval: number = 300000; // 5 minutes (longer interval since service is always up)
  private maxRetries: number = 3;
  private retryDelay: number = 500; // 500ms (faster retries since no cold starts)
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
        timeout: 5000, // 5 second timeout (faster on Starter plan)
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
      toast.loading('Connecting to sync service...', {
        id: 'service-wakeup',
        duration: 10000
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
        
        // Show user-friendly error message
        const userError = getUserFriendlyError('Service unavailable - sleeping or tier limitation');
        toast.error(formatErrorForDisplay(userError), { duration: 10000 });
        
        return {
          success: false,
          error: 'Service temporarily unavailable. Please try again in a moment.',
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
        timeout: endpoint === '/health' ? 5000 : 30000, // 30 seconds (reasonable for Starter plan)
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
        // Handle 401 Authorization error specially
        if (error.response?.status === 401) {
          console.error('Authorization failed - likely missing Supabase env vars on Render');
          
          const authError = getUserFriendlyError('Authorization failed');
          toast.error(formatErrorForDisplay(authError), { duration: 10000 });
          
          // Enable direct sync mode
          this.useDirectSync = true;
          
          return {
            success: false,
            error: 'Authentication issue detected. Please try again.',
            isServiceAvailable: true
          };
        }
        
        // Handle other specific error cases
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.serviceHealthy = false;
          
          const connectionError = getUserFriendlyError('Cannot connect to service');
          toast.error(formatErrorForDisplay(connectionError), { duration: 10000 });
          
          return {
            success: false,
            error: 'Unable to connect to the sync service. Please try again.',
            isServiceAvailable: false,
            retryAfter: 60
          };
        }
        
        if (error.code === 'ECONNABORTED' || error.code === 'TIMEOUT') {
          const timeoutError = getUserFriendlyError('Request timeout');
          toast.error(formatErrorForDisplay(timeoutError));
          
          return {
            success: false,
            error: 'Request timed out. Please try again.',
            isServiceAvailable: false,
            retryAfter: 30
          };
        }
        
        if (error.response?.status === 503) {
          this.serviceHealthy = false;
          toast.loading('Service is starting up...', { duration: 5000 });
          
          return {
            success: false,
            error: 'Service is starting up. Please wait a moment and try again.',
            isServiceAvailable: false,
            retryAfter: 30
          };
        }

        if (error.response?.status === 500) {
          const serverError = getUserFriendlyError('Internal server error');
          toast.error(formatErrorForDisplay(serverError));
          
          return {
            success: false,
            error: 'Something went wrong on our end. Please try again later.',
            isServiceAvailable: true
          };
        }

        if (error.response?.status === 403) {
          toast.error('Access denied. You do not have permission for this action.');
          
          return {
            success: false,
            error: 'Access denied. You do not have permission to access this resource.',
            isServiceAvailable: true
          };
        }
        
        // Generic error
        const errorMessage = error.response?.data?.error || error.message || 'Network error occurred';
        const userError = getUserFriendlyError(errorMessage);
        toast.error(formatErrorForDisplay(userError));
        
        return {
          success: false,
          error: errorMessage,
          isServiceAvailable: error.response?.status ? true : false
        };
      }
      
      // Non-Axios error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const userError = getUserFriendlyError(errorMessage);
      toast.error(formatErrorForDisplay(userError));
      
      return {
        success: false,
        error: errorMessage,
        isServiceAvailable: false
      };
    }
  }

  async healthCheck(): Promise<ApiResponse> {
    return this.makeRequest('/health', 'GET', undefined, true);
  }

  async validateCredentials(credentials: ValidationCredentialsPayload): Promise<ApiResponse> {
    return this.makeRequest('/validate-credentials', 'POST', credentials);
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
    toast.info('Preparing service...', { duration: 3000 });
    
    const isHealthy = await this.checkServiceHealth();
    if (!isHealthy) {
      // Try to wake it up
      await this.waitForService();
    }
  }

  // Reset to try Render backend again
  resetDirectSyncMode(): void {
    this.useDirectSync = false;
    toast.info('Switching to standard sync mode');
  }
}

export const RenderZoomService = new RenderZoomServiceClass();
