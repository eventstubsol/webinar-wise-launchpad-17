
import type { ZoomConnection } from '@/types/zoom';

export enum TokenStatus {
  VALID = 'VALID',
  ACCESS_EXPIRED = 'ACCESS_EXPIRED',
  REFRESH_EXPIRED = 'REFRESH_EXPIRED', 
  INVALID = 'INVALID',
  NO_CONNECTION = 'NO_CONNECTION',
}

/**
 * Simplified token utilities - no encryption, plain text tokens only
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
   * Get the status of a connection's token
   */
  static getTokenStatus(connection: ZoomConnection | null): TokenStatus {
    if (!connection) {
      return TokenStatus.NO_CONNECTION;
    }
    
    if (connection.connection_status === 'error' || connection.connection_status === 'revoked') {
      return TokenStatus.INVALID;
    }

    if (!connection.access_token || !connection.refresh_token) {
      return TokenStatus.INVALID;
    }
    
    if (connection.connection_status === 'expired') {
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
}
