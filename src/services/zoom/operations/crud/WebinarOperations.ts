
import { supabase } from '@/integrations/supabase/client';

/**
 * Database operations for webinars
 */
export class WebinarOperations {
  /**
   * Upsert webinar data
   */
  static async upsertWebinar(webinarData: any, connectionId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('zoom_webinars')
        .upsert(
          {
            ...webinarData,
            connection_id: connectionId,
            updated_at_db: new Date().toISOString() // Use correct field name
          },
          {
            onConflict: 'connection_id,webinar_id',
            ignoreDuplicates: false
          }
        )
        .select('id')
        .single();

      if (error) {
        console.error('Failed to upsert webinar:', error);
        throw new Error(`Failed to upsert webinar: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error('Error in upsertWebinar:', error);
      throw error;
    }
  }

  /**
   * Get webinar by zoom webinar ID
   */
  static async getWebinarByZoomId(zoomWebinarId: string, connectionId: string) {
    try {
      const { data, error } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('webinar_id', zoomWebinarId)
        .eq('connection_id', connectionId)
        .maybeSingle();

      if (error) {
        console.error('Failed to get webinar:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting webinar:', error);
      return null;
    }
  }

  /**
   * Update webinar sync status
   */
  static async updateSyncStatus(webinarId: string, status: string, errorMessage?: string) {
    try {
      const updates: any = {
        participant_sync_status: status,
        participant_sync_attempted_at: new Date().toISOString(),
        updated_at_db: new Date().toISOString()
      };

      if (errorMessage) {
        updates.participant_sync_error = errorMessage;
      }

      const { error } = await supabase
        .from('zoom_webinars')
        .update(updates)
        .eq('id', webinarId);

      if (error) {
        console.error('Failed to update sync status:', error);
      }
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }
}
