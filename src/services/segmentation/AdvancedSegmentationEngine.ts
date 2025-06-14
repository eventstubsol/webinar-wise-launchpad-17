import { supabase } from '@/integrations/supabase/client';
import { castToRecord } from '@/services/types/TypeCasters';

export interface AdvancedSegment {
  id: string;
  segment_name: string;
  description?: string;
  filter_criteria: Record<string, any>;
  estimated_size: number;
  is_dynamic: boolean;
  tags: string[];
  is_active: boolean;
  last_calculated_at?: string;
}

export interface SegmentMember {
  id: string;
  segment_id: string;
  user_id: string;
  email_address: string;
  membership_score: number;
  membership_reason: Record<string, any>;
  added_at: string;
  last_updated_at: string;
}

export class AdvancedSegmentationEngine {
  static async getAdvancedSegments(userId: string): Promise<AdvancedSegment[]> {
    const { data, error } = await supabase
      .from('audience_segments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(segment => ({
      id: segment.id,
      segment_name: segment.segment_name,
      description: segment.description,
      filter_criteria: castToRecord(segment.filter_criteria),
      estimated_size: segment.estimated_size,
      is_dynamic: segment.is_dynamic,
      tags: segment.tags,
      is_active: segment.is_active,
      last_calculated_at: segment.last_calculated_at,
    }));
  }

  static async createAdvancedSegment(
    userId: string,
    segment: Omit<AdvancedSegment, 'id' | 'estimated_size' | 'last_calculated_at'>
  ): Promise<AdvancedSegment> {
    const { data, error } = await supabase
      .from('audience_segments')
      .insert({
        user_id: userId,
        segment_name: segment.segment_name,
        description: segment.description,
        filter_criteria: segment.filter_criteria,
        is_dynamic: segment.is_dynamic,
        tags: segment.tags,
        is_active: segment.is_active,
      })
      .select()
      .single();

    if (error) throw error;

    // Calculate initial segment size
    await this.calculateSegmentSize(data.id);
    
    return {
      id: data.id,
      segment_name: data.segment_name,
      description: data.description,
      filter_criteria: castToRecord(data.filter_criteria),
      estimated_size: data.estimated_size,
      is_dynamic: data.is_dynamic,
      tags: data.tags,
      is_active: data.is_active,
      last_calculated_at: data.last_calculated_at,
    };
  }

  static async calculateSegmentSize(segmentId: string): Promise<number> {
    const { data: segment, error: segmentError } = await supabase
      .from('audience_segments')
      .select('filter_criteria, user_id')
      .eq('id', segmentId)
      .single();

    if (segmentError) throw segmentError;

    const criteria = castToRecord(segment.filter_criteria);
    let query = supabase
      .from('user_behavior_profiles')
      .select('id', { count: 'exact' })
      .eq('user_id', segment.user_id);

    // Apply filters based on criteria
    if (criteria.engagement_score_min !== undefined) {
      query = query.gte('engagement_score', criteria.engagement_score_min);
    }
    if (criteria.engagement_score_max !== undefined) {
      query = query.lte('engagement_score', criteria.engagement_score_max);
    }
    if (criteria.lifecycle_stage) {
      query = query.eq('lifecycle_stage', criteria.lifecycle_stage);
    }
    if (criteria.churn_risk_max !== undefined) {
      query = query.lte('churn_risk_score', criteria.churn_risk_max);
    }
    if (criteria.days_since_last_engagement !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - criteria.days_since_last_engagement);
      query = query.gte('last_engagement_at', cutoffDate.toISOString());
    }

    const { count, error } = await query;
    if (error) throw error;

    // Update segment size
    await supabase
      .from('audience_segments')
      .update({
        estimated_size: count || 0,
        last_calculated_at: new Date().toISOString(),
      })
      .eq('id', segmentId);

    return count || 0;
  }

  static async updateSegmentMembership(segmentId: string): Promise<void> {
    const { data: segment, error: segmentError } = await supabase
      .from('audience_segments')
      .select('filter_criteria, user_id')
      .eq('id', segmentId)
      .single();

    if (segmentError) throw segmentError;

    const criteria = castToRecord(segment.filter_criteria);
    let query = supabase
      .from('user_behavior_profiles')
      .select('*')
      .eq('user_id', segment.user_id);

    // Apply same filters as calculateSegmentSize
    if (criteria.engagement_score_min !== undefined) {
      query = query.gte('engagement_score', criteria.engagement_score_min);
    }
    if (criteria.engagement_score_max !== undefined) {
      query = query.lte('engagement_score', criteria.engagement_score_max);
    }
    if (criteria.lifecycle_stage) {
      query = query.eq('lifecycle_stage', criteria.lifecycle_stage);
    }
    if (criteria.churn_risk_max !== undefined) {
      query = query.lte('churn_risk_score', criteria.churn_risk_max);
    }

    const { data: members, error } = await query;
    if (error) throw error;

    // Clear existing membership
    await supabase
      .from('dynamic_segment_membership')
      .delete()
      .eq('segment_id', segmentId);

    // Insert new membership
    if (members && members.length > 0) {
      const membershipData = members.map(member => ({
        segment_id: segmentId,
        user_id: member.user_id,
        email_address: member.email_address,
        membership_score: this.calculateMembershipScore(member, criteria),
        membership_reason: this.getMembershipReason(member, criteria),
      }));

      await supabase
        .from('dynamic_segment_membership')
        .insert(membershipData);
    }
  }

  static async createRFMSegments(userId: string): Promise<AdvancedSegment[]> {
    // Create RFM (Recency, Frequency, Monetary) segments
    const segments = [
      {
        segment_name: 'Champions',
        description: 'High engagement, frequent interaction, recent activity',
        filter_criteria: {
          engagement_score_min: 80,
          days_since_last_engagement: 7,
        },
        tags: ['rfm', 'high-value'],
        is_dynamic: true,
        is_active: true,
      },
      {
        segment_name: 'Loyal Customers',
        description: 'Consistently engaged over time',
        filter_criteria: {
          engagement_score_min: 60,
          days_since_last_engagement: 14,
        },
        tags: ['rfm', 'loyal'],
        is_dynamic: true,
        is_active: true,
      },
      {
        segment_name: 'At Risk',
        description: 'Previously engaged but recent activity declining',
        filter_criteria: {
          engagement_score_min: 40,
          engagement_score_max: 70,
          days_since_last_engagement: 30,
        },
        tags: ['rfm', 'at-risk'],
        is_dynamic: true,
        is_active: true,
      },
      {
        segment_name: 'Cannot Lose Them',
        description: 'High value but low recent engagement',
        filter_criteria: {
          engagement_score_min: 70,
          days_since_last_engagement: 60,
        },
        tags: ['rfm', 'win-back'],
        is_dynamic: true,
        is_active: true,
      },
    ];

    const createdSegments = [];
    for (const segment of segments) {
      const created = await this.createAdvancedSegment(userId, segment);
      createdSegments.push(created);
    }

    return createdSegments;
  }

  static async createLifecycleSegments(userId: string): Promise<AdvancedSegment[]> {
    const segments = [
      {
        segment_name: 'New Subscribers',
        description: 'Recently subscribed, low interaction history',
        filter_criteria: {
          lifecycle_stage: 'new',
          engagement_score_max: 30,
        },
        tags: ['lifecycle', 'new'],
        is_dynamic: true,
        is_active: true,
      },
      {
        segment_name: 'Active Subscribers',
        description: 'Regular engagement with content',
        filter_criteria: {
          lifecycle_stage: 'active',
          engagement_score_min: 40,
        },
        tags: ['lifecycle', 'active'],
        is_dynamic: true,
        is_active: true,
      },
      {
        segment_name: 'Dormant Subscribers',
        description: 'Low engagement, potential churn risk',
        filter_criteria: {
          lifecycle_stage: 'dormant',
          engagement_score_max: 25,
          churn_risk_max: 0.7,
        },
        tags: ['lifecycle', 'dormant'],
        is_dynamic: true,
        is_active: true,
      },
    ];

    const createdSegments = [];
    for (const segment of segments) {
      const created = await this.createAdvancedSegment(userId, segment);
      createdSegments.push(created);
    }

    return createdSegments;
  }

  static async getSegmentMembers(segmentId: string): Promise<SegmentMember[]> {
    const { data, error } = await supabase
      .from('dynamic_segment_membership')
      .select('*')
      .eq('segment_id', segmentId)
      .order('membership_score', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(member => ({
      id: member.id,
      segment_id: member.segment_id,
      user_id: member.user_id,
      email_address: member.email_address,
      membership_score: member.membership_score,
      membership_reason: castToRecord(member.membership_reason),
      added_at: member.added_at,
      last_updated_at: member.last_updated_at,
    }));
  }

  private static calculateMembershipScore(
    member: any,
    criteria: Record<string, any>
  ): number {
    let score = 1.0;

    // Engagement score contribution
    if (criteria.engagement_score_min !== undefined) {
      score *= Math.min(1.2, member.engagement_score / criteria.engagement_score_min);
    }

    // Recency contribution
    if (member.last_engagement_at && criteria.days_since_last_engagement) {
      const daysSince = Math.floor(
        (Date.now() - new Date(member.last_engagement_at).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      if (daysSince <= criteria.days_since_last_engagement) {
        score *= Math.max(0.8, 1.0 - (daysSince / criteria.days_since_last_engagement) * 0.3);
      }
    }

    return Math.min(1.0, score);
  }

  private static getMembershipReason(
    member: any,
    criteria: Record<string, any>
  ): Record<string, any> {
    const reasons: Record<string, any> = {};

    if (criteria.engagement_score_min !== undefined) {
      reasons.engagement_score = {
        value: member.engagement_score,
        threshold: criteria.engagement_score_min,
        meets_criteria: member.engagement_score >= criteria.engagement_score_min,
      };
    }

    if (criteria.lifecycle_stage) {
      reasons.lifecycle_stage = {
        value: member.lifecycle_stage,
        threshold: criteria.lifecycle_stage,
        meets_criteria: member.lifecycle_stage === criteria.lifecycle_stage,
      };
    }

    return reasons;
  }
}
