
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
   * Check if this is a Server-to-Server placeholder token
   */
  private static isServerToServerPlaceholder(encryptedToken: string): boolean {
    try {
      // Server-to-Server tokens from our edge function use simple base64 encoding
      const decoded = atob(encryptedToken);
      return decoded.includes('SERVER_TO_SERVER_');
    } catch {
      return false;
    }
  }

  /**
   * Decrypt Server-to-Server placeholder token
   */
  private static decryptServerToServerToken(encryptedToken: string): string {
    try {
      const decoded = atob(encryptedToken);
      const [token] = decoded.split(':');
      return token;
    } catch (error) {
      console.error('Failed to decrypt Server-to-Server token:', error);
      return 'INVALID_TOKEN';
    }
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
    // Check if this is a Server-to-Server placeholder token first
    if (this.isServerToServerPlaceholder(encryptedToken)) {
      return this.decryptServerToServerToken(encryptedToken);
    }

    // Check if Web Crypto API is available
    if (!TokenEncryptionService.isSupported()) {
      try {
        return atob(encryptedToken);
      } catch (error) {
        console.error('Base64 decode failed:', error);
        throw new Error('Failed to decrypt token - unsupported environment');
      }
    }

    try {
      return await TokenEncryptionService.decryptToken(encryptedToken, userId);
    } catch (error) {
      console.error('Secure decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Rotate encryption for existing tokens (for migration)
   */
  static async rotateEncryptionKey(oldEncryptedToken: string, userId: string): Promise<string> {
    try {
      // First decrypt with old method
      const decrypted = await this.decryptToken(oldEncryptedToken, userId);
      // Then encrypt with new method
      return await this.encryptToken(decrypted, userId);
    } catch (error) {
      console.error('Token rotation failed:', error);
      throw error;
    }
  }

  /**
   * Validate that token can be decrypted successfully
   */
  static async validateTokenDecryption(encryptedToken: string, userId: string): Promise<boolean> {
    try {
      const decrypted = await this.decryptToken(encryptedToken, userId);
      return decrypted.length > 0;
    } catch {
      return false;
    }
  }
}
