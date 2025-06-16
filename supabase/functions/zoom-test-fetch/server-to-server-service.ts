
export class ZoomServerToServerService {
  private static readonly TOKEN_ENDPOINT = 'https://zoom.us/oauth/token';
  private static readonly CACHE_BUFFER_MINUTES = 10; // Refresh 10 minutes before expiry

  /**
   * Generate a fresh access token for Server-to-Server OAuth
   */
  static async generateAccessToken(clientId: string, clientSecret: string, accountId: string): Promise<{
    access_token: string;
    expires_in: number;
    token_type: string;
  }> {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    
    const response = await fetch(this.TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: accountId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoom token generation failed:', response.status, errorText);
      throw new Error(`Failed to generate access token: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    console.log('Successfully generated Zoom access token');
    
    return tokenData;
  }

  /**
   * Get a valid access token from cache or generate a new one
   */
  static async getValidAccessToken(supabaseClient: any, connection: any): Promise<string> {
    try {
      // First, check if we have a cached token that's still valid
      const { data: cachedToken, error: cacheError } = await supabaseClient
        .from('zoom_server_tokens')
        .select('*')
        .eq('connection_id', connection.id)
        .gte('expires_at', new Date(Date.now() + this.CACHE_BUFFER_MINUTES * 60 * 1000).toISOString())
        .maybeSingle();

      if (cacheError) {
        console.error('Error checking token cache:', cacheError);
      }

      if (cachedToken && cachedToken.access_token) {
        console.log('Using cached access token');
        return cachedToken.access_token;
      }

      console.log('Generating new access token...');
      
      // Generate a new token
      const tokenResponse = await this.generateAccessToken(
        connection.client_id,
        connection.client_secret,
        connection.account_id
      );

      const expiresAt = new Date(Date.now() + (tokenResponse.expires_in * 1000));

      // Cache the new token
      const { error: insertError } = await supabaseClient
        .from('zoom_server_tokens')
        .upsert({
          connection_id: connection.id,
          access_token: tokenResponse.access_token,
          expires_at: expiresAt.toISOString(),
        }, {
          onConflict: 'connection_id'
        });

      if (insertError) {
        console.error('Error caching token:', insertError);
        // Continue anyway - we have the token
      }

      return tokenResponse.access_token;
    } catch (error) {
      console.error('Error in getValidAccessToken:', error);
      throw new Error(`Failed to get valid access token: ${error.message}`);
    }
  }

  /**
   * Check if a connection is Server-to-Server type
   */
  static isServerToServerConnection(connection: any): boolean {
    return connection.connection_type === 'server_to_server' || 
           connection.zoom_account_type === 'Server-to-Server' ||
           (connection.access_token && connection.access_token.includes('SERVER_TO_SERVER'));
  }

  /**
   * Validate Server-to-Server connection has required credentials
   */
  static validateServerToServerConnection(connection: any): { valid: boolean; missing: string[] } {
    const missing = [];
    
    if (!connection.client_id) missing.push('client_id');
    if (!connection.client_secret) missing.push('client_secret');
    if (!connection.account_id) missing.push('account_id');

    return {
      valid: missing.length === 0,
      missing
    };
  }
}
