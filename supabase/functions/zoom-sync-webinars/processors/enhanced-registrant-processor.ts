
/**
 * Enhanced registrant processor with 100% Zoom API compliance and complete pagination
 * Now uses the main ZoomAPIClient with proper pagination from zoom-api-client.ts
 */

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

/**
 * Enhanced registrant sync with full pagination using the main ZoomAPIClient
 */
export async function syncWebinarRegistrantsFullCompliance(
  supabase: any,
  client: any, // This is the main ZoomAPIClient with proper pagination
  webinarId: string,
  webinarDbId: string,
  options: {
    occurrenceId?: string;
    trackingSourceId?: string;
    status?: 'pending' | 'approved' | 'denied';
    maxPages?: number;
    syncAllPages?: boolean;
  } = {}
): Promise<{
  totalSynced: number;
  errors: string[];
  pagesProcessed: number;
  warnings: string[];
}> {
  console.log(`🎯 FULL COMPLIANCE REGISTRANT SYNC starting for webinar ${webinarId}`);
  console.log(`🔧 CLIENT VERIFICATION: Using main ZoomAPIClient with proper pagination`);
  console.log(`📋 OPTIONS: syncAllPages=${options.syncAllPages}, status=${options.status}, maxPages=${options.maxPages}`);
  
  try {
    // Use the main ZoomAPIClient's getWebinarRegistrants method which has proper pagination
    console.log(`📡 CALLING client.getWebinarRegistrants for webinar ${webinarId}`);
    console.log(`🔍 CLIENT TYPE: ${client.constructor?.name || 'Unknown'}`);
    
    // Call the properly fixed getWebinarRegistrants method from zoom-api-client.ts
    // This method already handles ALL pagination internally and returns ALL registrants
    const allRegistrants = await client.getWebinarRegistrants(webinarId, {
      status: options.status || 'approved'
    });

    console.log(`✅ REGISTRANTS RETRIEVED: ${allRegistrants.length} total registrants from client.getWebinarRegistrants`);

    if (!allRegistrants || allRegistrants.length === 0) {
      console.log(`📭 NO REGISTRANTS: Found 0 registrants for webinar ${webinarId}`);
      return { 
        totalSynced: 0, 
        errors: [],
        pagesProcessed: 0,
        warnings: []
      };
    }

    // Transform registrant data for database
    console.log(`🔄 TRANSFORMING ${allRegistrants.length} registrants for database storage`);
    const transformedRegistrants = allRegistrants.map(registrant => ({
      webinar_id: webinarDbId,
      registrant_id: registrant.id || registrant.registrant_id,
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
      status: registrant.status || 'approved',
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
    
    console.log(`💾 UPSERTING ${transformedRegistrants.length} registrants to database`);
    
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

    console.log(`🎉 FULL COMPLIANCE SYNC COMPLETED: ${allRegistrants.length} total registrants synced`);
    console.log(`📊 PAGINATION INFO: All pages processed automatically by main ZoomAPIClient`);

    return {
      totalSynced: allRegistrants.length,
      errors: [],
      pagesProcessed: 1, // The main client handles all pagination internally
      warnings: []
    };

  } catch (error) {
    console.error(`💥 FULL COMPLIANCE REGISTRANT SYNC ERROR for webinar ${webinarId}:`, error);
    console.error(`🔍 ERROR TYPE: ${error.constructor?.name}`);
    console.error(`📝 ERROR MESSAGE: ${error.message}`);
    
    return {
      totalSynced: 0,
      errors: [error.message],
      pagesProcessed: 0,
      warnings: []
    };
  }
}

/**
 * Test API access using the main ZoomAPIClient
 */
export async function testRegistrantAPIAccess(client: any, webinarId: string): Promise<{
  hasAccess: boolean;
  error?: string;
  scopeIssue?: boolean;
}> {
  console.log(`🧪 TESTING REGISTRANT API ACCESS for webinar ${webinarId}`);
  console.log(`🔧 CLIENT TYPE: ${client.constructor?.name || 'Unknown'}`);
  
  try {
    // Use the main client's method to test access with minimal data
    console.log(`📡 CALLING client.getWebinarRegistrants for access test`);
    const testResult = await client.getWebinarRegistrants(webinarId, {
      status: 'approved'
    });
    
    console.log(`✅ ACCESS TEST SUCCESS: Retrieved ${testResult?.length || 0} registrants`);
    return { hasAccess: true };
  } catch (error) {
    console.error(`❌ ACCESS TEST FAILED:`, error);
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
