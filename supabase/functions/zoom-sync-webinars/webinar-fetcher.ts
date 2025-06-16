
import { createZoomAPIClient } from './zoom-api-client.ts';

/**
 * Handles fetching webinars from the Zoom API
 */
export class WebinarFetcher {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Fetch webinars based on sync type
   */
  async fetchWebinars(syncType: string): Promise<any[]> {
    console.log(`🔍 Starting webinar fetch for sync type: ${syncType}`);
    
    let webinars: any[] = [];
    const now = new Date();
    
    if (syncType === 'initial') {
      console.log('📥 Initial sync - fetching comprehensive webinar data');
      
      // For initial sync, get both past and upcoming webinars with extended range
      const pastDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
      const futureDate = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days future
      
      console.log(`📅 Fetching webinars from ${pastDate.toISOString()} to ${futureDate.toISOString()}`);
      
      const [pastWebinars, upcomingWebinars] = await Promise.all([
        this.client.listWebinarsWithRange({
          from: pastDate,
          to: now,
          type: 'past'
        }),
        this.client.listWebinarsWithRange({
          from: now,
          to: futureDate,
          type: 'upcoming'
        })
      ]);
      
      webinars = [...pastWebinars, ...upcomingWebinars];
      console.log(`📊 Initial sync found: ${pastWebinars.length} past + ${upcomingWebinars.length} upcoming = ${webinars.length} total webinars`);
    } else {
      console.log('📥 Incremental sync - fetching recent webinar updates');
      
      // For incremental sync, get recent past and upcoming webinars
      const recentDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
      const futureDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days future
      
      console.log(`📅 Fetching webinars from ${recentDate.toISOString()} to ${futureDate.toISOString()}`);
      
      const [recentWebinars, upcomingWebinars] = await Promise.all([
        this.client.listWebinarsWithRange({
          from: recentDate,
          to: now,
          type: 'past'
        }),
        this.client.listWebinarsWithRange({
          from: now,
          to: futureDate,
          type: 'upcoming'
        })
      ]);
      
      webinars = [...recentWebinars, ...upcomingWebinars];
      console.log(`📊 Incremental sync found: ${recentWebinars.length} recent + ${upcomingWebinars.length} upcoming = ${webinars.length} total webinars`);
    }
    
    // Remove duplicates by webinar ID
    const uniqueWebinars = this.deduplicateWebinars(webinars);
    console.log(`🔄 After deduplication: ${uniqueWebinars.length} unique webinars`);
    
    return uniqueWebinars;
  }

  /**
   * Remove duplicate webinars by ID
   */
  private deduplicateWebinars(webinars: any[]): any[] {
    const seen = new Set();
    const unique = [];
    
    for (const webinar of webinars) {
      if (!seen.has(webinar.id)) {
        seen.add(webinar.id);
        unique.push(webinar);
      }
    }
    
    return unique;
  }
}
