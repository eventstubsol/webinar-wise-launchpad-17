
/**
 * Enhanced registrant processor with proper error handling and scope detection
 * FIXED: Now properly triggers metrics update after successful registrant sync
 */

/**
 * Update webinar metrics after registrant sync - ENHANCED VERSION
 */
async function updateWebinarMetricsAfterRegistrantSync(supabase: any, webinarDbId: string): Promise<void> {
  try {
    console.log(`📊 UPDATING METRICS after registrant sync for webinar: ${webinarDbId}`);
    
    // Get participant metrics
    const { data: participants, error: participantsError } = await supabase
      .from('zoom_participants')
      .select('duration, join_time')
      .eq('webinar_id', webinarDbId);

    if (participantsError) {
      console.error('❌ Failed to fetch participants for metrics:', participantsError);
      return;
    }

    console.log(`📊 Found ${participants?.length || 0} participants for metrics calculation`);

    // Get registrant count
    const { count: registrantCount, error: registrantsError } = await supabase
      .from('zoom_registrants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarDbId);

    if (registrantsError) {
      console.error('❌ Failed to fetch registrants count:', registrantsError);
      return;
    }

    console.log(`📊 Found ${registrantCount || 0} registrants for metrics calculation`);

    // Calculate metrics
    const totalAttendees = participants?.length || 0;
    const totalRegistrants = registrantCount || 0;
    const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
    const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;
    const totalAbsentees = Math.max(0, totalRegistrants - totalAttendees);

    console.log(`📊 Calculated metrics:`, {
      totalAttendees,
      totalRegistrants,
      totalMinutes,
      avgDuration,
      totalAbsentees
    });

    // Update webinar with calculated metrics - ONLY use the primary columns
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: totalRegistrants,
        total_attendees: totalAttendees,
        total_absentees: totalAbsentees,
        total_minutes: totalMinutes,
        avg_attendance_duration: avgDuration,
        // Remove duplicate columns - use only the primary ones
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (updateError) {
      console.error('❌ Failed to update webinar metrics:', updateError);
      throw updateError;
    }

    console.log(`✅ METRICS UPDATED successfully for webinar ${webinarDbId}:`);
    console.log(`  👥 Total Attendees: ${totalAttendees}`);
    console.log(`  📝 Total Registrants: ${totalRegistrants}`);
    console.log(`  ⏱️ Total Minutes: ${totalMinutes}`);
    console.log(`  📊 Avg Duration: ${avgDuration}m`);
    console.log(`  ❌ Total Absentees: ${totalAbsentees}`);
  } catch (error) {
    console.error('❌ Error updating webinar metrics after registrant sync:', error);
    // Don't throw - metrics update failure shouldn't fail the sync
  }
}

/**
 * Test Zoom API registrant access and scopes
 */
export async function testRegistrantAPIAccess(client: any, webinarId: string): Promise<{
  hasAccess: boolean;
  error?: string;
  scopeIssue?: boolean;
}> {
  console.log(`🧪 Testing registrant API access for webinar ${webinarId}...`);
  
  try {
    const registrants = await client.getWebinarRegistrants(webinarId);
    
    if (Array.isArray(registrants)) {
      console.log(`✅ Registrant API access successful - found ${registrants.length} registrants`);
      return { hasAccess: true };
    } else {
      console.log(`⚠️ Unexpected registrant API response format:`, registrants);
      return { hasAccess: false, error: 'Unexpected API response format' };
    }
  } catch (error) {
    console.error(`❌ Registrant API access error:`, error);
    
    const errorMessage = error.message?.toLowerCase() || '';
    const isScopeIssue = errorMessage.includes('scope') || 
                        errorMessage.includes('permission') || 
                        errorMessage.includes('unauthorized') ||
                        errorMessage.includes('forbidden');
    
    if (isScopeIssue) {
      console.error(`🚨 SCOPE ISSUE: Missing webinar:read:admin scope`);
      return { 
        hasAccess: false, 
        error: error.message, 
        scopeIssue: true 
      };
    }
    
    return { hasAccess: false, error: error.message };
  }
}

/**
 * Enhanced sync registrants with proper error handling and debugging
 * FIXED: Now properly triggers metrics update after successful registrant sync
 */
export async function syncWebinarRegistrants(
  supabase: any,
  client: any,
  webinarId: string,
  webinarDbId: string,
  testMode: boolean = false
): Promise<number> {
  console.log(`🚀 Starting registrant sync for webinar ${webinarId} (DB: ${webinarDbId})`);
  
  try {
    // Test API access first
    console.log(`🧪 Testing registrant API access...`);
    const accessTest = await testRegistrantAPIAccess(client, webinarId);
    
    if (!accessTest.hasAccess) {
      if (accessTest.scopeIssue) {
        const errorMsg = `❌ ZOOM SCOPE ERROR: Missing 'webinar:read:admin' scope`;
        console.error(errorMsg);
        throw new Error(`Scope Error: ${accessTest.error}`);
      } else {
        const errorMsg = `❌ REGISTRANT API ACCESS FAILED: ${accessTest.error}`;
        console.error(errorMsg);
        throw new Error(`API Access Error: ${accessTest.error}`);
      }
    }
    
    // Fetch registrants from Zoom API
    console.log(`🔄 Fetching registrants from Zoom API...`);
    const registrants = await client.getWebinarRegistrants(webinarId);
    
    if (!registrants) {
      console.log(`📭 No registrants returned for webinar ${webinarId}`);
      await updateWebinarMetricsAfterRegistrantSync(supabase, webinarDbId);
      return 0;
    }
    
    if (!Array.isArray(registrants)) {
      console.log(`⚠️ Registrants not an array for webinar ${webinarId}:`, typeof registrants);
      await updateWebinarMetricsAfterRegistrantSync(supabase, webinarDbId);
      return 0;
    }
    
    if (registrants.length === 0) {
      console.log(`📭 Empty registrants array for webinar ${webinarId}`);
      await updateWebinarMetricsAfterRegistrantSync(supabase, webinarDbId);
      return 0;
    }
    
    console.log(`📊 Found ${registrants.length} registrants for webinar ${webinarId}`);
    
    // Log sample registrant data for debugging
    if (registrants.length > 0) {
      console.log(`📋 Sample registrant:`, {
        id: registrants[0].id,
        email: registrants[0].email,
        firstName: registrants[0].first_name,
        status: registrants[0].status
      });
    }
    
    // Transform registrant data
    console.log(`🔄 Transforming ${registrants.length} registrants...`);
    const transformedRegistrants = registrants.map((registrant) => {
      const transformed = transformRegistrantForDatabase(registrant, webinarDbId);
      
      return {
        ...transformed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    if (testMode) {
      console.log(`🧪 TEST MODE: Would insert ${transformedRegistrants.length} registrants`);
      return transformedRegistrants.length;
    }
    
    // Upsert registrants to database
    console.log(`💾 Saving ${transformedRegistrants.length} registrants to database...`);
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
      console.error(`❌ Database upsert error:`, error);
      throw new Error(`Failed to upsert registrants: ${error.message}`);
    }

    console.log(`✅ Successfully saved ${registrants.length} registrants`);

    // CRITICAL: Update metrics AFTER successful registrant sync
    console.log(`📊 Triggering metrics update for webinar ${webinarDbId}`);
    await updateWebinarMetricsAfterRegistrantSync(supabase, webinarDbId);

    console.log(`🎉 Registrant sync completed successfully for webinar ${webinarId}`);
    return registrants.length;
    
  } catch (error) {
    console.error(`💥 Registrant sync error for webinar ${webinarId}:`, error);
    
    // Enhanced error categorization
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('scope') || errorMessage.includes('permission')) {
      console.error(`🚨 ZOOM PERMISSION ERROR: Check app scopes and permissions`);
    } else if (errorMessage.includes('rate limit')) {
      console.error(`⏱️ ZOOM RATE LIMIT: API rate limit exceeded`);
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      console.error(`🌐 NETWORK ERROR: Connection to Zoom API failed`);
    }
    
    throw error;
  }
}

/**
 * Transform Zoom API registrant to database format - enhanced with better error handling
 */
function transformRegistrantForDatabase(apiRegistrant: any, webinarDbId: string): any {
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

  return {
    webinar_id: webinarDbId,
    registrant_id: apiRegistrant.id || apiRegistrant.registrant_id,
    email: apiRegistrant.email, // Using 'email' instead of 'registrant_email'
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
