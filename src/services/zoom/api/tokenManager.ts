
import { supabase } from '@/integrations/supabase/client';

export interface TokenRefreshResult {
  success: boolean;
  connection?: any;
  error?: string;
}

export class ZoomTokenManager {
  static async refreshAccessToken(connectionId: string): Promise<TokenRefreshResult> {
    try {
      // Get connection details
      const { data: connection, error: fetchError } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (fetchError || !connection) {
        return { success: false, error: 'Connection not found' };
      }

      // Call edge function to refresh token
      const { data, error } = await supabase.functions.invoke('zoom-refresh-token', {
        body: { connectionId }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, connection: data.connection };
    } catch (error) {
      console.error('Token refresh failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async validateToken(connectionId: string): Promise<boolean> {
    try {
      const { data: connection, error } = await supabase
        .from('zoom_connections')
        .select('token_expires_at')
        .eq('id', connectionId)
        .single();

      if (error || !connection) {
        return false;
      }

      const expiresAt = new Date(connection.token_expires_at);
      const now = new Date();
      
      // Consider token invalid if it expires within 5 minutes
      return expiresAt.getTime() > now.getTime() + (5 * 60 * 1000);
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  static async ensureValidToken(connectionId: string): Promise<TokenRefreshResult> {
    const isValid = await this.validateToken(connectionId);
    
    if (isValid) {
      const { data: connection, error } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (error) {
        return { success: false, error: 'Connection not found' };
      }

      return { success: true, connection };
    }

    return this.refreshAccessToken(connectionId);
  }
}

// Export as both named and default for backward compatibility
export const TokenManager = ZoomTokenManager;
export default ZoomTokenManager;
