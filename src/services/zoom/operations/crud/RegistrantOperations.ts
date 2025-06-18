
import { supabase } from '@/integrations/supabase/client';
import { WebinarTransformers } from '../../utils/transformers/webinarTransformers';

/**
 * ENHANCED: Database operations for webinar registrants with improved error handling
 */
export class RegistrantOperations {
  /**
   * ENHANCED: Upsert registrants for a webinar with modern field mapping
   */
  static async upsertRegistrants(registrants: any[], webinarDbId: string): Promise<void> {
    if (!registrants || registrants.length === 0) {
      console.log('📭 No registrants to upsert');
      return;
    }

    if (!webinarDbId) {
      throw new Error('❌ Cannot upsert registrants without webinar DB ID');
    }

    try {
      console.log(`🔄 ENHANCED REGISTRANT UPSERT: Processing ${registrants.length} registrants`);
      
      const transformedRegistrants = registrants.map((registrant, index) => {
        try {
          const transformed = WebinarTransformers.transformRegistrant(registrant, webinarDbId);
          
          // Enhanced logging for first registrant
          if (index === 0) {
            console.log(`📋 SAMPLE TRANSFORMED REGISTRANT:`, {
              registrant_id: transformed.registrant_id,
              registrant_uuid: transformed.registrant_uuid, // NEW FIELD
              email: transformed.registrant_email,
              registration_time: transformed.registration_time,
              create_time: transformed.create_time,
              status: transformed.status
            });
          }
          
          return {
            ...transformed,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } catch (transformError) {
          console.error(`❌ Failed to transform registrant at index ${index}:`, transformError);
          throw new Error(`Failed to transform registrant ${index + 1}: ${transformError.message}`);
        }
      });

      console.log(`💾 ENHANCED DATABASE UPSERT: Inserting ${transformedRegistrants.length} transformed registrants`);

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
        console.error('❌ DATABASE UPSERT ERROR:', error);
        throw new Error(`Failed to upsert registrants: ${error.message}`);
      }

      console.log(`✅ ENHANCED REGISTRANT UPSERT SUCCESS: ${registrants.length} registrants processed`);
      
      // Enhanced success logging
      const stats = {
        processed: registrants.length,
        withUuid: transformedRegistrants.filter(r => r.registrant_uuid).length,
        withCreateTime: transformedRegistrants.filter(r => r.create_time).length,
        statusBreakdown: this.calculateStatusBreakdown(transformedRegistrants)
      };
      
      console.log(`📊 REGISTRANT PROCESSING STATS:`, stats);
      
    } catch (error) {
      console.error(`💥 ENHANCED REGISTRANT UPSERT ERROR:`, error);
      throw error;
    }
  }

  /**
   * NEW: Calculate status breakdown for enhanced logging
   */
  private static calculateStatusBreakdown(registrants: any[]): any {
    return registrants.reduce((acc, registrant) => {
      const status = registrant.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
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
   * ENHANCED: Get registrants with attendance status and enhanced fields
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

  /**
   * NEW: Get enhanced registrant statistics for reporting
   */
  static async getRegistrantStatistics(webinarDbId: string): Promise<{
    total: number;
    byStatus: any;
    withUuid: number;
    attended: number;
    attendanceRate: number;
  }> {
    try {
      const { data: registrants, error } = await supabase
        .from('zoom_registrants')
        .select('status, registrant_uuid, attended')
        .eq('webinar_id', webinarDbId);

      if (error) {
        console.error('Failed to get registrant statistics:', error);
        return { total: 0, byStatus: {}, withUuid: 0, attended: 0, attendanceRate: 0 };
      }

      const total = registrants?.length || 0;
      const withUuid = registrants?.filter(r => r.registrant_uuid).length || 0;
      const attended = registrants?.filter(r => r.attended).length || 0;
      const attendanceRate = total > 0 ? (attended / total) * 100 : 0;

      const byStatus = registrants?.reduce((acc: any, registrant: any) => {
        const status = registrant.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}) || {};

      return {
        total,
        byStatus,
        withUuid,
        attended,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting registrant statistics:', error);
      return { total: 0, byStatus: {}, withUuid: 0, attended: 0, attendanceRate: 0 };
    }
  }
}
