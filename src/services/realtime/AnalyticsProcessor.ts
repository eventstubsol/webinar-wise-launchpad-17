
import { supabase } from '@/integrations/supabase/client';
import { ProcessingTask } from './types';

export class AnalyticsProcessor {
  public calculateEngagementScore(participant: any): number {
    let score = 0;
    
    // Duration score (0-40 points)
    if (participant.duration) {
      score += Math.min(40, (participant.duration / 60) * 10);
    }

    // Interaction score (0-60 points)
    if (participant.posted_chat) score += 15;
    if (participant.answered_polling) score += 20;
    if (participant.asked_question) score += 20;
    if (participant.raised_hand) score += 5;

    return Math.min(100, score);
  }

  public analyzePollResponses(polls: any[]): any {
    return {
      total_polls: polls.length,
      total_responses: polls.reduce((sum, poll) => sum + (poll.zoom_poll_responses?.length || 0), 0),
      response_rate: polls.length > 0 ? 
        polls.reduce((sum, poll) => sum + (poll.zoom_poll_responses?.length || 0), 0) / polls.length : 0,
      analyzed_at: new Date().toISOString(),
    };
  }

  public analyzeQnaInteractions(qna: any[]): any {
    return {
      total_questions: qna.length,
      answered_questions: qna.filter(q => q.answer).length,
      anonymous_questions: qna.filter(q => q.anonymous).length,
      avg_upvotes: qna.length > 0 ? qna.reduce((sum, q) => sum + (q.upvote_count || 0), 0) / qna.length : 0,
      analyzed_at: new Date().toISOString(),
    };
  }

  public calculateComprehensiveEngagement(participants: any[], polls: any[], qna: any[]): any {
    const totalParticipants = participants.length;
    const engagementScores = participants.map(p => this.calculateEngagementScore(p));
    
    return {
      total_participants: totalParticipants,
      avg_engagement_score: totalParticipants > 0 ? 
        engagementScores.reduce((sum, score) => sum + score, 0) / totalParticipants : 0,
      high_engagement_count: engagementScores.filter(score => score >= 70).length,
      medium_engagement_count: engagementScores.filter(score => score >= 40 && score < 70).length,
      low_engagement_count: engagementScores.filter(score => score < 40).length,
      poll_participation_rate: polls.length > 0 ? 
        polls.reduce((sum, poll) => sum + (poll.zoom_poll_responses?.length || 0), 0) / totalParticipants : 0,
      qna_participation_rate: totalParticipants > 0 ? qna.length / totalParticipants : 0,
      analyzed_at: new Date().toISOString(),
    };
  }

  public async updateAnalyticsCache(cacheKey: string, data: any): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const { error } = await supabase
      .from('analytics_cache')
      .upsert({
        cache_key: cacheKey,
        cache_data: data,
        expires_at: expiresAt.toISOString(),
        dependencies: [cacheKey.split(':')[0]],
      });

    if (error) {
      console.error('Failed to update analytics cache:', error);
    }
  }

  public async broadcastEvent(
    eventType: string,
    eventData: any,
    targetUsers: string[] | null = null
  ): Promise<void> {
    const { error } = await supabase.rpc('broadcast_event', {
      p_event_type: eventType,
      p_event_data: eventData,
      p_target_users: targetUsers,
    });

    if (error) {
      console.error('Failed to broadcast event:', error);
    }
  }
}
