
import axios, { AxiosError } from 'axios';
import { supabase } from '@/integrations/supabase/client';

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

    const isHealthy = await this.checkServiceHealth();
    
    if (isHealthy) {
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
        return {
          success: false,
          error: 'Render service is currently unavailable. The service may be starting up or experiencing issues. Please wait a few minutes and try again.',
          isServiceAvailable: false,
          retryAfter: 60 // Suggest retry after 1 minute
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
        timeout: endpoint === '/health' ? 10000 : 30000,
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
        // Handle specific error cases
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.serviceHealthy = false;
          return {
            success: false,
            error: 'Cannot connect to Render service. The service may be offline or the URL may be incorrect.',
            isServiceAvailable: false,
            retryAfter: 60
          };
        }
        
        if (error.code === 'ECONNABORTED' || error.code === 'TIMEOUT') {
          return {
            success: false,
            error: 'Request timed out. The service may be slow to respond or starting up.',
            isServiceAvailable: false,
            retryAfter: 30
          };
        }
        
        if (error.response?.status === 503) {
          this.serviceHealthy = false;
          return {
            success: false,
            error: 'Render service is starting up. Please wait a moment and try again.',
            isServiceAvailable: false,
            retryAfter: 30
          };
        }

        if (error.response?.status === 500) {
          return {
            success: false,
            error: 'Internal server error occurred. This may be due to missing environment variables or database connection issues on the server.',
            isServiceAvailable: true // Service is responding but has internal issues
          };
        }

        if (error.response?.status === 401) {
          return {
            success: false,
            error: 'Authentication failed. Please log out and log back in.',
            isServiceAvailable: true
          };
        }

        if (error.response?.status === 403) {
          return {
            success: false,
            error: 'Access denied. You do not have permission to access this resource.',
            isServiceAvailable: true
          };
        }
        
        return {
          success: false,
          error: error.response?.data?.error || error.message || 'Network error occurred',
          isServiceAvailable: error.response?.status ? true : false
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
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
    return this.makeRequest('/start-sync', 'POST', { 
      connection_id: connectionId, 
      sync_type: syncType 
    });
  }

  async getSyncProgress(syncId: string): Promise<ApiResponse> {
    return this.makeRequest(`/sync-progress/${syncId}`);
  }

  async cancelSync(syncId: string): Promise<ApiResponse> {
    return this.makeRequest(`/cancel-sync/${syncId}`, 'POST');
  }

  async syncWebinars(connectionId: string, options: any = {}): Promise<ApiResponse> {
    return this.makeRequest('/sync-webinars', 'POST', { 
      connection_id: connectionId, 
      ...options 
    });
  }

  async runPerformanceTest(connectionId: string): Promise<ApiResponse> {
    return this.makeRequest('/performance-test', 'POST', { connection_id: connectionId });
  }

  async disconnectAccount(connectionId: string): Promise<ApiResponse> {
    return this.makeRequest('/disconnect', 'POST', { connection_id: connectionId });
  }

  // Helper method to get service status
  getServiceStatus(): { healthy: boolean; lastCheck: number } {
    return {
      healthy: this.serviceHealthy,
      lastCheck: this.lastHealthCheck
    };
  }

  // Force a health check
  async forceHealthCheck(): Promise<boolean> {
    this.lastHealthCheck = 0; // Reset cache
    return this.checkServiceHealth();
  }
}

export const RenderZoomService = new RenderZoomServiceClass();
