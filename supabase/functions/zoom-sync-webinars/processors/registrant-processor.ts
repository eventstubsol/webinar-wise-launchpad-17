
/**
 * Enhanced registrant processor with proper error handling and scope detection
 * UPDATED: Now triggers metrics update after successful registrant sync
 */

/**
 * Update webinar metrics after registrant sync
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

    // Get registrant count
    const { count: registrantCount, error: registrantsError } = await supabase
      .from('zoom_registrants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarDbId);

    if (registrantsError) {
      console.error('❌ Failed to fetch registrants count:', registrantsError);
      return;
    }

    // Calculate metrics
    const totalAttendees = participants?.length || 0;
    const totalRegistrants = registrantCount || 0;
    const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
    const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;
    const totalAbsentees = Math.max(0, totalRegistrants - totalAttendees);

    // Update webinar with calculated metrics
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: totalRegistrants,
        total_attendees: totalAttendees,
        total_absentees: totalAbsentees,
        total_minutes: totalMinutes,
        avg_attendance_duration: avgDuration,
        attendees_count: totalAttendees,
        registrants_count: totalRegistrants,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (updateError) {
      console.error('❌ Failed to update webinar metrics:', updateError);
      throw updateError;
    }

    console.log(`✅ METRICS UPDATED after registrant sync for webinar ${webinarDbId}:`);
    console.log(`  👥 Attendees: ${totalAttendees}`);
    console.log(`  📝 Registrants: ${totalRegistrants}`);
    console.log(`  ⏱️ Total Minutes: ${totalMinutes}`);
    console.log(`  📊 Avg Duration: ${avgDuration}m`);
    console.log(`  ❌ Absentees: ${totalAbsentees}`);
  } catch (error) {
    console.error('❌ Error updating webinar metrics after registrant sync:', error);
    // Don't throw - metrics update failure shouldn't fail the sync
  }
}

/**
 * NEW: Test Zoom API registrant access and scopes
 */
export async function testRegistrantAPIAccess(client: any, webinarId: string): Promise<{
  hasAccess: boolean;
  error?: string;
  scopeIssue?: boolean;
}> {
  console.log(`🧪 TESTING registrant API access for webinar ${webinarId}...`);
  
  try {
    // Try to fetch registrants - this will reveal scope issues
    const registrants = await client.getWebinarRegistrants(webinarId);
    
    if (Array.isArray(registrants)) {
      console.log(`✅ REGISTRANT API ACCESS: Success - found ${registrants.length} registrants`);
      return { hasAccess: true };
    } else {
      console.log(`⚠️ REGISTRANT API ACCESS: Unexpected response format:`, registrants);
      return { hasAccess: false, error: 'Unexpected API response format' };
    }
  } catch (error) {
    console.error(`❌ REGISTRANT API ACCESS ERROR:`, error);
    
    // Check for specific scope/permission errors
    const errorMessage = error.message?.toLowerCase() || '';
    const isScopeIssue = errorMessage.includes('scope') || 
                        errorMessage.includes('permission') || 
                        errorMessage.includes('unauthorized') ||
                        errorMessage.includes('forbidden');
    
    if (isScopeIssue) {
      console.error(`🚨 SCOPE ISSUE DETECTED: Missing webinar:read:admin scope or insufficient permissions`);
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
 * UPDATED: Now triggers metrics update after successful registrant sync
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
      // Still update metrics even if no registrants
      await updateWebinarMetricsAfterRegistrantSync(supabase, webinarDbId);
      return 0;
    }
    
    if (!Array.isArray(registrants)) {
      console.log(`⚠️ REGISTRANTS NOT ARRAY: API returned non-array for webinar ${webinarId}:`, typeof registrants);
      // Still update metrics even if no registrants
      await updateWebinarMetricsAfterRegistrantSync(supabase, webinarDbId);
      return 0;
    }
    
    if (registrants.length === 0) {
      console.log(`📭 NO REGISTRANTS: API returned empty array for webinar ${webinarId}`);
      console.log(`  - This could mean: no registrations, or webinar doesn't require registration`);
      // Still update metrics even if no registrants
      await updateWebinarMetricsAfterRegistrantSync(supabase, webinarDbId);
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

    // CRITICAL FIX: Update metrics AFTER successful registrant sync
    await updateWebinarMetricsAfterRegistrantSync(supabase, webinarDbId);

    console.log(`✅ REGISTRANT SYNC SUCCESS: ${registrants.length} registrants synced for webinar ${webinarId}`);
    console.log(`  - Metrics updated: YES`);
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
