
/**
 * Metrics calculation utilities
 */
export class MetricsTransformers {
  static calculateWebinarMetrics(participants: any[]) {
    const totalParticipants = participants.length;
    const totalMinutes = participants.reduce((sum, p) => sum + (p.duration || 0), 0);
    const avgDuration = totalParticipants > 0 ? totalMinutes / totalParticipants : 0;
    const attendanceRate = participants.filter(p => p.join_time).length / totalParticipants;
    
    return {
      total_participants: totalParticipants,
      total_attendees: participants.filter(p => p.join_time).length, // FIXED: Added missing field
      total_minutes: totalMinutes, // FIXED: Added missing field
      avg_attendance_duration: Math.round(avgDuration), // FIXED: Added missing field
      average_duration: avgDuration,
      attendance_rate: attendanceRate
    };
  }
}
