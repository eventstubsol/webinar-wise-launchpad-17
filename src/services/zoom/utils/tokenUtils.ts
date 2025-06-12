
/**
 * Token encryption/decryption utilities for Zoom tokens
 * Uses simple Base64 encoding for demo purposes
 */
export class TokenUtils {
  /**
   * Simple token encryption using Base64 (for demo purposes)
   * In production, this should use proper encryption
   */
  static encryptToken(token: string): string {
    try {
      return btoa(token);
    } catch (error) {
      console.error('Token encryption failed:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Simple token decryption using Base64
   */
  static decryptToken(encryptedToken: string): string {
    try {
      return atob(encryptedToken);
    } catch (error) {
      console.error('Token decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Check if the access token is expired
   */
  static isTokenExpired(tokenExpiresAt: string | null): boolean {
    if (!tokenExpiresAt) return true;
    
    const expirationTime = new Date(tokenExpiresAt);
    const now = new Date();
    
    // Add 5-minute buffer before actual expiration
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (expirationTime.getTime() - bufferTime) <= now.getTime();
  }
}
