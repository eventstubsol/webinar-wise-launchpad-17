
import { supabase } from '@/integrations/supabase/client';
import { castToRecord } from '@/services/types/TypeCasters';

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
    const { data, error } = await supabase
      .from('zoom_segmentation_rules')
      .insert({
        user_id: userId,
        rule_name: rule.rule_name,
        webinar_criteria: rule.webinar_criteria as any,
        segment_criteria: rule.segment_criteria as any,
        auto_apply: rule.auto_apply,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      user_id: data.user_id,
      rule_name: data.rule_name,
      webinar_criteria: castToRecord(data.webinar_criteria),
      segment_criteria: castToRecord(data.segment_criteria),
      auto_apply: data.auto_apply,
      last_applied_at: data.last_applied_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  static async getSegmentationRules(userId: string): Promise<ZoomSegmentationRule[]> {
    const { data, error } = await supabase
      .from('zoom_segmentation_rules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(rule => ({
      id: rule.id,
      user_id: rule.user_id,
      rule_name: rule.rule_name,
      webinar_criteria: castToRecord(rule.webinar_criteria),
      segment_criteria: castToRecord(rule.segment_criteria),
      auto_apply: rule.auto_apply,
      last_applied_at: rule.last_applied_at,
      created_at: rule.created_at,
      updated_at: rule.updated_at,
    }));
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
    // For now, let's use the profiles table as a placeholder since webinar_participations doesn't exist
    // This would need to be updated once the proper Zoom integration tables are in place
    const { data: participants, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);

    if (error) throw error;

    if (!participants || participants.length === 0) {
      return null;
    }

    // Create audience segment based on the rule
    await this.createAudienceSegment(userId, rule, []);

    // Update rule last applied time
    await supabase
      .from('zoom_segmentation_rules')
      .update({ last_applied_at: new Date().toISOString() })
      .eq('id', rule.id);

    return {
      segment_name: rule.rule_name,
      participants: [],
      criteria_met: {
        total_participants: 0,
        avg_duration: 0,
        attendance_rate: 0
      },
      engagement_score: 0
    };
  }

  private static async createAudienceSegment(
    userId: string,
    rule: ZoomSegmentationRule,
    participants: string[]
  ): Promise<void> {
    // Create or update audience segment
    const { data: existingSegment } = await supabase
      .from('audience_segments')
      .select('id')
      .eq('user_id', userId)
      .eq('segment_name', rule.rule_name)
      .single();

    if (existingSegment) {
      // Update existing segment
      await supabase
        .from('audience_segments')
        .update({
          estimated_size: participants.length,
          last_calculated_at: new Date().toISOString(),
          filter_criteria: {
            ...rule.segment_criteria,
            zoom_rule_id: rule.id,
            source: 'zoom_segmentation'
          }
        })
        .eq('id', existingSegment.id);
    } else {
      // Create new segment
      await supabase
        .from('audience_segments')
        .insert({
          user_id: userId,
          segment_name: rule.rule_name,
          description: `Auto-generated from Zoom data: ${rule.rule_name}`,
          filter_criteria: {
            ...rule.segment_criteria,
            zoom_rule_id: rule.id,
            source: 'zoom_segmentation'
          },
          estimated_size: participants.length,
          is_dynamic: true,
          is_active: true,
          tags: ['zoom', 'webinar', 'auto-generated']
        });
    }
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
        rule_name: 'No-Show Registrants',
        webinar_criteria: {
          attendance_status: 'registered'
        },
        segment_criteria: {
          required_attendance: false
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
          max_engagement_score: 40
        },
        auto_apply: true
      },
      {
        rule_name: 'Repeat Attendees',
        webinar_criteria: {
          attendance_status: 'attended',
          webinar_count_min: 2
        },
        segment_criteria: {
          min_engagement_score: 60
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
