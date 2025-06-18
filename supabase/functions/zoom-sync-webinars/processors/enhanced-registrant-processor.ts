
/**
 * Enhanced registrant processor with 100% Zoom API compliance and complete pagination
 */
import { EnhancedRegistrantsApiClient, ZoomRegistrantsQueryParams } from '../../../../src/services/zoom/api/enhanced/EnhancedRegistrantsApiClient';
import { EnhancedRegistrantOperations } from '../../../../src/services/zoom/operations/crud/EnhancedRegistrantOperations';

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
    const enhancedClient = new EnhancedRegistrantsApiClient(
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

        const result = await EnhancedRegistrantOperations.syncWebinarRegistrantsEnhanced(
          enhancedClient,
          webinarId,
          webinarDbId,
          params,
          client.userId || client.connectionId
        );

        totalSynced += result.totalSynced;
        pagesProcessed++;
        nextPageToken = result.nextPageToken;

        if (result.warnings) {
          allWarnings.push(...result.warnings);
        }

        console.log(`✅ PAGE ${pagesProcessed} COMPLETED: ${result.totalSynced} registrants synced, hasMore: ${result.hasMore}`);

        // Safety check for infinite loops
        if (pagesProcessed >= maxPages) {
          console.warn(`⚠️ SAFETY LIMIT: Reached maximum pages (${maxPages}) for webinar ${webinarId}`);
          break;
        }

        // Break if no more pages or no more data
        if (!result.hasMore || !nextPageToken) {
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
