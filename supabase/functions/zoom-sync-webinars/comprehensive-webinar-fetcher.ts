
/**
 * Comprehensive webinar fetching service that properly handles all Zoom webinar types
 * Fixes the issue with invalid 'all' type by fetching past, upcoming, and live separately
 */

export interface WebinarFetchResult {
  webinars: any[];
  summary: {
    pastCount: number;
    upcomingCount: number;
    liveCount: number;
    totalFetched: number;
    duplicatesRemoved: number;
    finalCount: number;
  };
}

export class ComprehensiveWebinarFetcher {
  private client: any;
  private connectionId: string;

  constructor(client: any, connectionId: string) {
    this.client = client;
    this.connectionId = connectionId;
  }

  /**
   * Fetch all webinars using comprehensive strategy
   */
  async fetchAllWebinars(): Promise<WebinarFetchResult> {
    console.log(`=== STARTING COMPREHENSIVE WEBINAR FETCH FOR CONNECTION: ${this.connectionId} ===`);
    
    // Define extended date ranges for comprehensive coverage
    const now = new Date();
    const pastStartDate = new Date(now.getTime() - (2.5 * 365 * 24 * 60 * 60 * 1000)); // 2.5 years ago
    const futureEndDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now
    
    console.log(`Date range: ${pastStartDate.toISOString()} to ${futureEndDate.toISOString()}`);

    // Fetch all webinar types in parallel
    const [pastWebinars, upcomingWebinars, liveWebinars] = await Promise.allSettled([
      this.fetchWebinarsByType('past', pastStartDate, now),
      this.fetchWebinarsByType('upcoming', now, futureEndDate),
      this.fetchWebinarsByType('live')
    ]);

    // Process results and handle any failures
    const pastResults = pastWebinars.status === 'fulfilled' ? pastWebinars.value : [];
    const upcomingResults = upcomingWebinars.status === 'fulfilled' ? upcomingWebinars.value : [];
    const liveResults = liveWebinars.status === 'fulfilled' ? liveWebinars.value : [];

    // Log any fetch failures
    if (pastWebinars.status === 'rejected') {
      console.error('Failed to fetch past webinars:', pastWebinars.reason);
    }
    if (upcomingWebinars.status === 'rejected') {
      console.error('Failed to fetch upcoming webinars:', upcomingWebinars.reason);
    }
    if (liveWebinars.status === 'rejected') {
      console.error('Failed to fetch live webinars:', liveWebinars.reason);
    }

    console.log(`Raw fetch results:`);
    console.log(`- Past webinars: ${pastResults.length}`);
    console.log(`- Upcoming webinars: ${upcomingResults.length}`);
    console.log(`- Live webinars: ${liveResults.length}`);
    console.log(`- Total before deduplication: ${pastResults.length + upcomingResults.length + liveResults.length}`);

    // Combine and deduplicate all webinars
    const allWebinars = [...pastResults, ...upcomingResults, ...liveResults];
    const { uniqueWebinars, duplicatesRemoved } = this.deduplicateWebinars(allWebinars);

    const summary = {
      pastCount: pastResults.length,
      upcomingCount: upcomingResults.length,
      liveCount: liveResults.length,
      totalFetched: allWebinars.length,
      duplicatesRemoved,
      finalCount: uniqueWebinars.length
    };

    console.log(`=== COMPREHENSIVE FETCH SUMMARY ===`);
    console.log(`Past webinars: ${summary.pastCount}`);
    console.log(`Upcoming webinars: ${summary.upcomingCount}`);
    console.log(`Live webinars: ${summary.liveCount}`);
    console.log(`Total fetched: ${summary.totalFetched}`);
    console.log(`Duplicates removed: ${summary.duplicatesRemoved}`);
    console.log(`Final unique webinars: ${summary.finalCount}`);

    return {
      webinars: uniqueWebinars,
      summary
    };
  }

  /**
   * Fetch webinars by specific type with pagination
   */
  private async fetchWebinarsByType(
    type: 'past' | 'upcoming' | 'live',
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    console.log(`\n--- Fetching ${type} webinars ---`);
    
    const allWebinars: any[] = [];
    let pageNumber = 1;
    let hasMorePages = true;
    const pageSize = 300; // Maximum allowed by Zoom API

    while (hasMorePages) {
      try {
        console.log(`Fetching ${type} webinars - Page ${pageNumber}`);
        
        let endpoint = `/users/me/webinars?page_size=${pageSize}&page_number=${pageNumber}&type=${type}`;
        
        // Add date range for past and upcoming webinars
        if (type === 'past' && startDate && endDate) {
          endpoint += `&from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}`;
        } else if (type === 'upcoming' && startDate && endDate) {
          endpoint += `&from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}`;
        }

        console.log(`API call: ${endpoint}`);
        
        const response = await this.client.makeRequest(endpoint);
        
        if (!response || !response.webinars) {
          console.log(`No webinars found for ${type} - page ${pageNumber}`);
          break;
        }

        const pageWebinars = response.webinars;
        allWebinars.push(...pageWebinars);
        
        console.log(`Found ${pageWebinars.length} ${type} webinars on page ${pageNumber}`);
        console.log(`Total ${type} webinars so far: ${allWebinars.length}`);

        // Check if there are more pages
        const totalPages = response.page_count || 1;
        hasMorePages = pageNumber < totalPages && pageWebinars.length === pageSize;
        pageNumber++;

        // Safety break to prevent infinite loops
        if (pageNumber > 50) {
          console.log(`Safety break: reached page limit for ${type} webinars`);
          break;
        }

      } catch (error) {
        console.error(`Error fetching ${type} webinars page ${pageNumber}:`, error);
        
        // If it's a 404 or similar, break the loop
        if (error.status === 404 || error.status === 400) {
          console.log(`API indicates no more ${type} webinars available`);
          break;
        }
        
        // For other errors, try to continue but limit retries
        if (pageNumber === 1) {
          throw error; // Fail fast if the first page fails
        }
        break;
      }
    }

    console.log(`✅ Completed fetching ${type} webinars: ${allWebinars.length} total`);
    return allWebinars;
  }

  /**
   * Remove duplicate webinars based on webinar ID
   */
  private deduplicateWebinars(webinars: any[]): { uniqueWebinars: any[]; duplicatesRemoved: number } {
    const seenIds = new Set<string>();
    const uniqueWebinars: any[] = [];
    let duplicatesRemoved = 0;

    for (const webinar of webinars) {
      const webinarId = webinar.id?.toString() || webinar.webinar_id?.toString();
      
      if (!webinarId) {
        console.warn('Webinar found without ID, skipping:', webinar);
        continue;
      }

      if (seenIds.has(webinarId)) {
        duplicatesRemoved++;
        console.log(`Duplicate webinar removed: ${webinarId} (${webinar.topic})`);
      } else {
        seenIds.add(webinarId);
        uniqueWebinars.push(webinar);
      }
    }

    return { uniqueWebinars, duplicatesRemoved };
  }
}
