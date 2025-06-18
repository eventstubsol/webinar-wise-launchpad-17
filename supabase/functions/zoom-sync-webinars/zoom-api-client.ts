export async function validateZoomConnection(connection: any): Promise<boolean> {
  console.log(`Validating Zoom connection: ${connection.id}`);
  
  try {
    if (!connection.access_token) {
      console.error('No access token found in connection');
      return false;
    }

    // Check if token is valid string
    if (typeof connection.access_token !== 'string' || connection.access_token.length < 10) {
      console.error('Invalid access token format');
      return false;
    }

    // For Server-to-Server connections, we don't need to validate expiry the same way
    const isServerToServer = !connection.refresh_token || connection.refresh_token.includes('SERVER_TO_SERVER_NOT_APPLICABLE');
    
    if (isServerToServer) {
      console.log('Connection is Server-to-Server type, validation successful');
      return true;
    }

    // For OAuth connections, check token expiry
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    console.log(`Token expires at: ${expiresAt.toISOString()}, Current time: ${now.toISOString()}`);

    if (now.getTime() >= (expiresAt.getTime() - bufferTime)) {
      console.log('OAuth access token has expired or will expire soon, will need refresh');
      return true; // Still valid for refresh
    }

    console.log('Connection validation successful - token is valid');
    return true;
  } catch (error) {
    console.error('Error validating Zoom connection:', error);
    return false;
  }
}

export async function createZoomAPIClient(connection: any, supabase: any) {
  console.log(`Creating Zoom API client for connection: ${connection.id}`);
  
  const isServerToServer = !connection.refresh_token || connection.refresh_token.includes('SERVER_TO_SERVER_NOT_APPLICABLE');
  console.log(`Connection type determined as: ${isServerToServer ? 'Server-to-Server' : 'OAuth'}`);
  
  // Use tokens directly (no decryption needed)
  const accessToken = connection.access_token;
  const refreshToken = isServerToServer ? undefined : connection.refresh_token;
  
  console.log('Using plain text tokens for API client.');
  
  return new ZoomAPIClient(connection, supabase, accessToken, refreshToken, !isServerToServer);
}

class ZoomAPIClient {
  private connection: any;
  private supabase: any;
  private accessToken: string;
  private refreshTokenValue: string | undefined;
  private isOAuth: boolean;
  private baseURL = 'https://api.zoom.us/v2';

  constructor(connection: any, supabase: any, accessToken: string, refreshToken: string | undefined, isOAuth: boolean) {
    this.connection = connection;
    this.supabase = supabase;
    this.accessToken = accessToken;
    this.refreshTokenValue = refreshToken;
    this.isOAuth = isOAuth;
  }

  private async refreshTokens() {
    console.log(`Attempting to refresh tokens for connection: ${this.connection.id}`);
    
    if (!this.isOAuth) {
      console.log('Refreshing Server-to-Server token using client credentials flow');
      return await this.refreshServerToServerToken();
    } else {
      console.log('Refreshing OAuth token using refresh token flow');
      return await this.refreshOAuthToken();
    }
  }

  private async refreshServerToServerToken() {
    try {
      const { data: credentials, error: credError } = await this.supabase
        .from('zoom_credentials')
        .select('client_id, client_secret, account_id')
        .eq('user_id', this.connection.user_id)
        .eq('is_active', true)
        .single();

      if (credError || !credentials) {
        console.error('No active credentials found for Server-to-Server refresh');
        throw new Error('No active Zoom credentials found for token refresh');
      }

      const tokenRequestBody = new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: credentials.account_id
      });

