
import { TokenEncryptionService } from '../security/TokenEncryptionService';

/**
 * Utility functions for token management and encryption with recovery mechanisms
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
    try {
      return await TokenEncryptionService.encryptToken(token, userId);
    } catch (error) {
      console.error('Token encryption failed:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypt token with comprehensive error handling and recovery
   */
  static async decryptToken(encryptedToken: string, userId: string): Promise<string> {
    // Check if this is a Server-to-Server placeholder token first
    if (this.isServerToServerPlaceholder(encryptedToken)) {
      return this.decryptServerToServerToken(encryptedToken);
    }

    try {
      return await TokenEncryptionService.decryptToken(encryptedToken, userId);
    } catch (error) {
      console.error('Token decryption failed, attempting recovery:', error);
      
      // If decryption fails, this might be a corrupted token
      // We'll return a special error that the calling code can handle
      throw new TokenDecryptionError('Token decryption failed - connection may need to be re-established', 'DECRYPTION_FAILED');
    }
  }

  /**
   * Validate that token can be decrypted successfully
   */
  static async validateTokenDecryption(encryptedToken: string, userId: string): Promise<boolean> {
    try {
      await this.decryptToken(encryptedToken, userId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Attempt to recover a corrupted token
   */
  static async recoverCorruptedToken(plainTextToken: string, userId: string): Promise<string> {
    try {
      return await TokenEncryptionService.resetCorruptedToken(plainTextToken, userId);
    } catch (error) {
      console.error('Token recovery failed:', error);
      throw new Error('Failed to recover corrupted token');
    }
  }
}

/**
 * Custom error class for token decryption failures
 */
export class TokenDecryptionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'TokenDecryptionError';
  }
}
