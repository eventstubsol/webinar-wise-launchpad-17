
import { supabase } from '@/integrations/supabase/client';

export interface ZoomSegmentationRule {
  id: string;
  user_id: string;
  rule_name: string;
  webinar_criteria: Record<string, any>;
  segment_criteria: Record<string, any>;
  auto_apply: boolean;
  last_applied_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ZoomSegment {
  segment_name: string;
  participants: string[];
  criteria_met: Record<string, any>;
  engagement_score?: number;
}

export class ZoomSegmentationEngine {
  static async createSegmentationRule(
    userId: string,
    rule: Omit<ZoomSegmentationRule, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_applied_at'>
  ): Promise<ZoomSegmentationRule> {
    try {
      // Mock creation since database types aren't updated yet
      console.log('Creating mock segmentation rule while database updates propagate');
      
      return {
        id: `mock-rule-${Date.now()}`,
        user_id: userId,
        ...rule,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.log('Error creating segmentation rule, returning mock:', error);
      return {
        id: `mock-rule-${Date.now()}`,
        user_id: userId,
        ...rule,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  static async getSegmentationRules(userId: string): Promise<ZoomSegmentationRule[]> {
    try {
      // Mock data since database types aren't updated yet
      console.log('Using mock segmentation rules while database updates propagate');
      return [
        {
          id: 'mock-rule-1',
          user_id: userId,
          rule_name: 'High Engagement Attendees',
          webinar_criteria: { attendance_status: 'attended' },
          segment_criteria: { min_engagement_score: 80 },
          auto_apply: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    } catch (error) {
      console.log('Error fetching segmentation rules, using mock data:', error);
      return [];
    }
  }

  static async applySegmentationRules(userId: string, webinarId?: string): Promise<ZoomSegment[]> {
    const rules = await this.getSegmentationRules(userId);
    const segments: ZoomSegment[] = [];

    for (const rule of rules) {
      if (!rule.auto_apply) continue;

      const segment = await this.applyRule(userId, rule, webinarId);
      if (segment) {
        segments.push(segment);
      }
    }

    return segments;
  }

  static async applyRule(
    userId: string,
    rule: ZoomSegmentationRule,
    webinarId?: string
  ): Promise<ZoomSegment | null> {
    try {
      // Query participants with engagement data
      let query = supabase
        .from('zoom_participants')
        .select(`
          *,
          zoom_webinars!inner(
            id,
            topic,
            start_time,
            connection_id,
            zoom_connections!inner(user_id)
          )
        `)
        .eq('zoom_webinars.zoom_connections.user_id', userId);

      if (webinarId) {
        query = query.eq('webinar_id', webinarId);
      }

      const { data: participants, error } = await query;

      if (error) {
        console.error('Error fetching participants:', error);
        return null;
      }

      if (!participants || participants.length === 0) {
        return null;
      }

      // Apply segmentation criteria with safe property access
      const matchingParticipants = participants.filter(participant => 
        this.meetsCriteria(participant, rule.segment_criteria)
      );

      // Safe access to engagement score with fallback
      const avgEngagementScore = matchingParticipants.reduce((sum, p) => {
        const score = (p as any).attentiveness_score || 0;
        return sum + score;
      }, 0) / (matchingParticipants.length || 1);

      return {
        segment_name: rule.rule_name,
        participants: matchingParticipants.map(p => p.participant_email || p.participant_name || 'Unknown').filter(Boolean),
        criteria_met: {
          total_participants: matchingParticipants.length,
          avg_duration: matchingParticipants.reduce((sum, p) => sum + (p.duration || 0), 0) / (matchingParticipants.length || 1),
          engagement_score: avgEngagementScore
        },
        engagement_score: avgEngagementScore
      };
    } catch (error) {
      console.error('Error applying segmentation rule:', error);
      return null;
    }
  }

  private static meetsCriteria(participant: any, criteria: Record<string, any>): boolean {
    // Check minimum engagement score with safe access
    const engagementScore = participant.attentiveness_score || 0;
    if (criteria.min_engagement_score && engagementScore < criteria.min_engagement_score) {
      return false;
    }

    // Check maximum engagement score
    if (criteria.max_engagement_score && engagementScore > criteria.max_engagement_score) {
      return false;
    }

    // Check minimum duration percentage
    if (criteria.min_duration_percentage && participant.zoom_webinars) {
      const webinarDuration = participant.zoom_webinars.duration || 1;
      const participantDuration = participant.duration || 0;
      const durationPercentage = (participantDuration / webinarDuration) * 100;
      if (durationPercentage < criteria.min_duration_percentage) {
        return false;
      }
    }

    // Check if attendance is required
    if (criteria.required_attendance === false) {
      // This criteria is for non-attendees (registrants who didn't attend)
      return false; // For now, we only have attendee data
    }

    return true;
  }

  static async createPresetSegmentationRules(userId: string): Promise<ZoomSegmentationRule[]> {
    const presetRules = [
      {
        rule_name: 'Highly Engaged Attendees',
        webinar_criteria: {
          attendance_status: 'attended',
          min_duration_minutes: 30
        },
        segment_criteria: {
          min_engagement_score: 80,
          min_duration_percentage: 75
        },
        auto_apply: true
      },
      {
        rule_name: 'Early Leavers',
        webinar_criteria: {
          attendance_status: 'attended',
          max_duration_minutes: 15
        },
        segment_criteria: {
          max_engagement_score: 40,
          max_duration_percentage: 25
        },
        auto_apply: true
      },
      {
        rule_name: 'Moderate Engagement',
        webinar_criteria: {
          attendance_status: 'attended'
        },
        segment_criteria: {
          min_engagement_score: 40,
          max_engagement_score: 80
        },
        auto_apply: true
      }
    ];

    const createdRules = [];
    for (const rule of presetRules) {
      try {
        const created = await this.createSegmentationRule(userId, rule);
        createdRules.push(created);
      } catch (error) {
        console.error(`Failed to create preset rule: ${rule.rule_name}`, error);
      }
    }

    return createdRules;
  }
}
