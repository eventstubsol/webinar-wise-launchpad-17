
/**
 * Utility functions for token management and encryption
 */
export class TokenUtils {
  /**
   * Check if a token has expired
   * For Server-to-Server connections, we use a much longer expiry (1 year)
   * since they don't have traditional token expiration
   */
  static isTokenExpired(expiresAt: string): boolean {
    if (!expiresAt) return true;
    
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    return currentTime >= (expirationTime - bufferTime);
  }

  /**
   * Encrypt token (placeholder implementation)
   * In a real implementation, this would use proper encryption
   */
  static encryptToken(token: string): string {
    // For Server-to-Server connections, we often don't store actual tokens
    // This is a placeholder for when encryption is needed
    return token;
  }

  /**
   * Decrypt token (placeholder implementation)
   * In a real implementation, this would use proper decryption
   */
  static decryptToken(encryptedToken: string): string {
    // For Server-to-Server connections, we often don't store actual tokens
    // This is a placeholder for when decryption is needed
    return encryptedToken;
  }
}
