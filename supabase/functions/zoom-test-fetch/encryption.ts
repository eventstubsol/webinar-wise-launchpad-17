
const IV_LENGTH = 16;
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_SALT') || 'default-salt-is-not-secure-change-me';

export class SimpleTokenEncryption {
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

  static async decryptToken(encryptedToken: string, salt: string): Promise<string> {
    try {
      console.log('Attempting AES-GCM decryption...');
      const key = await this.getKey(salt);
      const data = new Uint8Array(atob(encryptedToken).split('').map(c => c.charCodeAt(0)));
      const iv = data.slice(0, IV_LENGTH);
      const encrypted = data.slice(IV_LENGTH);

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted
      );
      
      console.log('Successfully decrypted token using AES-GCM.');
      return new TextDecoder().decode(decrypted);
    } catch(e) {
      console.log(`AES-GCM decryption failed: ${e.message}. Attempting fallbacks.`);
      
      try {
        console.log('Attempting base64 decoding fallback...');
        const decoded = atob(encryptedToken);
        console.log('Successfully decoded token using base64 fallback.');
        return decoded;
      } catch (e2) {
        console.log(`Base64 decoding failed: ${e2.message}. Assuming plain text token.`);
        return encryptedToken;
      }
    }
  }
}
