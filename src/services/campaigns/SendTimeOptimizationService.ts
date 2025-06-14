
import { supabase } from '@/integrations/supabase/client';

export class SendTimeOptimizationService {
  static async analyzeSendTimePerformance(userId: string) {
    const { data, error } = await supabase
      .from('send_time_analytics')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }

  static async calculateOptimalSendTime(recipientEmail: string, timezone = 'UTC') {
    // Get historical engagement data for this recipient
    const { data: history, error } = await supabase
      .from('email_tracking_events')
      .select(`
        timestamp,
        event_type,
        email_sends!inner(recipient_email)
      `)
      .eq('email_sends.recipient_email', recipientEmail)
      .in('event_type', ['opened', 'clicked']);

    if (error) throw error;

    if (!history || history.length < 5) {
      // Not enough data, return general best practices
      return {
        optimal_hour: 10, // 10 AM
        optimal_day_of_week: 2, // Tuesday
        confidence_level: 0.3,
        reason: 'Insufficient historical data - using industry best practices'
      };
    }

    // Analyze patterns
    const hourAnalysis = this.analyzeHourPatterns(history);
    const dayAnalysis = this.analyzeDayPatterns(history);

    // Calculate confidence based on sample size
    const confidence = Math.min(history.length / 50, 1.0);

    return {
      optimal_hour: hourAnalysis.bestHour,
      optimal_day_of_week: dayAnalysis.bestDay,
      confidence_level: confidence,
      sample_size: history.length,
      hourly_scores: hourAnalysis.scores,
      daily_scores: dayAnalysis.scores,
      reason: 'Based on recipient engagement history'
    };
  }

  static async updateSendTimeOptimization(userId: string, recipientEmail: string) {
    const optimization = await this.calculateOptimalSendTime(recipientEmail);
    
    const { error } = await supabase
      .from('send_time_optimization')
      .upsert({
        user_id: userId,
        recipient_email: recipientEmail,
        optimal_hour: optimization.optimal_hour,
        optimal_day_of_week: optimization.optimal_day_of_week,
        confidence_level: optimization.confidence_level,
        sample_size: optimization.sample_size,
        last_updated: new Date().toISOString()
      });

    if (error) throw error;
    return optimization;
  }

  static async getRecommendedSendTime(campaignId: string) {
    // Get campaign recipients
    const { data: recipients, error } = await supabase
      .from('email_send_queue')
      .select('recipient_email')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    if (!recipients || recipients.length === 0) {
      return {
        recommended_hour: 10,
        recommended_day: 2,
        confidence: 0.3,
        reason: 'No recipients found'
      };
    }

    // Get optimization data for recipients
    const emails = recipients.map(r => r.recipient_email);
    const { data: optimizations } = await supabase
      .from('send_time_optimization')
      .select('*')
      .in('recipient_email', emails);

    if (!optimizations || optimizations.length === 0) {
      return {
        recommended_hour: 10,
        recommended_day: 2,
        confidence: 0.3,
        reason: 'No optimization data available'
      };
    }

    // Calculate weighted averages
    const totalWeight = optimizations.reduce((sum, opt) => sum + opt.confidence_level, 0);
    
    const weightedHour = optimizations.reduce((sum, opt) => 
      sum + (opt.optimal_hour * opt.confidence_level), 0) / totalWeight;
    
    const weightedDay = optimizations.reduce((sum, opt) => 
      sum + (opt.optimal_day_of_week * opt.confidence_level), 0) / totalWeight;

    return {
      recommended_hour: Math.round(weightedHour),
      recommended_day: Math.round(weightedDay),
      confidence: totalWeight / optimizations.length,
      analyzed_recipients: optimizations.length,
      total_recipients: recipients.length,
      reason: 'Based on recipient engagement patterns'
    };
  }

  private static analyzeHourPatterns(history: any[]) {
    const hourScores: { [hour: number]: number } = {};
    
    // Initialize hours
    for (let i = 0; i < 24; i++) {
      hourScores[i] = 0;
    }

    // Score each engagement event
    history.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      const weight = event.event_type === 'clicked' ? 2 : 1; // Clicks worth more than opens
      hourScores[hour] += weight;
    });

    // Find best hour
    const bestHour = Object.keys(hourScores).reduce((a, b) => 
      hourScores[Number(a)] > hourScores[Number(b)] ? a : b
    );

    return {
      bestHour: Number(bestHour),
      scores: hourScores
    };
  }

  private static analyzeDayPatterns(history: any[]) {
    const dayScores: { [day: number]: number } = {};
    
    // Initialize days (0 = Sunday, 1 = Monday, etc.)
    for (let i = 0; i < 7; i++) {
      dayScores[i] = 0;
    }

    // Score each engagement event
    history.forEach(event => {
      const day = new Date(event.timestamp).getDay();
      const weight = event.event_type === 'clicked' ? 2 : 1;
      dayScores[day] += weight;
    });

    // Find best day
    const bestDay = Object.keys(dayScores).reduce((a, b) => 
      dayScores[Number(a)] > dayScores[Number(b)] ? a : b
    );

    return {
      bestDay: Number(bestDay),
      scores: dayScores
    };
  }
}
