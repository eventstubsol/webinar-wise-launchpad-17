
import axios, { AxiosError } from 'axios';

// Update this URL after deploying to Render.com
// Replace 'your-service-name' with your actual Render service name
const RENDER_API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-service-name.onrender.com'
  : 'https://zoom-auth-api-latest.onrender.com'; // Fallback for development

interface ValidationCredentialsPayload {
  account_id: string;
  client_id: string;
  client_secret: string;
  user_id?: string;
}

// Enhanced ApiResponse interface with all expected properties
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  // Sync-specific properties
  syncId?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'no_data';
  progress?: number;
  currentOperation?: string;
  // Connection-specific properties
  connection?: any;
}

class RenderZoomServiceClass {
  private async makeRequest<T = any>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET', 
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      const config = {
        method,
        url: `${RENDER_API_BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          // Add API key header if available in environment
          ...(process.env.RENDER_API_KEY && { 'X-API-Key': process.env.RENDER_API_KEY })
        },
        timeout: 30000, // 30 second timeout
        ...(data && { data })
      };

      console.log(`🚀 Making request to: ${config.url}`);
      
      const response = await axios(config);
      
      if (response.data.success === false) {
        throw new Error(response.data.error || 'Request failed');
      }
      
      return response.data;
    } catch (error) {
      console.error(`❌ Render API Error (${endpoint}):`, error);
      
      if (error instanceof AxiosError) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          return {
            success: false,
            error: 'Render service is not accessible. Please check if the backend is deployed and running.'
          };
        }
        
        if (error.response?.status === 503) {
          return {
            success: false,
            error: 'Render service is currently starting up. Please wait a moment and try again.'
          };
        }
        
        return {
          success: false,
          error: error.response?.data?.error || error.message || 'Network error occurred'
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async healthCheck(): Promise<ApiResponse> {
    return this.makeRequest('/health');
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
}

export const RenderZoomService = new RenderZoomServiceClass();
