
/**
 * Data transformation utilities for metrics and calculations
 */
export class MetricsTransformers {
  /**
   * Calculate webinar summary metrics from participants data
   */
  static calculateWebinarMetrics(participants: any[]): {
    total_attendees: number;
    total_minutes: number;
    avg_attendance_duration: number;
  } {
    const totalAttendees = participants.length;
    const totalMinutes = participants.reduce((sum, p) => sum + (p.duration || 0), 0);
    const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;

    return {
      total_attendees: totalAttendees,
      total_minutes: totalMinutes,
      avg_attendance_duration: avgDuration,
    };
  }

  /**
   * Extract custom question responses from registrant data
   */
  static extractCustomQuestions(registrant: any): Array<{ title: string; value: string }> {
    if (!registrant.custom_questions || !Array.isArray(registrant.custom_questions)) {
      return [];
    }

    return registrant.custom_questions.map((q: any) => ({
      title: q.title || q.question || '',
      value: q.value || q.answer || '',
    }));
  }
}
