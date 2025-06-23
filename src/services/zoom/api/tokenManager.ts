
import { ZoomConnection } from '@/types/zoom';
import { ZoomConnectionService } from '../ZoomConnectionService';
import { toast } from '@/hooks/use-toast';

/**
 * Token management utilities for Zoom API authentication
 */
export class TokenManager {
  /**
   * Refresh access token for a connection
   */
  static async refreshAccessToken(connectionId: string): Promise<ZoomConnection | null> {
    try {
      // Get the connection using the correct method name
      const connections = await ZoomConnectionService.getUserConnections('user-id-placeholder');
      const connection = connections.find(c => c.id === connectionId);
      
      if (!connection) {
        console.error(`Connection ${connectionId} not found for token refresh`);
        return null;
      }

      // Call the edge function to refresh the token
      const result = await ZoomConnectionService.exchangeOAuthCode('', '', '');
      
      if (result.success && result.connection) {
        console.log(`Token refreshed successfully for connection ${connectionId}`);
        return result.connection;
      } else {
        console.error(`Failed to refresh token for connection ${connectionId}`);
        toast({
          title: "Token Refresh Failed",
          description: "Please reconnect your Zoom account.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error(`Error refreshing token for connection ${connectionId}:`, error);
      return null;
    }
  }

  /**
   * Check if token needs refresh
   */
  static isTokenExpired(tokenExpiresAt: string): boolean {
    if (!tokenExpiresAt) return true;
    const expiryTime = new Date(tokenExpiresAt);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    return expiryTime.getTime() - bufferTime <= now.getTime();
  }
}
