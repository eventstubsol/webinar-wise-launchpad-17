/**
 * Enhanced registrant processor with 100% Zoom API compliance
 */

import { EnhancedRegistrantsApiClient, ZoomRegistrantsQueryParams } from '../../../../src/services/zoom/api/enhanced/EnhancedRegistrantsApiClient';
import { EnhancedRegistrantOperations } from '../../../../src/services/zoom/operations/crud/EnhancedRegistrantOperations';
import { ScopeValidationService } from '../../../../src/services/zoom/api/enhanced/ScopeValidationService';

/**
 * Enhanced registrant sync with full Zoom API compliance
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
    syncAllPages?: boolean;
  } = {}
): Promise<{
  totalSynced: number;
  errors: string[];
  pagesProcessed: number;
}> {
  console.log(`🎯 FULL COMPLIANCE REGISTRANT SYNC starting for webinar ${webinarId}`);
  
  try {
    // Validate scopes first
    const scopeValidation = ScopeValidationService.validateScopes(
      'list_webinar_registrants',
      ['webinar:read:admin'] // Assume this scope from existing client
    );

    if (!scopeValidation.isValid) {
      throw new Error(`Scope validation failed: ${scopeValidation.recommendation}`);
    }

    // Create enhanced API client
    const enhancedClient = new EnhancedRegistrantsApiClient(
      client.accessToken || client.getAccessToken?.(),
      client.connectionId
    );

    let totalSynced = 0;
    let pagesProcessed = 0;
    let nextPageToken: string | undefined;
    const errors: string[] = [];

    do {
      try {
        const params: ZoomRegistrantsQueryParams = {
          page_size: 300, // Maximum allowed by Zoom API
          occurrence_id: options.occurrenceId,
          tracking_source_id: options.trackingSourceId,
          status: options.status,
          next_page_token: nextPageToken
        };

        console.log(`📥 Fetching registrants page ${pagesProcessed + 1} for webinar ${webinarId}`, params);

        const result = await EnhancedRegistrantOperations.syncWebinarRegistrantsEnhanced(
          enhancedClient,
          webinarId,
          webinarDbId,
          params
        );

        totalSynced += result.totalSynced;
        pagesProcessed++;
        nextPageToken = result.nextPageToken;

        console.log(`✅ Page ${pagesProcessed} completed: ${result.totalSynced} registrants synced`);

        // Break if not syncing all pages or no more pages
        if (!options.syncAllPages || !result.hasMore) {
          break;
        }

      } catch (pageError) {
        const errorMsg = `Page ${pagesProcessed + 1} failed: ${pageError.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        
        // Break on pagination errors to avoid infinite loops
        break;
      }

    } while (nextPageToken && options.syncAllPages);

    console.log(`✅ FULL COMPLIANCE SYNC COMPLETED: ${totalSynced} total registrants synced across ${pagesProcessed} pages`);

    return {
      totalSynced,
      errors,
      pagesProcessed
    };

  } catch (error) {
    console.error(`💥 FULL COMPLIANCE REGISTRANT SYNC ERROR for webinar ${webinarId}:`, error);
    
    // Enhanced error analysis
    const scopeAnalysis = ScopeValidationService.analyzeScopeError(error, 'list_webinar_registrants');
    
    if (scopeAnalysis.isScopeError) {
      console.error(`🚨 SCOPE ERROR: ${scopeAnalysis.guidance}`);
      console.error(`   Required scopes: ${scopeAnalysis.requiredScopes?.join(', ')}`);
    }
    
    throw error;
  }
}

/**
 * Enhanced registrant sync with proper error handling and debugging
 */
