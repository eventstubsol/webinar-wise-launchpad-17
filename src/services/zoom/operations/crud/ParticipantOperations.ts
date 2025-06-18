
import { supabase } from '@/integrations/supabase/client';
import { ParticipantTransformers } from '../../utils/transformers/participantTransformers';

/**
 * ENHANCED: Database operations for webinar participants with improved validation
 */
export class ParticipantOperations {
  /**
   * ENHANCED: Upsert participants with validation and better error handling
   */
  static async upsertParticipants(participants: any[], webinarDbId: string): Promise<{
    success: number;
    failed: number;
    warnings: string[];
  }> {
    if (!participants || participants.length === 0) {
      console.log('📭 No participants to upsert');
      return { success: 0, failed: 0, warnings: [] };
    }

    const warnings: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      console.log(`🔄 ENHANCED PARTICIPANT UPSERT: Processing ${participants.length} participants`);
      
      const validatedParticipants = [];
      
      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        
        // Validate participant data
        const validation = ParticipantTransformers.validateParticipantData(participant);
        
        if (!validation.isValid) {
          console.warn(`❌ Invalid participant at index ${i}:`, validation.errors);
          warnings.push(`Participant ${i + 1}: ${validation.errors.join(', ')}`);
          failedCount++;
          continue;
        }

        if (validation.warnings.length > 0) {
          warnings.push(`Participant ${i + 1}: ${validation.warnings.join(', ')}`);
        }

        try {
          const transformed = ParticipantTransformers.transformParticipant(participant, webinarDbId);
          
          // Log first participant for debugging
          if (i === 0) {
            console.log(`📋 SAMPLE TRANSFORMED PARTICIPANT:`, {
              participant_id: transformed.participant_id,
              registrant_id: transformed.registrant_id, // Now string type
              email: transformed.participant_email,
              failover: transformed.failover, // NEW FIELD
              internal_user: transformed.internal_user, // NEW FIELD
              duration: transformed.duration
            });
          }
          
          validatedParticipants.push({
            ...transformed,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        } catch (transformError) {
          console.error(`❌ Failed to transform participant at index ${i}:`, transformError);
          warnings.push(`Participant ${i + 1}: Transform failed - ${transformError.message}`);
          failedCount++;
        }
      }

      if (validatedParticipants.length === 0) {
        console.warn('⚠️ No valid participants to insert after validation');
        return { success: 0, failed: failedCount, warnings };
      }

      console.log(`💾 DATABASE UPSERT: Inserting ${validatedParticipants.length} validated participants`);

      const { error, count } = await supabase
        .from('zoom_participants')
        .upsert(
          validatedParticipants,
          {
            onConflict: 'webinar_id,participant_id',
            ignoreDuplicates: false,
            count: 'exact'
          }
        );

      if (error) {
        console.error('❌ DATABASE UPSERT ERROR:', error);
        throw new Error(`Failed to upsert participants: ${error.message}`);
      }

      successCount = count || validatedParticipants.length;

      console.log(`✅ ENHANCED PARTICIPANT UPSERT SUCCESS:`);
      console.log(`  - Processed: ${participants.length}`);
      console.log(`  - Successful: ${successCount}`);
      console.log(`  - Failed: ${failedCount}`);
      console.log(`  - Warnings: ${warnings.length}`);
      
      // Enhanced success logging with new field statistics
      const stats = {
        withRegistrantId: validatedParticipants.filter(p => p.registrant_id).length,
        withFailover: validatedParticipants.filter(p => p.failover).length,
        internalUsers: validatedParticipants.filter(p => p.internal_user).length,
        avgDuration: validatedParticipants.reduce((sum, p) => sum + (p.duration || 0), 0) / validatedParticipants.length
      };
      
      console.log(`📊 PARTICIPANT PROCESSING STATS:`, stats);
      
      return { success: successCount, failed: failedCount, warnings };
      
    } catch (error) {
      console.error(`💥 ENHANCED PARTICIPANT UPSERT ERROR:`, error);
      throw error;
    }
  }

