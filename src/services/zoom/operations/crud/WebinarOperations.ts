
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
    
    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert(
        {
          ...transformedWebinar,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'connection_id,webinar_id',
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
      .select('id, webinar_id, updated_at')
      .eq('webinar_id', zoomWebinarId)
      .eq('connection_id', connectionId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to fetch webinar: ${error.message}`);
    }

    return data;
  }
}
