
export class TokenEncryption {
  static async encryptToken(token: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(salt),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('supabase-encryption'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...result));
  }
  
  static async decryptToken(encryptedToken: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const encrypted = new Uint8Array(atob(encryptedToken).split('').map(c => c.charCodeAt(0)));
    const iv = encrypted.slice(0, 12);
    const data = encrypted.slice(12);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(salt),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('supabase-encryption'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return decoder.decode(decrypted);
  }
}
