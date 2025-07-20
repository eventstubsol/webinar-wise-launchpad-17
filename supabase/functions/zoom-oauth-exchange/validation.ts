
import { OAuthRequest } from './types.ts';

export class RequestValidator {
  static validateOAuthRequest(request: OAuthRequest): string | null {
    if (!request.code) {
      return 'Authorization code is required';
    }
    return null;
  }

  static validateEnvironment(): string | null {
    const clientId = Deno.env.get('ZOOM_CLIENT_ID');
    const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      return 'OAuth configuration error';
    }
    
    return null;
  }
}
