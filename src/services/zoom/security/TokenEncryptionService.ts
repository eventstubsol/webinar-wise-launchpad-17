
import { supabase } from '@/integrations/supabase/client';

/**
 * Secure token encryption service using Web Crypto API
 * Uses PBKDF2 for key derivation and AES-GCM for encryption
 */
export class TokenEncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly SALT_LENGTH = 16; // 128 bits
  private static readonly ITERATIONS = 100000; // PBKDF2 iterations

  /**
   * Derive encryption key from user ID and auth session
   */
  private static async deriveKey(userId: string, salt: Uint8Array): Promise<CryptoKey> {
    // Get user session for additional entropy
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User session required for key derivation');
    }

    // Combine user ID and session token for key material
    const keyMaterial = new TextEncoder().encode(userId + session.access_token);
    
    // Import key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive AES key using PBKDF2
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      importedKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt a token for secure storage
   */
  static async encryptToken(token: string, userId: string): Promise<string> {
    try {
      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Derive encryption key
      const key = await this.deriveKey(userId, salt);

      // Encrypt the token
      const tokenBytes = new TextEncoder().encode(token);
      const encryptedBytes = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        tokenBytes
      );

      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(
        this.SALT_LENGTH + this.IV_LENGTH + encryptedBytes.byteLength
      );
      combined.set(salt, 0);
      combined.set(iv, this.SALT_LENGTH);
      combined.set(new Uint8Array(encryptedBytes), this.SALT_LENGTH + this.IV_LENGTH);

      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Token encryption failed:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypt a stored token
   */
  static async decryptToken(encryptedToken: string, userId: string): Promise<string> {
    try {
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedToken)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      // Extract salt, IV, and encrypted data
      const salt = combined.slice(0, this.SALT_LENGTH);
      const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const encryptedData = combined.slice(this.SALT_LENGTH + this.IV_LENGTH);

      // Derive decryption key
      const key = await this.deriveKey(userId, salt);

      // Decrypt the data
      const decryptedBytes = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encryptedData
      );

      // Convert back to string
      return new TextDecoder().decode(decryptedBytes);
    } catch (error) {
      console.error('Token decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Rotate encryption for all user tokens (sign out and back in)
   */
  static async rotateEncryptionKey(userId: string): Promise<void> {
    try {
      // Get all user connections
      const { data: connections, error } = await supabase
        .from('zoom_connections')
        .select('id, access_token, refresh_token')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch connections: ${error.message}`);
      }

      if (!connections || connections.length === 0) {
        return; // No connections to rotate
      }

      // Re-encrypt all tokens with new key derivation
      for (const connection of connections) {
        // Decrypt with current session
        const accessToken = await this.decryptToken(connection.access_token, userId);
        const refreshToken = await this.decryptToken(connection.refresh_token, userId);

        // Re-encrypt with new key derivation (will use current session)
        const newEncryptedAccess = await this.encryptToken(accessToken, userId);
        const newEncryptedRefresh = await this.encryptToken(refreshToken, userId);

        // Update in database
        const { error: updateError } = await supabase
          .from('zoom_connections')
          .update({
            access_token: newEncryptedAccess,
            refresh_token: newEncryptedRefresh,
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);

        if (updateError) {
          console.error(`Failed to rotate key for connection ${connection.id}:`, updateError);
        }
      }

      console.log(`Encryption key rotation completed for user ${userId}`);
    } catch (error) {
      console.error('Key rotation failed:', error);
      throw new Error('Failed to rotate encryption key');
    }
  }

  /**
   * Validate if a token can be decrypted (health check)
   */
  static async validateTokenDecryption(encryptedToken: string, userId: string): Promise<boolean> {
    try {
      await this.decryptToken(encryptedToken, userId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Web Crypto API is available
   */
  static isSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.getRandomValues !== 'undefined';
  }
}
