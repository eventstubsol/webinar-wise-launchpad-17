const IV_LENGTH = 16;
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_SALT') || 'default-salt-is-not-secure-change-me';

export class TokenEncryption {
  private static async getKey(salt: string): Promise<CryptoKey> {
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
    const key = await this.getKey(salt);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encodedToken = new TextEncoder().encode(token);

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedToken
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(IV_LENGTH + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), IV_LENGTH);
    
    return btoa(String.fromCharCode(...combined));
  }

  static async decryptToken(encryptedToken: string, salt: string): Promise<string> {
    try {
      const key = await this.getKey(salt);
      const combined = new Uint8Array(
        atob(encryptedToken).split('').map(char => char.charCodeAt(0))
      );
      
      const iv = combined.slice(0, IV_LENGTH);
      const encrypted = combined.slice(IV_LENGTH);

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.log(`Decryption failed: ${e.message}. Trying fallbacks.`);
      
      // Fallback for base64 encoded tokens
      try {
        return atob(encryptedToken);
      } catch (e2) {
        // Return as-is for plain text tokens
        return encryptedToken;
      }
    }
  }
}