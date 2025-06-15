
import { Buffer } from "https://deno.land/std@0.168.0/io/buffer.ts";

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

  static async encryptToken(token: string, salt: string): Promise<string> {
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
  }

  static async decryptToken(encryptedToken: string, salt: string): Promise<string> {
    try {
        const key = await this.getKey(salt);
        const data = Buffer.from(encryptedToken, "base64");
        const iv = data.slice(0, IV_LENGTH);
        const encrypted = data.slice(IV_LENGTH);

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encrypted
        );

        return new TextDecoder().decode(decrypted);
    } catch(e) {
        // Fallback for tokens that might be just base64 encoded and not encrypted.
        try {
            const decoded = atob(encryptedToken);
            return decoded;
        } catch (e2) {
            // If it fails, it might be a plain token
            return encryptedToken;
        }
    }
  }
}
