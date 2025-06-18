
/**
 * Participant engagement calculation utilities
 */
export class ParticipantEngagement {
  /**
   * Normalize engagement data for display
   */
  static normalizeEngagementData(participant: any): any {
    const duration = participant.duration || 0;
    const attentiveness = participant.attentiveness_score || 0;
    
    // Calculate engagement score (0-100)
    let engagementScore = 0;
    
    if (duration > 0) {
      engagementScore += Math.min(40, duration); // Up to 40 points for duration
    }
    
    if (attentiveness > 0) {
      engagementScore += Math.min(30, attentiveness); // Up to 30 points for attention
    }
    
    // Interaction bonuses
    if (participant.posted_chat) engagementScore += 10;
    if (participant.answered_polling) engagementScore += 10;
    if (participant.asked_question) engagementScore += 10;
    if (participant.raised_hand) engagementScore += 5;
    
    engagementScore = Math.min(100, engagementScore);
    
    return {
      ...participant,
      engagement_score: Math.round(engagementScore),
      duration_formatted: this.formatDuration(duration),
      status_display: this.formatStatus(participant.status)
    };
  }

  /**
   * Format duration for display
   */
  static formatDuration(minutes: number): string {
    if (!minutes || minutes === 0) return '0 min';
    
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Format status for display
   */
  static formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'attended': 'Attended',
      'not_attended': 'Did Not Attend',
      'left_early': 'Left Early',
      'in_waiting_room': 'In Waiting Room',
      'in_meeting': 'In Meeting'
    };
    
    return statusMap[status] || 'Unknown';
  }
}
