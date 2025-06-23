
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
      const transformedRegistrants = registrants.map(registrant => {
        const transformed = WebinarTransformers.transformRegistrant(registrant, webinarDbId);
        return {
          // Map to correct database field names based on actual schema
          webinar_id: webinarDbId,
          registrant_id: transformed.registrant_id,
          registrant_uuid: transformed.registrant_uuid,
          email: transformed.registrant_email, // Use 'email' not 'registrant_email'
          first_name: transformed.first_name,
          last_name: transformed.last_name,
          address: transformed.address,
          city: transformed.city,
          country: transformed.country,
          zip: transformed.zip,
          state: transformed.state,
          phone: transformed.phone,
          industry: transformed.industry,
          org: transformed.org,
          job_title: transformed.job_title,
          purchasing_time_frame: transformed.purchasing_time_frame,
          role_in_purchase_process: transformed.role_in_purchase_process,
          no_of_employees: transformed.no_of_employees,
          comments: transformed.comments,
          status: transformed.status,
          create_time: transformed.create_time,
          join_url: transformed.join_url,
          custom_questions: transformed.custom_questions ? JSON.parse(JSON.stringify(transformed.custom_questions)) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

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

      console.log(`Successfully upserted ${registrants.length} registrants`);
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
        .order('create_time', { ascending: true });

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