      const tokenResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${credentials.client_id}:${credentials.client_secret}`)}`,
        },
        body: tokenRequestBody,
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Server-to-Server token refresh failed:', tokenResponse.status, errorText);
        throw new Error('Failed to refresh Server-to-Server token');
      }

      const tokenData = await tokenResponse.json();
      this.accessToken = tokenData.access_token;

      // Update the connection with the new token (plain text)
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

      const { error: updateError } = await this.supabase
        .from('zoom_connections')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.connection.id);

      if (updateError) {
        console.error('Failed to update connection with new token:', updateError);
        throw new Error('Failed to save refreshed token');
      }

      console.log(`Server-to-Server token refreshed successfully for connection: ${this.connection.id}`);
      
    } catch (error) {
      console.error(`Server-to-Server token refresh failed for connection ${this.connection.id}:`, error);
      throw error;
    }
  }

  private async refreshOAuthToken() {
    try {
      const { data, error } = await this.supabase.functions.invoke('zoom-token-refresh', {
        body: { connectionId: this.connection.id }
      });

      if (error) {
        console.error(`OAuth token refresh invocation failed for connection ${this.connection.id}:`, error);
        throw new Error('OAuth token refresh failed. Please re-authenticate.');
      }

      if (!data?.connection) {
        console.error('OAuth token refresh response missing connection data');
        throw new Error('OAuth token refresh failed - invalid response.');
      }

      this.connection = data.connection;
      this.accessToken = data.connection.access_token;
      
      console.log(`OAuth tokens refreshed successfully for connection: ${this.connection.id}`);
      
    } catch (error) {
      console.error(`OAuth token refresh failed for connection ${this.connection.id}:`, error);
      throw error;
    }
  }

  private validateAndSanitizeToken(token: string): string {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token: token must be a non-empty string');
    }
    
    const sanitized = token.trim();
    
    if (sanitized.length < 10) {
      throw new Error('Invalid token: token too short');
    }
    
    return sanitized;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const sanitizedToken = this.validateAndSanitizeToken(this.accessToken);
      
      let requestHeaders = {
        'Authorization': `Bearer ${sanitizedToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      console.log(`Making Zoom API request: ${endpoint} (attempt ${retryCount + 1})`);
      
      // Check if token needs refresh (only for OAuth connections)
      if (this.isOAuth) {
        const expiresAt = new Date(this.connection.token_expires_at);
        const now = new Date();
        const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

        if (now.getTime() >= (expiresAt.getTime() - bufferTime) && retryCount === 0) {
          console.log(`Forcing OAuth token refresh: token expired/expiring`);
          try {
            await this.refreshTokens();
            const newSanitizedToken = this.validateAndSanitizeToken(this.accessToken);
            requestHeaders = {
                ...requestHeaders,
                'Authorization': `Bearer ${newSanitizedToken}`,
            };
            console.log('Headers updated with new token.');
          } catch (refreshError) {
            console.error('Pre-emptive OAuth token refresh failed:', refreshError);
            const authError = new Error('Authentication expired. Please reconnect your Zoom account.');
            (authError as any).status = 401;
            (authError as any).isAuthError = true;
            throw authError;
          }
        }
      }
      
      const response = await fetch(url, {
        ...options,
        headers: requestHeaders,
      });

      console.log(`Zoom API response: ${response.status} for ${endpoint}`);

      if (!response.ok) {
        if (response.status === 401 && retryCount < 1) {
          console.log(`Received 401 for ${endpoint}. Attempting token refresh.`);
          try {
            await this.refreshTokens();
            return await this.makeRequest(endpoint, options, retryCount + 1);
          } catch (refreshError) {
            console.error(`Token refresh flow failed for ${endpoint}:`, refreshError.message);
            const authError = new Error('Authentication expired. Please reconnect your Zoom account.');
            (authError as any).status = 401;
            (authError as any).isAuthError = true;
            throw authError;
          }
        }

        const errorText = await response.text();
        console.error(`Zoom API error (${response.status}) for ${endpoint}:`, errorText);
        
        const error = new Error(`Zoom API request failed: ${response.status} ${response.statusText}`);
        (error as any).status = response.status;
        
        if (response.status === 401) {
          (error as any).isAuthError = true;
        }
        
        try {
          (error as any).body = JSON.parse(errorText);
        } catch {
          (error as any).body = { message: errorText };
        }
        
        throw error;
      }

      const responseText = await response.text();
      const result = responseText ? JSON.parse(responseText) : {};
      console.log(`Zoom API success for ${endpoint}:`, Object.keys(result));
      return result;
    } catch (error) {
      if (error.message.includes('Invalid token') && retryCount === 0) {
        console.log('Token validation failed, attempting refresh...');
        try {
          await this.refreshTokens();
          return await this.makeRequest(endpoint, options, retryCount + 1);
        } catch (refreshError) {
          console.error('Token refresh after validation failure failed:', refreshError);
          throw error;
        }
      }
      throw error;
    }
  }

  async listWebinarsWithRange(options: { from?: Date; to?: Date; type?: string } = {}): Promise<any[]> {
    const { from, to, type = 'past' } = options;
    let endpoint = `/users/me/webinars?page_size=300&type=${type}`;
    
    if (from) {
      endpoint += `&from=${from.toISOString().split('T')[0]}`;
    }
    if (to) {
      endpoint += `&to=${to.toISOString().split('T')[0]}`;
    }

    console.log(`Fetching ${type} webinars with endpoint: ${endpoint}`);

    const response = await this.makeRequest(endpoint);
    return response.webinars || [];
  }

  async getWebinar(webinarId: string): Promise<any> {
    return await this.makeRequest(`/webinars/${webinarId}`);
  }

  async listWebinars(options: { from?: Date } = {}): Promise<any[]> {
    let endpoint = '/users/me/webinars?page_size=300';
    
    if (options.from) {
      endpoint += `&from=${options.from.toISOString()}`;
    }

    const response = await this.makeRequest(endpoint);
    return response.webinars || [];
  }

  /**
   * ENHANCED: Get webinar registrants with better error handling and scope detection
   */
  async getWebinarRegistrants(webinarId: string, options: { status?: string } = {}): Promise<any[]> {
    const { status = 'approved' } = options;
    
    console.log(`🎯 FETCHING REGISTRANTS for webinar ${webinarId} with status: ${status}`);
    
    try {
      // Build API endpoint
      const endpoint = `/webinars/${webinarId}/registrants`;
      const params = new URLSearchParams({
        status: status,
        page_size: '300', // Max page size
        occurrence_id: '' // Include all occurrences
      });
      
      console.log(`📡 REGISTRANT API REQUEST: ${endpoint}?${params.toString()}`);
      
      const response = await this.makeRequest(`${endpoint}?${params.toString()}`);
      
      if (!response) {
        console.log(`⚠️ REGISTRANT API: Null response for webinar ${webinarId}`);
        return [];
      }
      
      // Handle different response formats
      let registrants = [];
      
      if (Array.isArray(response)) {
        registrants = response;
      } else if (response.registrants && Array.isArray(response.registrants)) {
        registrants = response.registrants;
      } else if (response.data && Array.isArray(response.data)) {
        registrants = response.data;
      } else {
        console.log(`⚠️ REGISTRANT API: Unexpected response format for webinar ${webinarId}:`, {
          responseType: typeof response,
          hasRegistrants: 'registrants' in response,
          hasData: 'data' in response,
          keys: Object.keys(response)
        });
        return [];
      }
      
      console.log(`✅ REGISTRANT API SUCCESS: Found ${registrants.length} registrants for webinar ${webinarId}`);
      
      if (registrants.length > 0) {
        const sample = registrants[0];
        console.log(`📋 SAMPLE REGISTRANT from API:`, {
          id: sample.id,
          email: sample.email,
          status: sample.status,
          registration_time: sample.registration_time,
          fields: Object.keys(sample)
        });
      }
      
      return registrants;
      
    } catch (error) {
      console.error(`❌ REGISTRANT API ERROR for webinar ${webinarId}:`, error);
      
      // Enhanced error analysis
      const errorMessage = error.message?.toLowerCase() || '';
      const statusCode = error.status || error.statusCode;
      
      if (statusCode === 403 || errorMessage.includes('forbidden')) {
        throw new Error(`Scope Error: Missing 'webinar:read:admin' scope for registrant access. Status: ${statusCode}`);
      } else if (statusCode === 401 || errorMessage.includes('unauthorized')) {
        throw new Error(`Permission Error: Unauthorized access to registrant data. Status: ${statusCode}`);
      } else if (statusCode === 404) {
        console.log(`📭 REGISTRANT API: Webinar ${webinarId} not found or has no registrants`);
        return []; // Return empty array for 404 instead of throwing
      } else if (statusCode === 429 || errorMessage.includes('rate limit')) {
        throw new Error(`Rate Limit Error: Too many API requests. Status: ${statusCode}`);
      } else {
        throw new Error(`API Error: ${error.message}. Status: ${statusCode}`);
      }
    }
  }

  async getWebinarParticipants(webinarId: string, debugMode = false): Promise<any[]> {
    const startTime = Date.now();
    const endpoint = `/report/webinars/${webinarId}/participants?page_size=300`;
    
    console.log(`ENHANCED: Starting participants fetch for webinar ${webinarId}`);
    console.log(`ENHANCED: Connection ID: ${this.connection.id}`);
    console.log(`ENHANCED: Using token type: ${this.isOAuth ? 'OAuth' : 'Server-to-Server'}`);
    
    if (debugMode) {
      console.log(`DEBUG: Endpoint: ${endpoint}`);
      console.log(`DEBUG: Token length: ${this.accessToken?.length || 0}`);
    }
    
    try {
      const url = `${this.baseURL}${endpoint}`;
      const sanitizedToken = this.validateAndSanitizeToken(this.accessToken);
      
      const requestHeaders = {
        'Authorization': `Bearer ${sanitizedToken}`,
        'Content-Type': 'application/json',
      };

      if (debugMode) {
        console.log(`DEBUG: Making request to: ${url}`);
        console.log(`DEBUG: Request headers prepared`);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
      });

      const responseTime = Date.now() - startTime;
      
      // Enhanced logging: Log full response details
      console.log(`ENHANCED: Participants API Response Details for ${webinarId}:`);
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Response time: ${responseTime}ms`);
      console.log(`  Connection ID: ${this.connection.id}`);
      console.log(`  Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
      
      if (debugMode) {
        console.log(`DEBUG: Response received in ${responseTime}ms`);
        console.log(`DEBUG: Response status: ${response.status}`);
        console.log(`DEBUG: Response headers:`, Object.fromEntries(response.headers.entries()));
      }

      if (!response.ok) {
        const errorText = await response.text();
        
        // Enhanced error logging: Complete error object details
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          url: url,
          headers: Object.fromEntries(response.headers.entries()),
          responseText: errorText,
          webinarId: webinarId,
          connectionId: this.connection.id,
          requestTime: responseTime,
          timestamp: new Date().toISOString()
        };

        console.error(`ENHANCED: Complete participants API error details:`, errorDetails);
        
        let errorBody;
        try {
          errorBody = JSON.parse(errorText);
        } catch {
          errorBody = { message: errorText };
        }

        // Enhanced error classification
        let errorType = 'unknown';
        let isRetryable = false;
        
        if (response.status === 400 && errorBody.code === 4711) {
          errorType = 'scope_permission_error';
          isRetryable = false;
          console.error(`ENHANCED: SCOPE PERMISSION ERROR - Missing required scope: report:read:list_webinar_participants:admin`);
        } else if (response.status === 404) {
          errorType = 'webinar_not_found';
          isRetryable = false;
          console.log(`ENHANCED: Webinar ${webinarId} not found or no participant data available`);
        } else if (response.status === 401) {
          errorType = 'authentication_error';
          isRetryable = true;
        } else if (response.status === 429) {
          errorType = 'rate_limit_error';
          isRetryable = true;
        } else if (response.status >= 500) {
          errorType = 'server_error';
          isRetryable = true;
        }

        const enhancedError = new Error(`Participants API failed: ${response.status} ${response.statusText}`);
        (enhancedError as any).type = errorType;
        (enhancedError as any).isRetryable = isRetryable;
        (enhancedError as any).details = errorDetails;
        (enhancedError as any).body = errorBody;
        (enhancedError as any).status = response.status;

        console.log(`ENHANCED: Error classified as: ${errorType} (retryable: ${isRetryable})`);
        
        throw enhancedError;
      }

      const responseText = await response.text();
      
      if (debugMode) {
        console.log(`DEBUG: Response body length: ${responseText.length} characters`);
      }

      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error(`ENHANCED: Failed to parse participants response for ${webinarId}:`, parseError);
        console.error(`ENHANCED: Raw response text:`, responseText.substring(0, 1000) + '...');
        throw new Error('Invalid JSON response from participants API');
      }

      const participants = result.participants || [];
      
      // Enhanced success logging with response validation
      console.log(`ENHANCED: Participants API Success for ${webinarId}:`);
      console.log(`  Connection ID: ${this.connection.id}`);
      console.log(`  Participants found: ${participants.length}`);
      console.log(`  Response structure keys: [${Object.keys(result).join(', ')}]`);
      console.log(`  Total records indicated: ${result.total_records || 'not specified'}`);
      console.log(`  Page info: ${result.page_count || 'N/A'} pages, current: ${result.page_number || 'N/A'}`);
      console.log(`  Response time: ${responseTime}ms`);
      
      // Validate response structure
      if (!Array.isArray(participants)) {
        console.error(`ENHANCED: Invalid participants response structure - expected array, got: ${typeof participants}`);
        return [];
      }
      
      if (debugMode && participants.length > 0) {
        console.log(`DEBUG: First participant structure:`, Object.keys(participants[0]));
        console.log(`DEBUG: Sample participant data:`, JSON.stringify(participants[0], null, 2));
      }

      return participants;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      // Enhanced error logging for caught exceptions
      console.error(`ENHANCED: Exception in getWebinarParticipants for ${webinarId}:`);
      console.error(`  Connection ID: ${this.connection.id}`);
      console.error(`  Error type: ${error.constructor.name}`);
      console.error(`  Error message: ${error.message}`);
      console.error(`  Total time: ${totalTime}ms`);
      console.error(`  Full error object:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
        type: error.type,
        isRetryable: error.isRetryable,
        status: error.status,
        details: error.details
      });
      
      if (debugMode) {
        console.log(`DEBUG: Caught exception after ${totalTime}ms`);
        console.log(`DEBUG: Error properties:`, Object.getOwnPropertyNames(error));
      }

      // Log classification for empty results vs real errors
      if (error.type === 'scope_permission_error') {
        console.log(`No participants for webinar ${webinarId}: SCOPE PERMISSION ERROR - report:read:list_webinar_participants:admin scope required`);
      } else if (error.type === 'webinar_not_found') {
        console.log(`No participants for webinar ${webinarId}: WEBINAR NOT FOUND or NO DATA AVAILABLE`);
      } else {
        console.log(`No participants for webinar ${webinarId}: ${error.message}`);
      }
      
      return [];
    }
  }

  /**
   * NEW: Get webinar participants using alternative /past_webinars/ endpoint
   */
  async getWebinarParticipantsAlternative(webinarId: string, debugMode = false): Promise<any[]> {
    const startTime = Date.now();
    const allParticipants = [];
    let pageNumber = 1;
    let hasMore = true;

    console.log(`ALTERNATIVE: Starting participants fetch for webinar ${webinarId}`);
    console.log(`ALTERNATIVE: Connection ID: ${this.connection.id}`);
    console.log(`ALTERNATIVE: Using token type: ${this.isOAuth ? 'OAuth' : 'Server-to-Server'}`);

    while (hasMore) {
      const endpoint = `/past_webinars/${webinarId}/participants?page_size=300&page_number=${pageNumber}`;
      
      if (debugMode) {
        console.log(`DEBUG ALT: Page ${pageNumber} endpoint: ${endpoint}`);
      }

      try {
        const url = `${this.baseURL}${endpoint}`;
        const sanitizedToken = this.validateAndSanitizeToken(this.accessToken);
        
        const requestHeaders = {
          'Authorization': `Bearer ${sanitizedToken}`,
          'Content-Type': 'application/json',
        };

        const pageStartTime = Date.now();
        const response = await fetch(url, {
          method: 'GET',
          headers: requestHeaders,
        });

        const pageResponseTime = Date.now() - pageStartTime;
        
        console.log(`ALTERNATIVE: Page ${pageNumber} Response Details for ${webinarId}:`);
        console.log(`  Status: ${response.status} ${response.statusText}`);
        console.log(`  Page response time: ${pageResponseTime}ms`);
        
        if (!response.ok) {
          const errorText = await response.text();
          
          if (response.status === 404) {
            console.log(`ALTERNATIVE: Webinar ${webinarId} not found in past_webinars endpoint`);
            break;
          }
          
          console.error(`ALTERNATIVE: API error (${response.status}) for ${webinarId} page ${pageNumber}:`, errorText);
          throw new Error(`Alternative participants API failed: ${response.status} ${response.statusText}`);
        }

        const responseText = await response.text();
        const result = responseText ? JSON.parse(responseText) : {};
        
        const participants = result.participants || [];
        allParticipants.push(...participants);
        
        console.log(`ALTERNATIVE: Page ${pageNumber} Success:`);
        console.log(`  Participants on page: ${participants.length}`);
        console.log(`  Total participants so far: ${allParticipants.length}`);
        console.log(`  Page count: ${result.page_count || 'N/A'}`);
        console.log(`  Total records: ${result.total_records || 'N/A'}`);
        
        if (debugMode && participants.length > 0) {
          console.log(`DEBUG ALT: Sample participant from page ${pageNumber}:`, JSON.stringify(participants[0], null, 2));
        }

        hasMore = pageNumber < (result.page_count || 1);
        pageNumber++;
        
      } catch (error) {
        console.error(`ALTERNATIVE: Error on page ${pageNumber} for webinar ${webinarId}:`, error);
        break;
      }
    }

    const totalTime = Date.now() - startTime;
    
    console.log(`ALTERNATIVE: Final Results for ${webinarId}:`);
    console.log(`  Total participants: ${allParticipants.length}`);
    console.log(`  Total pages processed: ${pageNumber - 1}`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Average time per page: ${totalTime / (pageNumber - 1)}ms`);

    return allParticipants;
  }

  async getWebinarPolls(webinarId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/report/webinars/${webinarId}/polls`);
      return response.questions || [];
    } catch (error) {
      console.log(`No polls for webinar ${webinarId}:`, error.message);
      return [];
    }
  }

  async getWebinarQA(webinarId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/report/webinars/${webinarId}/qa`);
      return response.questions || [];
    } catch (error) {
      console.log(`No Q&A for webinar ${webinarId}:`, error.message);
      return [];
    }
  }
}
