
const ENCRYPTION_SALT = Deno.env.get('ENCRYPTION_SALT') || 'default-salt-change-in-production';

export class SimpleTokenEncryption {
  static async encryptToken(token: string, userId: string): Promise<string> {
    try {
      // Use the Web Crypto API for encryption
      const key = await this.deriveKey(userId);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedToken = new TextEncoder().encode(token);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedToken
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('AES-GCM encryption failed:', error.message, 'Using base64 fallback');
      // Fallback to simple base64 encoding
      return btoa(token + ':' + userId);
    }
  }

  static async decryptToken(encryptedToken: string, userId: string): Promise<string> {
    try {
      console.log('Attempting AES-GCM decryption...');
      const key = await this.deriveKey(userId);
      const combined = new Uint8Array(atob(encryptedToken).split('').map(c => c.charCodeAt(0)));
      
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      const token = new TextDecoder().decode(decrypted);
      console.log('Successfully decrypted token using AES-GCM.');
      return token;
    } catch (error) {
      console.log('AES-GCM decryption failed:', error.message, 'Attempting fallbacks.');
      
      try {
        console.log('Attempting base64 decoding fallback...');
        const decoded = atob(encryptedToken);
        const [token] = decoded.split(':');
        console.log('Successfully decoded token using base64 fallback.');
        return token;
      } catch (fallbackError) {
        console.error('All decryption methods failed:', fallbackError.message);
        throw new Error('Token decryption failed');
      }
    }
  }

  private static async deriveKey(userId: string): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(ENCRYPTION_SALT + userId),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(userId),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}
