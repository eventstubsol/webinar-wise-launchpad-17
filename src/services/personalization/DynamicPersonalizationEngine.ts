
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
    console.warn('DynamicPersonalizationEngine: content_personalization_rules table not implemented yet - using mock implementation');
    
    // Return mock personalization rules data
    const mockRules: PersonalizationRule[] = [
      {
        id: 'mock-rule-1',
        rule_name: 'High Engagement Subject Lines',
        rule_type: 'subject_line',
        conditions: { engagement_score_min: 70 },
        content_variations: [
          'Exclusive: Your personalized insights are ready!',
          'VIP Access: Advanced analytics inside',
          'Premium Content: Just for our most engaged subscribers',
        ],
        performance_metrics: { conversion_rate: 0.15, open_rate: 0.45 },
        is_active: true,
      },
      {
        id: 'mock-rule-2',
        rule_name: 'Send Time Optimization',
        rule_type: 'send_time',
        conditions: { lifecycle_stage: 'active' },
        content_variations: [],
        performance_metrics: { engagement_improvement: 0.23 },
        is_active: true,
      }
    ];

    return mockRules;
  }

  static async createPersonalizationRule(
    userId: string,
    rule: Omit<PersonalizationRule, 'id'>
  ): Promise<PersonalizationRule> {
    console.warn('DynamicPersonalizationEngine: content_personalization_rules table not implemented yet - using mock implementation');
    
    const mockRule: PersonalizationRule = {
      id: `mock-rule-${Date.now()}`,
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      conditions: rule.conditions,
      content_variations: rule.content_variations,
      performance_metrics: rule.performance_metrics,
      is_active: rule.is_active,
    };
    
    return mockRule;
  }

  static async updatePersonalizationRule(
    ruleId: string,
    updates: Partial<PersonalizationRule>
  ): Promise<PersonalizationRule> {
    console.warn('DynamicPersonalizationEngine: content_personalization_rules table not implemented yet - using mock implementation');
    
    const mockRule: PersonalizationRule = {
      id: ruleId,
      rule_name: updates.rule_name || 'Updated Rule',
      rule_type: updates.rule_type || 'subject_line',
      conditions: updates.conditions || {},
      content_variations: updates.content_variations || [],
      performance_metrics: updates.performance_metrics || {},
      is_active: updates.is_active !== undefined ? updates.is_active : true,
    };
    
    return mockRule;
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
    console.warn('DynamicPersonalizationEngine: user_behavior_profiles table not implemented yet - using mock implementation');
    
    // Return mock behavior profile
    const mockProfile: BehaviorProfile = {
      id: `mock-profile-${Date.now()}`,
      email_address: email,
      engagement_score: 75,
      last_engagement_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      preferred_send_hour: 10,
      preferred_day_of_week: 2, // Tuesday
      content_preferences: { 
        topics: ['analytics', 'reports'],
        format: 'detailed'
      },
      interaction_history: [
        { type: 'email_open', timestamp: new Date().toISOString() },
        { type: 'click', timestamp: new Date().toISOString() }
      ],
      lifecycle_stage: 'active',
      churn_risk_score: 0.2,
      predicted_ltv: 1250.0,
    };
    
    return mockProfile;
  }

  static async trackBehavioralEvent(
    userId: string,
    email: string,
    eventType: string,
    eventData: Record<string, any> = {},
    campaignId?: string
  ): Promise<void> {
    console.warn('DynamicPersonalizationEngine: behavioral_events table not implemented yet - using mock implementation');
    
    // Mock implementation - log the event
    console.log(`Mock behavioral event tracked:`, {
      userId,
      email,
      eventType,
      eventData,
      campaignId,
      timestamp: new Date().toISOString()
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
