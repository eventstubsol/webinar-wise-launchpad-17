
import { TokenEncryptionService } from '../security/TokenEncryptionService';

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
   * Encrypt token using secure encryption service
   */
  static async encryptToken(token: string, userId: string): Promise<string> {
    // Check if Web Crypto API is available
    if (!TokenEncryptionService.isSupported()) {
      console.warn('Web Crypto API not supported, falling back to base64');
      return btoa(token); // Fallback for unsupported environments
    }

    try {
      return await TokenEncryptionService.encryptToken(token, userId);
    } catch (error) {
      console.error('Secure encryption failed, falling back to base64:', error);
      return btoa(token); // Fallback on encryption failure
    }
  }

  /**
   * Decrypt token using secure encryption service
   */
  static async decryptToken(encryptedToken: string, userId: string): Promise<string> {
    // Check if Web Crypto API is available
    if (!TokenEncryptionService.isSupported()) {
      try {
        return atob(encryptedToken); // Fallback for unsupported environments
      } catch (error) {
        console.error('Base64 decoding failed:', error);
        throw new Error('Failed to decrypt token');
      }
    }

    try {
      return await TokenEncryptionService.decryptToken(encryptedToken, userId);
    } catch (error) {
      // Try fallback base64 decoding for legacy tokens
      try {
        console.warn('Secure decryption failed, trying base64 fallback');
        return atob(encryptedToken);
      } catch (fallbackError) {
        console.error('Both secure and fallback decryption failed');
        throw new Error('Failed to decrypt token');
      }
    }
  }

  /**
   * Rotate encryption key for user tokens
   */
  static async rotateEncryptionKey(userId: string): Promise<void> {
    if (!TokenEncryptionService.isSupported()) {
      console.warn('Web Crypto API not supported, cannot rotate encryption key');
      return;
    }

    return await TokenEncryptionService.rotateEncryptionKey(userId);
  }

  /**
   * Validate token decryption health
   */
  static async validateTokenDecryption(encryptedToken: string, userId: string): Promise<boolean> {
    if (!TokenEncryptionService.isSupported()) {
      try {
        atob(encryptedToken);
        return true;
      } catch {
        return false;
      }
    }

    return await TokenEncryptionService.validateTokenDecryption(encryptedToken, userId);
  }
}
