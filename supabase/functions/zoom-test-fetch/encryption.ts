const IV_LENGTH = 12; // Match frontend IV length
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_SALT') || 'default-salt-is-not-secure-change-me';

export class SimpleTokenEncryption {
  private static async getKey(salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(ENCRYPTION_KEY + salt);
    
    const keyBuffer = await crypto.subtle.digest('SHA-256', keyMaterial);
    
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async decryptToken(encryptedToken: string, salt: string): Promise<string> {
    try {
      console.log('Attempting AES-GCM decryption with standardized method...');
      
      // First check if this looks like a Server-to-Server placeholder token
      if (this.isServerToServerPlaceholder(encryptedToken)) {
        console.log('Detected Server-to-Server placeholder token');
        return this.decryptServerToServerToken(encryptedToken);
      }

      // Try AES-GCM decryption with correct IV length and key derivation
      const key = await this.getKey(salt);
      const encryptedBytes = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));

      if (encryptedBytes.length < IV_LENGTH) {
        throw new Error('Invalid encrypted token format - too short');
      }

      const iv = encryptedBytes.slice(0, IV_LENGTH);
      const encrypted = encryptedBytes.slice(IV_LENGTH);

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted
      );
      
      const decryptedText = new TextDecoder().decode(decrypted);
      console.log('Successfully decrypted token using AES-GCM.');
      
      // Validate token format
      if (this.isValidZoomToken(decryptedText)) {
        return decryptedText;
      } else {
        console.warn('Decrypted token does not appear to be a valid Zoom token format');
        throw new Error('Invalid token format after decryption');
      }
      
    } catch(e) {
      console.log(`AES-GCM decryption failed: ${e.message}. Attempting fallbacks.`);
      
      try {
        console.log('Attempting base64 decoding fallback...');
        const decoded = atob(encryptedToken);
        
        if (this.isValidZoomToken(decoded)) {
          console.log('Successfully decoded token using base64 fallback.');
          return decoded;
        } else {
          throw new Error('Base64 decoded content is not a valid token');
        }
      } catch (e2) {
        console.log(`Base64 decoding failed: ${e2.message}. Assuming plain text token.`);
        
        // Last resort - check if the original string is already a valid token
        if (this.isValidZoomToken(encryptedToken)) {
          console.log('Original string appears to be a valid plain text token.');
          return encryptedToken;
        }
        
        throw new Error('All decryption methods failed - token appears corrupted');
      }
    }
  }

  /**
   * Check if this is a Server-to-Server placeholder token
   */
  private static isServerToServerPlaceholder(encryptedToken: string): boolean {
    try {
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
      console.log('Extracted Server-to-Server token from placeholder format');
      return token;
    } catch (error) {
      console.error('Failed to decrypt Server-to-Server token:', error);
      throw new Error('Invalid Server-to-Server token format');
    }
  }

  /**
   * Validate that a string looks like a valid Zoom access token
   */
  private static isValidZoomToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Zoom tokens are typically JWT-like or have specific patterns
    // They should be at least 20 characters and contain alphanumeric + special chars
    if (token.length < 20) {
      console.log(`Token too short: ${token.length} characters`);
      return false;
    }
    
    // Check for common Zoom token patterns
    const hasValidChars = /^[A-Za-z0-9._-]+$/.test(token);
    if (!hasValidChars) {
      console.log('Token contains invalid characters for Zoom token format');
      return false;
    }
    
    // JWT tokens typically have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length === 3) {
      console.log('Token appears to be JWT format');
      return true;
    }
    
    // Other Zoom token formats (like Server-to-Server) may not be JWT
    // Accept if it's long enough and has valid characters
    if (token.length >= 30) {
      console.log('Token appears to be valid non-JWT format');
      return true;
    }
    
    console.log(`Token validation failed: length=${token.length}, format check failed`);
    return false;
  }
}
