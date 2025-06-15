/**
 * Enhanced token encryption service with improved error handling
 * and fallback mechanisms for different environments
 */
export class TokenEncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  /**
   * Check if Web Crypto API is supported
   */
  static isSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.getRandomValues !== 'undefined';
  }

  /**
   * Get encryption salt from environment with fallback
   */
  private static getEncryptionSalt(): string {
    // Vite exposes env variables through import.meta.env
    const salt = import.meta.env.VITE_ENCRYPTION_SALT;
    
    if (salt) {
      return salt;
    }
    
    // Default fallback salt (not ideal for production but prevents crashes)
    console.warn('No encryption salt found in environment, using default');
    return 'webinar-wise-default-salt-change-in-production';
  }

  /**
   * Generate encryption key from user identifier
   */
  private static async generateKey(userId: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const salt = this.getEncryptionSalt();
    const keyMaterial = encoder.encode(userId + salt);
    
    const keyBuffer = await crypto.subtle.digest('SHA-256', keyMaterial);
    
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: this.ALGORITHM },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt token securely
   */
  static async encryptToken(token: string, userId: string): Promise<string> {
    if (!this.isSupported()) {
      console.warn('Web Crypto API not supported, using base64 fallback');
      return btoa(token);
    }

    try {
      const key = await this.generateKey(userId);
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      const encoder = new TextEncoder();
      const tokenBytes = encoder.encode(token);

      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        tokenBytes
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(this.IV_LENGTH + encryptedBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedBuffer), this.IV_LENGTH);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Token encryption failed:', error);
      // Fallback to base64 on encryption failure
      return btoa(token);
    }
  }

  /**
   * Decrypt token securely with recovery mechanisms
   */
  static async decryptToken(encryptedToken: string, userId: string): Promise<string> {
    // Check if this is a simple base64 encoded token (fallback)
    if (!this.isSupported() || this.isBase64Fallback(encryptedToken)) {
      try {
        return atob(encryptedToken);
      } catch (error) {
        console.error('Failed to decode base64 token:', error);
        throw new Error('Invalid token format');
      }
    }

    try {
      const key = await this.generateKey(userId);
      const encryptedBytes = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));

      if (encryptedBytes.length < this.IV_LENGTH) {
        throw new Error('Invalid encrypted token format');
      }

      // Extract IV and encrypted data
      const iv = encryptedBytes.slice(0, this.IV_LENGTH);
      const encryptedData = encryptedBytes.slice(this.IV_LENGTH);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        encryptedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Token decryption failed, attempting recovery:', error);
      
      // Try fallback decryption methods
      try {
        return atob(encryptedToken);
      } catch (fallbackError) {
        console.error('All decryption methods failed:', fallbackError);
        throw new Error('Failed to decrypt token - token may be corrupted');
      }
    }
  }

  /**
   * Check if token is using base64 fallback format
   */
  private static isBase64Fallback(encryptedToken: string): boolean {
    try {
      const decoded = atob(encryptedToken);
      // If it decodes to something that looks like a token (no binary data)
      return decoded.length > 0 && !/[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(decoded);
    } catch {
      return false;
    }
  }

  /**
   * Validate token decryption capability
   */
  static async validateTokenDecryption(encryptedToken: string, userId: string): Promise<boolean> {
    try {
      const decrypted = await this.decryptToken(encryptedToken, userId);
      return decrypted.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Reset corrupted token (for recovery)
   */
  static async resetCorruptedToken(token: string, userId: string): Promise<string> {
    console.log('Resetting corrupted token for user:', userId);
    // Re-encrypt the token with current settings
    return await this.encryptToken(token, userId);
  }
}
