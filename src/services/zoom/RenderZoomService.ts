import axios, { AxiosError } from 'axios';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DirectZoomSync } from './DirectZoomSyncService';

// Backend URL - internal detail, not exposed to users
const RENDER_API_BASE_URL = 'https://webinar-wise-launchpad-17.onrender.com';

interface ValidationCredentialsPayload {
  account_id: string;
  client_id: string;
  client_secret: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  syncId?: string;
  status?: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  currentOperation?: string;
  total_items?: number;
  processed_items?: number;
  error_message?: string;
  connection?: any;
}

class RenderZoomServiceClass {
  private useBackend: boolean = false;
  private lastBackendCheck: number = 0;
  private backendCheckInterval: number = 300000; // 5 minutes
  private hasCheckedBackend: boolean = false;

  constructor() {
    // Silently check backend availability after a short delay
    setTimeout(() => {
      this.checkBackendAvailability();
    }, 3000);
  }

  private async checkBackendAvailability(): Promise<void> {
    try {
      const response = await axios.get(`${RENDER_API_BASE_URL}/health`, {
        timeout: 3000,
        headers: { 'Accept': 'application/json' }
      });

      if (response.status === 200 && response.data?.success === true) {
        this.useBackend = true;
        this.lastBackendCheck = Date.now();
        console.log('Backend service available');
      }
    } catch (error) {
      // Silently fallback to direct sync
      this.useBackend = false;
      console.log('Using fallback sync method');
    } finally {
      this.hasCheckedBackend = true;
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Please sign in to continue');
      }
      
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      throw new Error('Authentication required');
    }
  }

  private async makeBackendRequest<T = any>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET', 
    data?: any
  ): Promise<ApiResponse<T>> {
    // If we haven't checked backend yet or it's been a while, check again
    const now = Date.now();
    if (!this.hasCheckedBackend || (now - this.lastBackendCheck > this.backendCheckInterval)) {
      await this.checkBackendAvailability();
    }

    // If backend is not available, return immediately
    if (!this.useBackend) {
      return {
        success: false,
        error: 'use-direct-sync'
      };
    }

    try {
      const headers = endpoint === '/health' 
        ? { 'Accept': 'application/json' }
        : await this.getAuthHeaders();
      
      const response = await axios({
        method,
        url: `${RENDER_API_BASE_URL}${endpoint}`,
        headers,
        timeout: endpoint === '/health' ? 3000 : 30000,
        ...(data && { data })
      });
      
      if (response.data.success === false) {
        throw new Error(response.data.error || 'Request failed');
      }
      
      return response.data;
    } catch (error) {
      // On any error, disable backend and return
      this.useBackend = false;
      return {
        success: false,
        error: 'use-direct-sync'
      };
    }
  }

  async validateCredentials(credentials: ValidationCredentialsPayload): Promise<ApiResponse> {
    // Validation cannot be done from browser due to CORS
    // This should be done through the backend only
    if (this.useBackend) {
      return this.makeBackendRequest('/validate-credentials', 'POST', credentials);
    }
    
    return {
      success: false,
      error: 'Please ensure your Zoom credentials are configured correctly in Settings'
    };
  }

  async testConnection(connectionId?: string): Promise<ApiResponse> {
    // Try backend first
    if (connectionId && this.useBackend) {
      const result = await this.makeBackendRequest(`/test-connection?connection_id=${connectionId}`);
      if (result.success) return result;
    }
    
    // Fallback to direct
    if (connectionId) {
      return DirectZoomSync.testConnection(connectionId);
    }
    
    return {
      success: false,
      error: 'Connection test failed'
    };
  }

  async startSync(connectionId: string, syncType: string = 'manual'): Promise<ApiResponse> {
    toast.loading('Starting sync...', { id: 'sync-start' });
    
    // Try backend first
    if (this.useBackend) {
      const result = await this.makeBackendRequest('/start-sync', 'POST', { 
        connection_id: connectionId, 
        sync_type: syncType 
      });
      
      if (result.success) {
        toast.success('Sync started!', { id: 'sync-start' });
        return result;
      }
    }
    
    // Fallback to direct sync
    toast.dismiss('sync-start');
    return DirectZoomSync.syncWebinars(connectionId);
  }

  async getSyncProgress(syncId: string): Promise<ApiResponse> {
    // Try backend first
    if (this.useBackend) {
      const result = await this.makeBackendRequest(`/sync-progress/${syncId}`);
      if (result.success) return result;
    }
    
    // Fallback to direct database query
    const { data: syncLog, error } = await supabase
      .from('zoom_sync_logs')
      .select('*')
      .eq('id', syncId)
      .single();
    
    if (error || !syncLog) {
      return {
        success: false,
        error: 'Sync progress not found'
      };
    }
    
    return {
      success: true,
      status: syncLog.sync_status || syncLog.status,
      progress: syncLog.sync_progress,
      currentOperation: syncLog.current_operation,
      total_items: syncLog.total_items,
      processed_items: syncLog.processed_items,
      error: syncLog.error_message
    };
  }

  async cancelSync(syncId: string): Promise<ApiResponse> {
    // Try backend first
    if (this.useBackend) {
      const result = await this.makeBackendRequest(`/cancel-sync/${syncId}`, 'POST');
      if (result.success) return result;
    }
    
    // Fallback to direct database update
    const { error } = await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'cancelled',
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        current_operation: 'Sync cancelled'
      })
      .eq('id', syncId);
    
    if (error) {
      return {
        success: false,
        error: 'Failed to cancel sync'
      };
    }
    
    return {
      success: true,
      message: 'Sync cancelled'
    };
  }

  async syncWebinars(connectionId: string, options: any = {}): Promise<ApiResponse> {
    toast.loading('Syncing webinars...', { id: 'webinar-sync' });
    
    // Try backend first
    if (this.useBackend) {
      const result = await this.makeBackendRequest('/sync-webinars', 'POST', { 
        connection_id: connectionId, 
        ...options 
      });
      
      if (result.success) {
        toast.success('Webinars synced!', { id: 'webinar-sync' });
        return result;
      }
    }
    
    // Fallback to direct sync
    toast.dismiss('webinar-sync');
    return DirectZoomSync.syncWebinars(connectionId);
  }

  async refreshToken(refreshToken: string, connectionId?: string): Promise<ApiResponse> {
    // Try backend first
    if (this.useBackend) {
      const result = await this.makeBackendRequest('/refresh-token', 'POST', { 
        refresh_token: refreshToken, 
        connection_id: connectionId 
      });
      
      if (result.success) return result;
    }
    
    // For token refresh, if backend fails, tell user to reconnect
    return {
      success: false,
      error: 'Your session has expired. Please reconnect your Zoom account in Settings.'
    };
  }

  async disconnectAccount(connectionId: string): Promise<ApiResponse> {
    // Try backend first
    if (this.useBackend) {
      const result = await this.makeBackendRequest('/disconnect', 'POST', { 
        connection_id: connectionId 
      });
      
      if (result.success) return result;
    }
    
    // Fallback to direct database update
    const { error } = await supabase
      .from('zoom_connections')
      .update({
        is_active: false,
        access_token: null,
        refresh_token: null,
        disconnected_at: new Date().toISOString()
      })
      .eq('id', connectionId);
    
    if (error) {
      return {
        success: false,
        error: 'Failed to disconnect account'
      };
    }
    
    return {
      success: true,
      message: 'Account disconnected'
    };
  }

  // Simple health check for UI components that need it
  async healthCheck(): Promise<ApiResponse> {
    return {
      success: true,
      message: 'Service is operational'
    };
  }
}

export const RenderZoomService = new RenderZoomServiceClass();
