
import { TokenResponse } from './types.ts';

export class ZoomApiService {
  static async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    const clientId = Deno.env.get('ZOOM_CLIENT_ID')!;
    const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET')!;
    
    const tokenUrl = 'https://zoom.us/oauth/token';
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoom token refresh failed:', response.status, errorText);
      const error = new Error('Failed to refresh Zoom token. The refresh token may be invalid or expired.');
      (error as any).status = response.status;
      throw error;
    }

    return await response.json();
  }
}
