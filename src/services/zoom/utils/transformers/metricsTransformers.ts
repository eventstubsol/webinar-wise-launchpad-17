
/**
 * Metrics calculation utilities
 */
export class MetricsTransformers {
  static calculateWebinarMetrics(participants: any[]) {
    return {
      total_participants: participants.length,
      average_duration: participants.reduce((sum, p) => sum + (p.duration || 0), 0) / participants.length,
      attendance_rate: participants.filter(p => p.join_time).length / participants.length
    };
  }
}
