
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
      const keyMaterial = new TextEncoder().encode(userKey);
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
}
