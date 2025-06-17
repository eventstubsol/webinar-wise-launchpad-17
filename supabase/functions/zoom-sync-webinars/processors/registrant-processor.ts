
/**
 * Sync registrants for a specific webinar
 */
export async function syncWebinarRegistrants(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string
): Promise<number> {
  console.log(`Syncing registrants for webinar ${webinarId}`);
  
  try {
    // Fetch registrants from Zoom API
    const registrants = await client.getWebinarRegistrants(webinarId);
    
    if (!registrants || registrants.length === 0) {
      console.log(`No registrants found for webinar ${webinarId}`);
      return 0;
    }
    
    console.log(`Found ${registrants.length} registrants for webinar ${webinarId}`);
    
    // Transform registrant data to match database schema
    const transformedRegistrants = registrants.map(registrant => {
      const transformed = transformRegistrantForDatabase(registrant, webinarDbId);
      return {
        ...transformed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    // Upsert registrants to database
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
      console.error('Failed to upsert registrants:', error);
      throw new Error(`Failed to upsert registrants: ${error.message}`);
    }

    console.log(`Successfully synced ${registrants.length} registrants for webinar ${webinarId}`);
    return registrants.length;
    
  } catch (error) {
    console.error(`Error syncing registrants for webinar ${webinarId}:`, error);
    throw error;
  }
}

/**
 * Transform Zoom API registrant to database format
 */
function transformRegistrantForDatabase(apiRegistrant: any, webinarDbId: string): any {
  // Normalize status value
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
