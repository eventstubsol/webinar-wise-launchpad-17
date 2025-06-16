
import { supabase } from '@/integrations/supabase/client';
import { ZoomDataTransformers } from '../../utils/dataTransformers';

/**
 * Database operations for webinar registrants
 */
export class RegistrantOperations {
  /**
   * Upsert registrants for a webinar
   */
  static async upsertRegistrants(registrants: any[], webinarDbId: string): Promise<void> {
    if (!registrants || registrants.length === 0) return;

    const transformedRegistrants = registrants.map(registrant => {
      const transformed = ZoomDataTransformers.transformRegistrant(registrant, webinarDbId);
      return {
        ...transformed,
        custom_questions: transformed.custom_questions ? JSON.parse(JSON.stringify(transformed.custom_questions)) : null,
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
      throw new Error(`Failed to upsert registrants: ${error.message}`);
    }
  }

  /**
   * Get registrant count for a webinar
   */
  static async getRegistrantCount(webinarDbId: string): Promise<number> {
    const { count, error } = await supabase
      .from('zoom_registrants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarDbId);

    if (error) {
      console.error('Failed to get registrant count:', error);
      return 0;
    }

    return count || 0;
  }
}
