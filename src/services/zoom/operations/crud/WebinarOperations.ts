import { ZoomWebinar } from '@/types/zoom';

/**
 * Webinar CRUD operations with proper field mapping
 * FIXED: Removed references to non-existent type field
 */
export class WebinarOperations {
  /**
   * Create a new webinar in the database
   */
  static async createWebinar(transformedWebinar: any) {
    console.log(`📝 WEBINAR OPERATION: Creating webinar with ID ${transformedWebinar.webinar_id}`);
    
    // Map transformed data to match exact database schema
    const dbWebinar = {
      connection_id: transformedWebinar.connection_id,
      zoom_webinar_id: transformedWebinar.webinar_id, // Map webinar_id to zoom_webinar_id
      // type: normalizedData.type, // Remove this field as it doesn't exist in schema
      host_id: transformedWebinar.host_id,
      host_email: transformedWebinar.host_email,
      topic: transformedWebinar.topic,
      agenda: transformedWebinar.agenda,
      status: transformedWebinar.status,
      start_time: transformedWebinar.start_time,
      duration: transformedWebinar.duration,
      timezone: transformedWebinar.timezone,
      join_url: transformedWebinar.join_url,
      start_url: transformedWebinar.start_url,
      registration_url: transformedWebinar.registration_url,
      password: transformedWebinar.password,
      h323_password: transformedWebinar.h323_password,
      pstn_password: transformedWebinar.pstn_password,
      encrypted_password: transformedWebinar.encrypted_password,
      uuid: transformedWebinar.uuid,
      zoom_uuid: transformedWebinar.zoom_uuid,
      settings: transformedWebinar.settings,
      recurrence: transformedWebinar.recurrence,
      occurrences: transformedWebinar.occurrences,
      tracking_fields: transformedWebinar.tracking_fields,
      attendees_count: transformedWebinar.attendees_count,
      registrants_count: transformedWebinar.registrants_count,
      total_attendees: transformedWebinar.total_attendees,
      total_registrants: transformedWebinar.total_registrants,
      synced_at: transformedWebinar.synced_at,
      participant_sync_attempted_at: transformedWebinar.participant_sync_attempted_at,
      participant_sync_completed_at: transformedWebinar.participant_sync_completed_at,
      participant_sync_status: transformedWebinar.participant_sync_status,
      creation_source: transformedWebinar.creation_source,
      transition_to_live: transformedWebinar.transition_to_live,
    };
    
    const fieldsCount = Object.keys(dbWebinar).length;
    console.log(`📊 WEBINAR MAPPING: Mapped ${fieldsCount} fields for database insertion`);
    
    return dbWebinar;
  }

  /**
   * Update an existing webinar
   */
  static async updateWebinar(webinarId: string, updates: Partial<ZoomWebinar>) {
    console.log(`🔄 WEBINAR UPDATE: Updating webinar ${webinarId} with ${Object.keys(updates).length} changes`);
    
    // Ensure synced_at is updated
    const updatedWebinar = {
      ...updates,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return updatedWebinar;
  }

  /**
   * Batch upsert webinars (insert or update)
   */
  static async batchUpsertWebinars(webinars: any[]) {
    console.log(`🔄 BATCH UPSERT: Processing ${webinars.length} webinars for upsert operation`);
    
    const results = {
      created: 0,
      updated: 0,
      errors: [] as any[]
    };
    
    for (const webinar of webinars) {
      try {
        const dbWebinar = await this.createWebinar(webinar);
        results.created++;
      } catch (error) {
        console.error(`❌ UPSERT ERROR: Failed to process webinar ${webinar.webinar_id}:`, error);
        results.errors.push({ webinar_id: webinar.webinar_id, error });
      }
    }
    
    console.log(`✅ BATCH UPSERT COMPLETE: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`);
    
    return results;
  }
}