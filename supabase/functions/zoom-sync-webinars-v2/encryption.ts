import { Buffer } from "https://deno.land/std@0.168.0/io/buffer.ts";

const IV_LENGTH = 16;

export class SimpleTokenEncryption {
  private static async getKey(salt: string): Promise<CryptoKey> {
    // Use the ENCRYPTION_SALT environment variable, fallback to a default if not set
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_SALT') || 'default-salt-is-not-secure-change-me';
    
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(ENCRYPTION_KEY),
      { name: "HKDF" },
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        salt: new TextEncoder().encode(salt),
        info: new TextEncoder().encode("ZoomTokenEncryption"),
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  static async encryptToken(token: string, salt: string): Promise<string> {
    try {
      const key = await this.getKey(salt);
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
      const encodedToken = new TextEncoder().encode(token);

      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedToken
      );

      const buffer = new Buffer();
      await buffer.write(iv);
      await buffer.write(new Uint8Array(encrypted));
      
      return Buffer.from(buffer.bytes()).toString("base64");
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  }

  static async decryptToken(encryptedToken: string, salt: string): Promise<string> {
    // Handle null or empty tokens
    if (!encryptedToken) {
      throw new Error('No token provided for decryption');
    }

    // Log token format for debugging
    console.log('Token format check:', {
      length: encryptedToken.length,
      startsWithBearer: encryptedToken.startsWith('Bearer '),
      isBase64: /^[A-Za-z0-9+/]+=*$/.test(encryptedToken),
      sample: encryptedToken.substring(0, 20) + '...'
    });

    // Check if it's already a plaintext bearer token
    if (encryptedToken.startsWith('Bearer ')) {
      console.log('Token is already in Bearer format, extracting token');
      return encryptedToken.substring(7);
    }

    // Check if it looks like a JWT (has dots)
    if (encryptedToken.includes('.') && encryptedToken.split('.').length === 3) {
      console.log('Token appears to be a plain JWT');
      return encryptedToken;
    }

    // 1. Try to decrypt using AES-GCM
    try {
      console.log('Attempting AES-GCM decryption...');
      const key = await this.getKey(salt);
      const data = Buffer.from(encryptedToken, "base64");
      
      if (data.length <= IV_LENGTH) {
        throw new Error('Encrypted token too short to contain IV and data');
      }
      
      const iv = data.slice(0, IV_LENGTH);
      const encrypted = data.slice(IV_LENGTH);

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted
      );
      
      const decryptedToken = new TextDecoder().decode(decrypted);
      console.log('Successfully decrypted token using AES-GCM');
      return decryptedToken;
    } catch(e) {
      console.log(`AES-GCM decryption failed: ${e.message}. Attempting fallbacks.`);
      
      // 2. Fallback for tokens that might be just base64 encoded
      try {
        console.log('Attempting base64 decoding fallback...');
        const decoded = atob(encryptedToken);
        
        // Check if decoded looks like a valid token
        if (decoded.includes('.') || decoded.length > 20) {
          console.log('Successfully decoded token using base64 fallback');
          return decoded;
        } else {
          throw new Error('Decoded value does not look like a valid token');
        }
      } catch (e2) {
        console.log(`Base64 decoding failed: ${e2.message}. Assuming plain text token.`);
        // 3. If all else fails, return as-is (might be a plain token)
        return encryptedToken;
      }
    }
  }
}
