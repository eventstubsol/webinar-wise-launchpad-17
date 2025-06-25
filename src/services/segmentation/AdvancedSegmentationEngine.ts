
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
    return data || [];
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
    const size = await this.calculateSegmentSize(data.id);
    
    // Update with calculated size
    const { data: updatedData, error: updateError } = await supabase
      .from('audience_segments')
      .update({ 
        estimated_size: size,
        last_calculated_at: new Date().toISOString()
      })
      .eq('id', data.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return updatedData;
  }

  static async calculateSegmentSize(segmentId: string): Promise<number> {
    // Get segment criteria
    const { data: segment, error } = await supabase
      .from('audience_segments')
      .select('filter_criteria, user_id')
      .eq('id', segmentId)
      .single();

    if (error) throw error;

    // For now, return a calculated size based on participant data
    const { count, error: countError } = await supabase
      .from('zoom_participants')
      .select('*', { count: 'exact', head: true })
      .eq('zoom_webinars.zoom_connections.user_id', segment.user_id);

    if (countError) {
      console.error('Error calculating segment size:', countError);
      return 0;
    }

    return count || 0;
  }

  static async updateSegmentMembership(segmentId: string): Promise<void> {
    const { data: segment, error } = await supabase
      .from('audience_segments')
      .select('*')
      .eq('id', segmentId)
      .single();

    if (error) throw error;

    // Recalculate segment membership
    const newSize = await this.calculateSegmentSize(segmentId);
    
    await supabase
      .from('audience_segments')
      .update({ 
        estimated_size: newSize,
        last_calculated_at: new Date().toISOString()
      })
      .eq('id', segmentId);
  }

  static async createRFMSegments(userId: string): Promise<AdvancedSegment[]> {
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
      .order('added_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
