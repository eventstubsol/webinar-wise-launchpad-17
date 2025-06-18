
/**
 * Enhanced registrant processor with 100% Zoom API compliance and complete pagination
 * Self-contained version for edge functions
 */

interface ZoomRegistrantsQueryParams {
  page_size?: number;
  page_number?: number;
  next_page_token?: string;
  occurrence_id?: string;
  status?: 'pending' | 'approved' | 'denied';
  tracking_source_id?: string;
}

interface ZoomRegistrantResponse {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  industry?: string;
  org?: string;
  job_title?: string;
  purchasing_time_frame?: string;
  role_in_purchase_process?: string;
  no_of_employees?: string;
  comments?: string;
  custom_questions?: Array<{
    title: string;
    value: string;
  }>;
  status: 'approved' | 'denied' | 'pending';
  create_time?: string;
  join_url?: string;
}

interface ZoomRegistrantsListResponse {
  registrants: ZoomRegistrantResponse[];
  pagination: {
    next_page_token?: string;
    page_count: number;
    page_number: number;
    page_size: number;
    total_records: number;
    has_more: boolean;
  };
  warnings?: string[];
}

/**
 * Self-contained API client for registrants
 */
class SelfContainedRegistrantsApiClient {
  constructor(
    private accessToken: string,
    private userId: string,
    private connectionId?: string
  ) {}