  /**
   * Get participant metrics for a webinar
   */
  static async getParticipantMetrics(webinarDbId: string): Promise<{
    totalAttendees: number;
    totalMinutes: number;
    avgDuration: number;
    technicalIssuesCount: number; // NEW: Count of participants with failover
    internalUsersCount: number; // NEW: Count of internal users
  }> {
    try {
      const { data: participants, error } = await supabase
        .from('zoom_participants')
        .select('duration, failover, internal_user')
        .eq('webinar_id', webinarDbId);

      if (error) {
        console.error('Failed to get participant metrics:', error);
        return { 
          totalAttendees: 0, 
          totalMinutes: 0, 
          avgDuration: 0, 
          technicalIssuesCount: 0,
          internalUsersCount: 0
        };
      }

      const totalAttendees = participants?.length || 0;
      const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
      const avgDuration = totalAttendees > 0 ? totalMinutes / totalAttendees : 0;
      const technicalIssuesCount = participants?.filter(p => p.failover).length || 0;
      const internalUsersCount = participants?.filter(p => p.internal_user).length || 0;

      return {
        totalAttendees,
        totalMinutes,
        avgDuration: Math.round(avgDuration),
        technicalIssuesCount,
        internalUsersCount
      };
    } catch (error) {
      console.error('Error calculating participant metrics:', error);
      return { 
        totalAttendees: 0, 
        totalMinutes: 0, 
        avgDuration: 0, 
        technicalIssuesCount: 0,
        internalUsersCount: 0
      };
    }
  }

  /**
   * ENHANCED: Get participants with engagement data and new fields
   */
  static async getParticipantsWithEngagement(webinarDbId: string) {
    try {
      const { data: participants, error } = await supabase
        .from('zoom_participants')
        .select('*')
        .eq('webinar_id', webinarDbId)
        .order('join_time', { ascending: true });

      if (error) {
        console.error('Failed to get participants:', error);
        return [];
      }

      // Enhance with engagement data and new field insights
      return participants?.map(participant => ({
        ...participant,
        ...ParticipantTransformers.normalizeEngagementData(participant),
        // Add quick access flags for new fields
        has_technical_issues: !!participant.failover,
        is_internal_user: !!participant.internal_user
      })) || [];
    } catch (error) {
      console.error('Error getting participants with engagement:', error);
      return [];
    }
  }

  /**
   * NEW: Get participant statistics with enhanced metrics
   */
  static async getEnhancedParticipantStatistics(webinarDbId: string): Promise<{
    total: number;
    technical_issues: number;
    internal_users: number;
    engagement_breakdown: {
      high: number;
      medium: number;
      low: number;
    };
    duration_breakdown: {
      full_session: number;
      partial_session: number;
      brief_visit: number;
    };
  }> {
    try {
      const participants = await this.getParticipantsWithEngagement(webinarDbId);
      
      const total = participants.length;
      const technical_issues = participants.filter(p => p.has_technical_issues).length;
      const internal_users = participants.filter(p => p.is_internal_user).length;
      
      // Engagement breakdown
      const high_engagement = participants.filter(p => p.engagement_score >= 70).length;
      const medium_engagement = participants.filter(p => p.engagement_score >= 40 && p.engagement_score < 70).length;
      const low_engagement = participants.filter(p => p.engagement_score < 40).length;
      
      // Duration breakdown (assuming 60 min session)
      const full_session = participants.filter(p => (p.duration || 0) >= 45).length;
      const partial_session = participants.filter(p => (p.duration || 0) >= 15 && (p.duration || 0) < 45).length;
      const brief_visit = participants.filter(p => (p.duration || 0) < 15).length;

      return {
        total,
        technical_issues,
        internal_users,
        engagement_breakdown: {
          high: high_engagement,
          medium: medium_engagement,
          low: low_engagement
        },
        duration_breakdown: {
          full_session,
          partial_session,
          brief_visit
        }
      };
    } catch (error) {
      console.error('Error getting enhanced participant statistics:', error);
      return {
        total: 0,
        technical_issues: 0,
        internal_users: 0,
        engagement_breakdown: { high: 0, medium: 0, low: 0 },
        duration_breakdown: { full_session: 0, partial_session: 0, brief_visit: 0 }
      };
    }
  }
}
