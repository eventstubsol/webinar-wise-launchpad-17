
import { supabase } from '@/integrations/supabase/client';
import { AudienceSegment, SegmentFilterGroup } from '@/types/campaign';

export class AudienceSegmentService {
  static async createSegment(segmentData: Partial<AudienceSegment>) {
    const { data, error } = await supabase
      .from('audience_segments')
      .insert(segmentData)
      .select()
      .single();

    if (error) throw error;
    
    // Update estimated size
    if (data?.id) {
      await this.updateSegmentSize(data.id);
    }
    
    return data;
  }

  static async getSegments(userId: string) {
    const { data, error } = await supabase
      .from('audience_segments')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getSegment(id: string) {
    const { data, error } = await supabase
      .from('audience_segments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSegment(id: string, updates: Partial<AudienceSegment>) {
    const { data, error } = await supabase
      .from('audience_segments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Update estimated size if filter criteria changed
    if (updates.filter_criteria) {
      await this.updateSegmentSize(id);
    }
    
    return data;
  }

  static async deleteSegment(id: string) {
    const { error } = await supabase
      .from('audience_segments')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  static async updateSegmentSize(segmentId: string) {
    const { data, error } = await supabase.rpc('update_segment_size', {
      p_segment_id: segmentId
    });

    if (error) throw error;
    return data;
  }

  static async previewSegment(filterCriteria: SegmentFilterGroup) {
    // This would implement the actual filtering logic
    // For now, return a mock count
    return { estimated_count: 150, preview_contacts: [] };
  }

  static async exportSegment(segmentId: string, format: 'csv' | 'excel') {
    const { data, error } = await supabase.functions.invoke('export-audience-segment', {
      body: { segment_id: segmentId, format }
    });

    if (error) throw error;
    return data;
  }
}