  async getWebinarRegistrants(
    webinarId: string,
    params: ZoomRegistrantsQueryParams = {}
  ): Promise<ZoomRegistrantsListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page_size !== undefined) {
      queryParams.append('page_size', Math.min(params.page_size, 300).toString());
    } else {
      queryParams.append('page_size', '30');
    }

    if (params.next_page_token) {
      queryParams.append('next_page_token', params.next_page_token);
    } else if (params.page_number !== undefined) {
      queryParams.append('page_number', params.page_number.toString());
    } else {
      queryParams.append('page_number', '1');
    }

    if (params.occurrence_id) {
      queryParams.append('occurrence_id', params.occurrence_id);
    }
    
    if (params.status) {
      queryParams.append('status', params.status);
    }
    
    if (params.tracking_source_id) {
      queryParams.append('tracking_source_id', params.tracking_source_id);
    }

    const url = `https://api.zoom.us/v2/webinars/${webinarId}/registrants?${queryParams}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await this.handleApiError(response, webinarId);
    }

    const zoomData = await response.json();
    return this.validateAndTransformResponse(zoomData);
  }

  private async handleApiError(response: Response, webinarId: string): Promise<never> {
    const errorData = await response.json().catch(() => ({}));
    
    switch (response.status) {
      case 400:
        if (errorData.code === 200) {
          throw new Error('No permission or webinar plan is missing. You must subscribe to the webinar plan and enable webinars for this user.');
        }
        throw new Error(`Bad Request: ${errorData.message || 'Invalid request parameters'}`);
        
      case 401:
        throw new Error('Unauthorized: Invalid or expired access token. Please re-authenticate your Zoom connection.');
        
      case 403:
        throw new Error('Forbidden: Insufficient permissions. Check your Zoom app scopes: webinar:read:admin, webinar:read');
        
      case 404:
        if (errorData.code === 3001) {
          throw new Error(`Webinar does not exist: ${webinarId}`);
        }
        throw new Error(`Webinar not found: ${webinarId}`);
        
      case 429:
        const retryAfter = response.headers.get('Retry-After') || '60';
        throw new Error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
        
      default:
        throw new Error(`Zoom API Error ${response.status}: ${errorData.message || 'Unknown error'}`);
    }
  }

  private validateAndTransformResponse(data: any): ZoomRegistrantsListResponse {
    const response: ZoomRegistrantsListResponse = {
      registrants: (data.registrants || []).map(this.transformRegistrant),
      pagination: {
        next_page_token: data.next_page_token || undefined,
        page_count: data.page_count || 1,
        page_number: data.page_number || 1,
        page_size: data.page_size || 30,
        total_records: data.total_records || 0,
        has_more: !!(data.next_page_token || (data.page_number < data.page_count))
      }
    };

    return response;
  }

  private transformRegistrant(registrant: any): ZoomRegistrantResponse {
    return {
      id: registrant.id,
      email: registrant.email,
      first_name: registrant.first_name,
      last_name: registrant.last_name || undefined,
      address: registrant.address || undefined,
      city: registrant.city || undefined,
      state: registrant.state || undefined,
      zip: registrant.zip || undefined,
      country: registrant.country || undefined,
      phone: registrant.phone || undefined,
      industry: registrant.industry || undefined,
      org: registrant.org || undefined,
      job_title: registrant.job_title || undefined,
      purchasing_time_frame: registrant.purchasing_time_frame || undefined,
      role_in_purchase_process: registrant.role_in_purchase_process || undefined,
      no_of_employees: registrant.no_of_employees || undefined,
      comments: registrant.comments || undefined,
      custom_questions: registrant.custom_questions || undefined,
      status: registrant.status || 'approved',
      create_time: registrant.create_time || undefined,
      join_url: registrant.join_url || undefined,
    };
  }
}

/**
 * Enhanced registrant sync with full pagination and error handling
 */
export async function syncWebinarRegistrantsFullCompliance(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string,
  options: {
    occurrenceId?: string;
    trackingSourceId?: string;
    status?: 'pending' | 'approved' | 'denied';
    maxPages?: number;
  } = {}
): Promise<{
  totalSynced: number;
  errors: string[];
  pagesProcessed: number;
  warnings: string[];
}> {
  console.log(`🎯 FULL COMPLIANCE REGISTRANT SYNC starting for webinar ${webinarId}`);
  
  try {
    // Create enhanced API client with proper token management
    const enhancedClient = new SelfContainedRegistrantsApiClient(
      client.accessToken || client.getAccessToken?.(),
      client.userId || client.connectionId,
      client.connectionId
    );

    console.log(`🔄 ENHANCED CLIENT: Created for webinar ${webinarId}`);

    let totalSynced = 0;
    let pagesProcessed = 0;
    let nextPageToken: string | undefined;
    const errors: string[] = [];
    const allWarnings: string[] = [];
    const maxPages = options.maxPages || 50; // Safety limit

    do {
      try {
        const params: ZoomRegistrantsQueryParams = {
          page_size: 300, // Maximum allowed by Zoom API
          occurrence_id: options.occurrenceId,
          tracking_source_id: options.trackingSourceId,
          status: options.status,
          next_page_token: nextPageToken
        };

        console.log(`📥 FETCHING PAGE ${pagesProcessed + 1} for webinar ${webinarId}`, {
          pageSize: params.page_size,
          hasNextToken: !!nextPageToken,
          status: params.status
        });

        const result = await enhancedClient.getWebinarRegistrants(webinarId, params);

        if (!result.registrants || result.registrants.length === 0) {
          console.log(`📭 NO REGISTRANTS: Found 0 registrants on page ${pagesProcessed + 1} for webinar ${webinarId}`);
          if (pagesProcessed === 0) {
            // First page with no results, stop here
            break;
          }
        } else {
          console.log(`✅ REGISTRANTS FOUND: ${result.registrants.length} registrants on page ${pagesProcessed + 1} for webinar ${webinarId}`);
          
          // Transform registrant data for database
          const transformedRegistrants = result.registrants.map(registrant => ({
            webinar_id: webinarDbId,
            registrant_id: registrant.id,
            registrant_email: registrant.email,
            first_name: registrant.first_name,
            last_name: registrant.last_name || null,
            address: registrant.address || null,
            city: registrant.city || null,
            state: registrant.state || null,
            zip: registrant.zip || null,
            country: registrant.country || null,
            phone: registrant.phone || null,
            industry: registrant.industry || null,
            org: registrant.org || null,
            job_title: registrant.job_title || null,
            purchasing_time_frame: registrant.purchasing_time_frame || null,
            role_in_purchase_process: registrant.role_in_purchase_process || null,
            no_of_employees: registrant.no_of_employees || null,
            comments: registrant.comments || null,
            custom_questions: registrant.custom_questions ? JSON.stringify(registrant.custom_questions) : null,
            status: registrant.status,
            join_url: registrant.join_url || null,
            create_time: registrant.create_time || null,
            registration_time: registrant.create_time || new Date().toISOString(),
            occurrence_id: options.occurrenceId || null,
            tracking_source_id: options.trackingSourceId || null,
            source_id: null,
            tracking_source: null,
            language: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          // Upsert registrants to database with enhanced conflict resolution
          const { error } = await supabase
            .from('zoom_registrants')
            .upsert(
              transformedRegistrants,
              {
                onConflict: 'webinar_id,registrant_id',
                ignoreDuplicates: false
              }
            );

          if (error) {
            console.error(`❌ DATABASE UPSERT ERROR:`, error);
            throw new Error(`Failed to upsert registrants: ${error.message}`);
          }

          totalSynced += result.registrants.length;
        }

        pagesProcessed++;
        nextPageToken = result.pagination.next_page_token;

        console.log(`✅ PAGE ${pagesProcessed} COMPLETED: ${result.registrants?.length || 0} registrants synced, hasMore: ${result.pagination.has_more}`);

        // Safety check for infinite loops
        if (pagesProcessed >= maxPages) {
          console.warn(`⚠️ SAFETY LIMIT: Reached maximum pages (${maxPages}) for webinar ${webinarId}`);
          break;
        }

        // Break if no more pages or no more data
        if (!result.pagination.has_more || !nextPageToken) {
          console.log(`🏁 PAGINATION COMPLETE: No more pages for webinar ${webinarId}`);
          break;
        }

        // Small delay between pages to be respectful to API
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (pageError) {
        const errorMsg = `Page ${pagesProcessed + 1} failed: ${pageError.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        
        // Break on pagination errors to avoid infinite loops
        break;
      }

    } while (nextPageToken && pagesProcessed < maxPages);

    console.log(`🎉 FULL COMPLIANCE SYNC COMPLETED: ${totalSynced} total registrants synced across ${pagesProcessed} pages`);

    return {
      totalSynced,
      errors,
      pagesProcessed,
      warnings: allWarnings
    };

  } catch (error) {
    console.error(`💥 FULL COMPLIANCE REGISTRANT SYNC ERROR for webinar ${webinarId}:`, error);
    
    return {
      totalSynced: 0,
      errors: [error.message],
      pagesProcessed: 0,
      warnings: []
    };
  }
}

/**
 * Test API access before attempting sync
 */
async function testRegistrantAPIAccess(client: any, webinarId: string): Promise<{
  hasAccess: boolean;
  error?: string;
  scopeIssue?: boolean;
}> {
  try {
    // Try to fetch just the first page with minimal size to test access
    const testResult = await client.getWebinarRegistrants(webinarId, {
      page_size: 1,
      page_number: 1
    });
    
    return { hasAccess: true };
  } catch (error) {
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('scope') || errorMessage.includes('permission')) {
      return {
        hasAccess: false,
        error: error.message,
        scopeIssue: true
      };
    }
    
    return {
      hasAccess: false,
      error: error.message,
      scopeIssue: false
    };
  }
}

export { testRegistrantAPIAccess };
