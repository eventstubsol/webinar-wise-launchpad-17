
import { TokenResponse, ZoomUser } from './types.ts';

export class ZoomApiService {
  static async exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
    const clientId = Deno.env.get('ZOOM_CLIENT_ID')!;
    const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET')!;
    
    const tokenUrl = 'https://zoom.us/oauth/token';
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    });

    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    
    console.log('Exchanging code with Zoom API');
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Zoom token exchange failed:', tokenResponse.status, errorText);
      throw new Error('Failed to exchange authorization code');
    }

    return await tokenResponse.json();
  }

  static async getUserInfo(accessToken: string): Promise<ZoomUser> {
    const userInfoResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to get Zoom user info:', userInfoResponse.status);
      throw new Error('Failed to get user information from Zoom');
    }

    return await userInfoResponse.json();
  }
}
