
import type { ZoomConnection } from '@/types/zoom';
import { ConnectionStatus } from '@/types/zoom';

export enum TokenStatus {
  VALID = 'VALID',
  ACCESS_EXPIRED = 'ACCESS_EXPIRED',
  REFRESH_EXPIRED = 'REFRESH_EXPIRED', 
  INVALID = 'INVALID',
  NO_CONNECTION = 'NO_CONNECTION',
}

/**
 * Token utilities with proper Server-to-Server OAuth support
 */
export class TokenUtils {
  /**
   * Check if a token has expired
   */
  static isTokenExpired(expiresAt: string): boolean {
    if (!expiresAt) return true;
    
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    return currentTime >= (expirationTime - bufferTime);
  }

  /**
   * Check if this is a Server-to-Server connection
   */
  static isServerToServerConnection(connection: ZoomConnection): boolean {
    return connection.connection_type === 'server_to_server' ||
           connection.zoom_account_type === 'Server-to-Server' ||
           (connection.access_token && connection.access_token.includes('SERVER_TO_SERVER')) ||
           !!(connection.client_id && connection.client_secret && connection.account_id);
  }

  /**
   * Get the status of a connection's token with proper Server-to-Server handling
   */
  static getTokenStatus(connection: ZoomConnection | null): TokenStatus {
    if (!connection) {
      return TokenStatus.NO_CONNECTION;
    }
    
    if (connection.connection_status === ConnectionStatus.ERROR || connection.connection_status === ConnectionStatus.REVOKED) {
      return TokenStatus.INVALID;
    }

    // For Server-to-Server connections, we have different validation logic
    if (this.isServerToServerConnection(connection)) {
      // Server-to-Server requires client credentials, not traditional tokens
      if (!connection.client_id || !connection.client_secret || !connection.account_id) {
        return TokenStatus.INVALID;
      }

      // For Server-to-Server, if we have valid credentials, always return VALID
      // Token refresh happens silently in the background without user intervention
      return TokenStatus.VALID;
    }

    // Traditional OAuth flow validation
    if (!connection.access_token || !connection.refresh_token) {
      return TokenStatus.INVALID;
    }
    
    if (connection.connection_status === ConnectionStatus.EXPIRED) {
      return TokenStatus.REFRESH_EXPIRED;
    }

    if (this.isTokenExpired(connection.token_expires_at)) {
      return TokenStatus.ACCESS_EXPIRED;
    }

    return TokenStatus.VALID;
  }

  /**
   * Validate that a token is a valid string
   */
  static isValidToken(token: string): boolean {
    return typeof token === 'string' && token.length > 10;
  }

  /**
   * Check if this is a Server-to-Server placeholder token
   */
  static isServerToServerToken(token: string): boolean {
    return token.includes('SERVER_TO_SERVER_');
  }

  /**
   * Check if connection needs token refresh
   */
  static needsTokenRefresh(connection: ZoomConnection): boolean {
    // For Server-to-Server connections, check if token is expired but don't require user intervention
    if (this.isServerToServerConnection(connection)) {
      return this.isTokenExpired(connection.token_expires_at);
    }
    
    // For OAuth connections, only refresh if access token is expired but refresh token is valid
    const status = this.getTokenStatus(connection);
    return status === TokenStatus.ACCESS_EXPIRED;
  }

  /**
   * Check if connection can be refreshed
   */
  static canRefreshToken(connection: ZoomConnection): boolean {
    if (this.isServerToServerConnection(connection)) {
      // Server-to-Server can always refresh with client credentials
      return !!(connection.client_id && connection.client_secret && connection.account_id);
    }
    
    // Traditional OAuth needs valid refresh token
    return !!(connection.refresh_token && connection.connection_status !== ConnectionStatus.EXPIRED);
  }
}
