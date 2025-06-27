
import { supabase } from '@/integrations/supabase/client';
import { ZoomDataTransformers } from '../../utils/dataTransformers';

/**
 * Database operations for webinar CRUD
 */
export class WebinarOperations {
  /**
   * Upsert webinar data
   */
  static async upsertWebinar(webinarData: any, connectionId: string): Promise<string> {
    const transformedWebinar = ZoomDataTransformers.transformWebinarForDatabase(webinarData, connectionId);
    
    // Map transformed data to match exact database schema
    const dbWebinar = {
      connection_id: transformedWebinar.connection_id,
      zoom_webinar_id: transformedWebinar.webinar_id, // Map webinar_id to zoom_webinar_id
      webinar_type: transformedWebinar.type || 5, // Map type to webinar_type with default
      host_id: transformedWebinar.host_id,
      host_email: transformedWebinar.host_email,
      topic: transformedWebinar.topic,
      agenda: transformedWebinar.agenda,
      status: transformedWebinar.status,
      start_time: transformedWebinar.start_time,
      duration: transformedWebinar.duration || 0, // Ensure duration is not null
      timezone: transformedWebinar.timezone,
      registration_url: transformedWebinar.registration_url,
      join_url: transformedWebinar.join_url,
      participant_sync_status: transformedWebinar.participant_sync_status || 'not_applicable',
      participant_sync_attempted_at: transformedWebinar.participant_sync_attempted_at,
      participant_sync_completed_at: transformedWebinar.participant_sync_completed_at,
      participant_sync_error: transformedWebinar.participant_sync_error,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert(
        dbWebinar,
        {
        onConflict: 'connection_id,zoom_webinar_id',
        ignoreDuplicates: false
        }
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to upsert webinar: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Get webinar by Zoom ID and connection
   */
  static async getWebinarByZoomId(zoomWebinarId: string, connectionId: string): Promise<any> {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('id, zoom_webinar_id, updated_at')
      .eq('zoom_webinar_id', zoomWebinarId)
      .eq('connection_id', connectionId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to fetch webinar: ${error.message}`);
    }

    return data;
  }
}
