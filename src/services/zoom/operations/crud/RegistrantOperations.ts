
import { supabase } from '@/integrations/supabase/client';
import { WebinarTransformers } from '../../utils/transformers/webinarTransformers';

/**
 * Database operations for webinar registrants
 */
export class RegistrantOperations {
  /**
   * Upsert registrants for a webinar
   */
  static async upsertRegistrants(registrants: any[], webinarDbId: string): Promise<void> {
    if (!registrants || registrants.length === 0) {
      console.log('No registrants to upsert');
      return;
    }

    try {
      // Process registrants one by one to handle missing fields properly
      for (const registrant of registrants) {
        const transformed = WebinarTransformers.transformRegistrant(registrant, webinarDbId);
        
        const registrantData = {
          ...transformed,
          email: transformed.registrant_email || 'unknown@example.com',
          custom_questions: transformed.custom_questions ? JSON.parse(JSON.stringify(transformed.custom_questions)) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('zoom_registrants')
          .upsert(
            registrantData,
            {
              onConflict: 'webinar_id,registrant_id',
              ignoreDuplicates: false
            }
          );

        if (error) {
          console.error('Failed to upsert registrant:', error);
          // Continue with next registrant instead of throwing
        }
      }

      console.log(`Successfully processed ${registrants.length} registrants`);
    } catch (error) {
      console.error('Error in upsertRegistrants:', error);
      throw error;
    }
  }

  /**
   * Get registrant count for a webinar
   */
  static async getRegistrantCount(webinarDbId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('zoom_registrants')
        .select('*', { count: 'exact', head: true })
        .eq('webinar_id', webinarDbId);

      if (error) {
        console.error('Failed to get registrant count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting registrant count:', error);
      return 0;
    }
  }

  /**
   * Get registrants with attendance status
   */
  static async getRegistrantsWithAttendance(webinarDbId: string) {
    try {
      const { data: registrants, error } = await supabase
        .from('zoom_registrants')
        .select(`
          *,
          zoom_participants!inner(
            join_time,
            leave_time,
            duration,
            attentiveness_score
          )
        `)
        .eq('webinar_id', webinarDbId)
        .order('registration_time', { ascending: true });

      if (error) {
        console.error('Failed to get registrants with attendance:', error);
        return [];
      }

      return registrants || [];
    } catch (error) {
      console.error('Error getting registrants with attendance:', error);
      return [];
    }
  }
}
