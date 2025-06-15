
/**
 * Simple token encryption utilities for Deno environment
 */
export class SimpleTokenEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  static async encryptToken(token: string, userKey: string): Promise<string> {
    try {
      // Generate a simple key from user information
      const keyMaterial = new TextEncoder().encode(userKey + (Deno.env.get('ENCRYPTION_SALT') || 'webinar-wise-salt'));
      const key = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.digest('SHA-256', keyMaterial),
        this.ALGORITHM,
        false,
        ['encrypt']
      );

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Encrypt the token
      const tokenBytes = new TextEncoder().encode(token);
      const encryptedBytes = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        tokenBytes
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(this.IV_LENGTH + encryptedBytes.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedBytes), this.IV_LENGTH);

      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Token encryption failed:', error);
      // Fallback to base64 encoding
      return btoa(token);
    }
  }

  static async decryptToken(encryptedToken: string, userKey: string): Promise<string> {
    try {
      // Try to decrypt assuming it's encrypted
      const keyMaterial = new TextEncoder().encode(userKey + (Deno.env.get('ENCRYPTION_SALT') || 'webinar-wise-salt'));
      const key = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.digest('SHA-256', keyMaterial),
        this.ALGORITHM,
        false,
        ['decrypt']
      );

      const encryptedBytes = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
      
      if (encryptedBytes.length < this.IV_LENGTH) {
        throw new Error('Invalid encrypted token format');
      }

      // Extract IV and encrypted data
      const iv = encryptedBytes.slice(0, this.IV_LENGTH);
      const encryptedData = encryptedBytes.slice(this.IV_LENGTH);

      const decryptedBytes = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        encryptedData
      );

      return new TextDecoder().decode(decryptedBytes);
    } catch (error) {
      console.log('Decryption failed, trying base64 decode:', error.message);
      // Fallback to base64 decoding for non-encrypted tokens
      try {
        return atob(encryptedToken);
      } catch (base64Error) {
        console.error('Base64 decode also failed:', base64Error);
        throw new Error('Failed to decrypt token');
      }
    }
  }
}
