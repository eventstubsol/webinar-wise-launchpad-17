
/**
 * Registrant processor that delegates to the enhanced self-contained implementation
 */

import { syncWebinarRegistrantsFullCompliance, testRegistrantAPIAccess } from './enhanced-registrant-processor.ts';

/**
 * Enhanced registrant sync with full Zoom API compliance - delegates to enhanced processor
 */
export async function syncWebinarRegistrants(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string,
  testMode: boolean = false
): Promise<number> {
  console.log(`🎯 DELEGATING to enhanced registrant sync for webinar ${webinarId} (DB: ${webinarDbId})`);
  console.log(`  - Test mode: ${testMode}`);
  
  try {
    const result = await syncWebinarRegistrantsFullCompliance(
      supabase,
      client,
      webinarId,
      webinarDbId,
      {
        syncAllPages: true, // Always sync all pages for complete data
        status: 'approved' // Default to approved registrants
      }
    );

    console.log(`✅ ENHANCED SYNC COMPLETED: ${result.totalSynced} registrants synced across ${result.pagesProcessed} pages`);
    
    if (result.errors && result.errors.length > 0) {
      console.error(`⚠️ SYNC WARNINGS: ${result.errors.join(', ')}`);
    }

    return result.totalSynced;
    
  } catch (error) {
    console.error(`💥 DELEGATED REGISTRANT SYNC ERROR for webinar ${webinarId}:`, error);
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

// Export the test function for backward compatibility
export { testRegistrantAPIAccess };
