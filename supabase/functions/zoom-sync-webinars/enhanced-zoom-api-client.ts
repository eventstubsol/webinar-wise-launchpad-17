
// Enhanced Zoom API client with additional registrant fetching methods

export class EnhancedZoomAPIClient {
  constructor(private baseClient: any) {}

  // Standard meeting registrants (for webinars stored as meetings)
  async getMeetingRegistrants(meetingId: string, options: { status?: string } = {}) {
    console.log(`📞 Fetching meeting registrants for ${meetingId} with status: ${options.status || 'all'}`);
    
    try {
      const params = new URLSearchParams({
        page_size: '100'
      });
      
      if (options.status) {
        params.append('status', options.status);
      }
      
      const allRegistrants = [];
      let pageNumber = 1;
      let hasMore = true;
      
      while (hasMore) {
        params.set('page_number', pageNumber.toString());
        
        const response = await this.baseClient.makeZoomAPIRequest(
          `GET`,
          `/meetings/${meetingId}/registrants?${params}`
        );
        
        if (response.registrants && response.registrants.length > 0) {
          allRegistrants.push(...response.registrants);
          console.log(`📊 Page ${pageNumber}: Found ${response.registrants.length} meeting registrants`);
        }
        
        hasMore = response.page_number < response.page_count;
        pageNumber++;
      }
      
      console.log(`✅ Total meeting registrants found: ${allRegistrants.length}`);
      return allRegistrants;
      
    } catch (error) {
      console.error(`❌ Error fetching meeting registrants for ${meetingId}:`, error);
      throw error;
    }
  }

  // Alternative API endpoints for registrants
  async getAlternativeRegistrants(webinarId: string) {
    console.log(`🔄 Trying alternative registrant endpoints for ${webinarId}`);
    
    const endpoints = [
      `/past_webinars/${webinarId}/registrants`,
      `/report/webinars/${webinarId}/registrants`,
      `/webinars/${webinarId}/batch_registrants`
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${endpoint}`);
        
        const response = await this.baseClient.makeZoomAPIRequest('GET', endpoint);
        
        if (response.registrants && response.registrants.length > 0) {
          console.log(`✅ Alternative endpoint successful: Found ${response.registrants.length} registrants`);
          return response.registrants;
        }
        
      } catch (error) {
        console.log(`⚠️ Alternative endpoint ${endpoint} failed: ${error.message}`);
      }
    }
    
    return [];
  }

  // Enhanced webinar registrants with better error handling
  async getWebinarRegistrants(webinarId: string, options: { status?: string; pageSize?: number } = {}) {
    const { status = 'approved', pageSize = 100 } = options;
    
    console.log(`📋 Fetching webinar registrants for ${webinarId} with status: ${status}`);
    
    try {
      const allRegistrants = [];
      let pageNumber = 1;
      let hasMore = true;
      
      while (hasMore) {
        const params = new URLSearchParams({
          page_size: pageSize.toString(),
          page_number: pageNumber.toString(),
          status: status
        });
        
        const response = await this.baseClient.makeZoomAPIRequest(
          'GET',
          `/webinars/${webinarId}/registrants?${params}`
        );
        
        if (response.registrants && response.registrants.length > 0) {
          allRegistrants.push(...response.registrants);
          console.log(`📊 Page ${pageNumber}: Found ${response.registrants.length} registrants`);
        }
        
        hasMore = response.page_number < response.page_count;
        pageNumber++;
        
        // Safety break to prevent infinite loops
        if (pageNumber > 100) {
          console.log(`⚠️ Breaking after 100 pages for safety`);
          break;
        }
      }
      
      console.log(`✅ Total webinar registrants found: ${allRegistrants.length}`);
      return allRegistrants;
      
    } catch (error) {
      console.error(`❌ Error fetching webinar registrants for ${webinarId}:`, error);
      throw error;
    }
  }
}
