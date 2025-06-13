
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
      const connection = await ZoomConnectionService.getConnection(connectionId);
      if (!connection) {
        console.error(`Connection ${connectionId} not found for token refresh`);
        return null;
      }

      // Use existing refresh token logic from ZoomConnectionService
      const refreshedConnection = await ZoomConnectionService.refreshToken(connection);
      
      if (refreshedConnection) {
        console.log(`Token refreshed successfully for connection ${connectionId}`);
        return refreshedConnection;
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
    return ZoomConnectionService.isTokenExpired(tokenExpiresAt);
  }
}
