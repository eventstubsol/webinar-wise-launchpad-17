
import { supabase } from '@/integrations/supabase/client';
import { castToRecord, castToArray, castRuleType } from '@/services/types/TypeCasters';

export interface PersonalizationRule {
  id: string;
  rule_name: string;
  rule_type: 'subject_line' | 'content_block' | 'send_time';
  conditions: Record<string, any>;
  content_variations: any[];
  performance_metrics: Record<string, any>;
  is_active: boolean;
}

export interface BehaviorProfile {
  id: string;
  email_address: string;
  engagement_score: number;
  last_engagement_at?: string;
  preferred_send_hour?: number;
  preferred_day_of_week?: number;
  content_preferences: Record<string, any>;
  interaction_history: any[];
  lifecycle_stage: string;
  churn_risk_score: number;
  predicted_ltv: number;
}

export class DynamicPersonalizationEngine {
  static async getPersonalizationRules(userId: string): Promise<PersonalizationRule[]> {
    const { data, error } = await supabase
      .from('content_personalization_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(rule => ({
      id: rule.id,
      rule_name: rule.rule_name,
      rule_type: castRuleType(rule.rule_type),
      conditions: castToRecord(rule.conditions),
      content_variations: castToArray(rule.content_variations),
      performance_metrics: castToRecord(rule.performance_metrics),
      is_active: rule.is_active,
    }));
  }

  static async createPersonalizationRule(
    userId: string,
    rule: Omit<PersonalizationRule, 'id'>
  ): Promise<PersonalizationRule> {
    const { data, error } = await supabase
      .from('content_personalization_rules')
      .insert({
        user_id: userId,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        conditions: rule.conditions,
        content_variations: rule.content_variations,
        performance_metrics: rule.performance_metrics,
        is_active: rule.is_active,
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      rule_name: data.rule_name,
      rule_type: castRuleType(data.rule_type),
      conditions: castToRecord(data.conditions),
      content_variations: castToArray(data.content_variations),
      performance_metrics: castToRecord(data.performance_metrics),
      is_active: data.is_active,
    };
  }

  static async updatePersonalizationRule(
    ruleId: string,
    updates: Partial<PersonalizationRule>
  ): Promise<PersonalizationRule> {
    const { data, error } = await supabase
      .from('content_personalization_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      rule_name: data.rule_name,
      rule_type: castRuleType(data.rule_type),
      conditions: castToRecord(data.conditions),
      content_variations: castToArray(data.content_variations),
      performance_metrics: castToRecord(data.performance_metrics),
      is_active: data.is_active,
    };
  }

  static async personalizeContent(
    userId: string,
    recipientEmail: string,
    contentType: string,
    baseContent: any
  ): Promise<any> {
    // Get recipient's behavior profile
    const profile = await this.getBehaviorProfile(userId, recipientEmail);
    
    // Get applicable personalization rules
    const rules = await this.getPersonalizationRules(userId);
    const applicableRules = rules.filter(rule => 
      rule.rule_type === contentType && 
      this.evaluateConditions(rule.conditions, profile)
    );

    if (applicableRules.length === 0) {
      return baseContent;
    }

    // Apply personalization rules
    let personalizedContent = { ...baseContent };
    
    for (const rule of applicableRules) {
      personalizedContent = this.applyPersonalizationRule(
        personalizedContent,
        rule,
        profile
      );
    }

    return personalizedContent;
  }

  static async getBehaviorProfile(userId: string, email: string): Promise<BehaviorProfile | null> {
    const { data, error } = await supabase
      .from('user_behavior_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('email_address', email)
      .maybeSingle();

    if (error) throw error;
    
    if (!data) return null;
    
    return {
      id: data.id,
      email_address: data.email_address,
      engagement_score: data.engagement_score,
      last_engagement_at: data.last_engagement_at,
      preferred_send_hour: data.preferred_send_hour,
      preferred_day_of_week: data.preferred_day_of_week,
      content_preferences: castToRecord(data.content_preferences),
      interaction_history: castToArray(data.interaction_history),
      lifecycle_stage: data.lifecycle_stage,
      churn_risk_score: data.churn_risk_score,
      predicted_ltv: data.predicted_ltv,
    };
  }

  static async trackBehavioralEvent(
    userId: string,
    email: string,
    eventType: string,
    eventData: Record<string, any> = {},
    campaignId?: string
  ): Promise<void> {
    // Insert behavioral event
    const { error: eventError } = await supabase
      .from('behavioral_events')
      .insert({
        user_id: userId,
        email_address: email,
        campaign_id: campaignId,
        event_type: eventType,
        event_data: eventData,
        device_type: eventData.device_type,
        location_data: eventData.location_data,
        session_id: eventData.session_id,
        user_agent: eventData.user_agent,
      });

    if (eventError) throw eventError;

    // Update behavior profile
    await supabase.rpc('update_behavior_profile', {
      p_user_id: userId,
      p_email: email,
    });
  }

  private static evaluateConditions(
    conditions: Record<string, any>,
    profile: BehaviorProfile | null
  ): boolean {
    if (!profile) return false;

    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case 'engagement_score_min':
          if (profile.engagement_score < value) return false;
          break;
        case 'engagement_score_max':
          if (profile.engagement_score > value) return false;
          break;
        case 'lifecycle_stage':
          if (profile.lifecycle_stage !== value) return false;
          break;
        case 'churn_risk_max':
          if (profile.churn_risk_score > value) return false;
          break;
        case 'days_since_last_engagement':
          if (profile.last_engagement_at) {
            const daysSince = Math.floor(
              (Date.now() - new Date(profile.last_engagement_at).getTime()) / 
              (1000 * 60 * 60 * 24)
            );
            if (daysSince > value) return false;
          }
          break;
      }
    }

    return true;
  }

  private static applyPersonalizationRule(
    content: any,
    rule: PersonalizationRule,
    profile: BehaviorProfile
  ): any {
    const personalizedContent = { ...content };

    switch (rule.rule_type) {
      case 'subject_line':
        if (rule.content_variations.length > 0) {
          // Select variation based on engagement score
          const variationIndex = Math.floor(
            (profile.engagement_score / 100) * rule.content_variations.length
          );
          personalizedContent.subject = rule.content_variations[variationIndex] || content.subject;
        }
        break;

      case 'content_block':
        if (rule.content_variations.length > 0) {
          // Replace content blocks based on preferences
          personalizedContent.content_blocks = rule.content_variations;
        }
        break;

      case 'send_time':
        if (profile.preferred_send_hour !== null) {
          personalizedContent.optimal_send_hour = profile.preferred_send_hour;
        }
        if (profile.preferred_day_of_week !== null) {
          personalizedContent.optimal_send_day = profile.preferred_day_of_week;
        }
        break;
    }

    return personalizedContent;
  }
}