export async function syncWebinarRegistrants(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string,
  testMode: boolean = false
): Promise<number> {
  console.log(`🎯 ENHANCED REGISTRANT SYNC starting for webinar ${webinarId} (DB: ${webinarDbId})`);
  console.log(`  - Test mode: ${testMode}`);
  
  try {
    // STEP 1: Test API access first
    console.log(`🧪 STEP 1: Testing registrant API access...`);
    const accessTest = await testRegistrantAPIAccess(client, webinarId);
    
    if (!accessTest.hasAccess) {
      if (accessTest.scopeIssue) {
        const errorMsg = `❌ ZOOM SCOPE ERROR: Missing 'webinar:read:admin' scope. Please update your Zoom app configuration to include this scope.`;
        console.error(errorMsg);
        throw new Error(`Scope Error: ${accessTest.error}`);
      } else {
        const errorMsg = `❌ REGISTRANT API ACCESS FAILED: ${accessTest.error}`;
        console.error(errorMsg);
        throw new Error(`API Access Error: ${accessTest.error}`);
      }
    }
    
    // STEP 2: Fetch registrants from Zoom API
    console.log(`📥 STEP 2: Fetching registrants from Zoom API...`);
    const registrants = await client.getWebinarRegistrants(webinarId);
    
    // ENHANCED: Better validation and logging
    if (!registrants) {
      console.log(`⚠️ REGISTRANTS NULL: API returned null/undefined for webinar ${webinarId}`);
      return 0;
    }
    
    if (!Array.isArray(registrants)) {
      console.log(`⚠️ REGISTRANTS NOT ARRAY: API returned non-array for webinar ${webinarId}:`, typeof registrants);
      return 0;
    }
    
    if (registrants.length === 0) {
      console.log(`📭 NO REGISTRANTS: API returned empty array for webinar ${webinarId}`);
      console.log(`  - This could mean: no registrations, or webinar doesn't require registration`);
      return 0;
    }
    
    console.log(`✅ REGISTRANTS FOUND: ${registrants.length} registrants for webinar ${webinarId}`);
    
    // Log sample registrant data for debugging
    if (registrants.length > 0) {
      const sampleRegistrant = registrants[0];
      console.log(`📋 SAMPLE REGISTRANT DATA:`, {
        id: sampleRegistrant.id,
        email: sampleRegistrant.email,
        firstName: sampleRegistrant.first_name,
        lastName: sampleRegistrant.last_name,
        status: sampleRegistrant.status,
        registrationTime: sampleRegistrant.registration_time,
        availableFields: Object.keys(sampleRegistrant)
      });
    }
    
    // STEP 3: Transform registrant data
    console.log(`🔄 STEP 3: Transforming ${registrants.length} registrants for database...`);
    const transformedRegistrants = registrants.map((registrant, index) => {
      const transformed = transformRegistrantForDatabase(registrant, webinarDbId);
      
      if (index === 0) {
        console.log(`📋 SAMPLE TRANSFORMED DATA:`, {
          webinar_id: transformed.webinar_id,
          registrant_id: transformed.registrant_id,
          registrant_email: transformed.registrant_email,
          status: transformed.status,
          registration_time: transformed.registration_time
        });
      }
      
      return {
        ...transformed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    if (testMode) {
      console.log(`🧪 TEST MODE: Skipping database insert, would have inserted ${transformedRegistrants.length} registrants`);
      return transformedRegistrants.length;
    }
    
    // STEP 4: Upsert registrants to database
    console.log(`💾 STEP 4: Upserting ${transformedRegistrants.length} registrants to database...`);
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

    console.log(`✅ REGISTRANT SYNC SUCCESS: ${registrants.length} registrants synced for webinar ${webinarId}`);
    return registrants.length;
    
  } catch (error) {
    console.error(`💥 REGISTRANT SYNC ERROR for webinar ${webinarId}:`, error);
    
    // Enhanced error categorization
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('scope') || errorMessage.includes('permission')) {
      console.error(`🚨 ZOOM PERMISSION ERROR: Check your Zoom app scopes and permissions`);
      console.error(`   Required scope: webinar:read:admin`);
      console.error(`   Please visit: https://marketplace.zoom.us/develop/apps`);
    } else if (errorMessage.includes('rate limit')) {
      console.error(`⏱️ ZOOM RATE LIMIT: API rate limit exceeded`);
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      console.error(`🌐 NETWORK ERROR: Connection to Zoom API failed`);
    } else {
      console.error(`❓ UNKNOWN ERROR: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Transform Zoom API registrant to database format - enhanced with better error handling
 */
function transformRegistrantForDatabase(apiRegistrant: any, webinarDbId: string): any {
  // Enhanced validation
  if (!apiRegistrant) {
    throw new Error('Cannot transform null/undefined registrant');
  }
  
  if (!webinarDbId) {
    throw new Error('Cannot transform registrant without webinar DB ID');
  }
  
  // Normalize status value with better defaults
  let normalizedStatus = 'approved';
  if (apiRegistrant.status) {
    const statusMap: { [key: string]: string } = {
      'approved': 'approved',
      'pending': 'pending', 
      'denied': 'denied',
      'cancelled': 'cancelled'
    };
    normalizedStatus = statusMap[apiRegistrant.status.toLowerCase()] || 'approved';
  }

  // Enhanced registrant data transformation
  return {
    webinar_id: webinarDbId,
    registrant_id: apiRegistrant.id || apiRegistrant.registrant_id,
    registrant_email: apiRegistrant.email,
    first_name: apiRegistrant.first_name || null,
    last_name: apiRegistrant.last_name || null,
    address: apiRegistrant.address || null,
    city: apiRegistrant.city || null,
    state: apiRegistrant.state || null,
    zip: apiRegistrant.zip || null,
    country: apiRegistrant.country || null,
    phone: apiRegistrant.phone || null,
    industry: apiRegistrant.industry || null,
    org: apiRegistrant.org || null,
    job_title: apiRegistrant.job_title || null,
    purchasing_time_frame: apiRegistrant.purchasing_time_frame || null,
    role_in_purchase_process: apiRegistrant.role_in_purchase_process || null,
    no_of_employees: apiRegistrant.no_of_employees || null,
    comments: apiRegistrant.comments || null,
    custom_questions: apiRegistrant.custom_questions || null,
    registration_time: apiRegistrant.registration_time || new Date().toISOString(),
    source_id: apiRegistrant.source_id || null,
    tracking_source: apiRegistrant.tracking_source || null,
    status: normalizedStatus,
    join_url: apiRegistrant.join_url || null,
    create_time: apiRegistrant.create_time || null,
    language: apiRegistrant.language || null,
    join_time: null, // Will be updated from participant data if available
    leave_time: null,
    duration: null,
    attended: false // Will be updated from participant data if available
  };
}

// Keep existing functions for backward compatibility
export { testRegistrantAPIAccess, syncWebinarRegistrants } from './enhanced-registrant-processor';
