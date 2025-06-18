
/**
 * Participant status mapping utilities
 */
export class ParticipantStatusMapping {
  /**
   * Map participant status with fallbacks
   */
  static mapParticipantStatus(participant: any): string {
    if (participant.status) {
      const statusMap: { [key: string]: string } = {
        'in_meeting': 'attended',
        'in_waiting_room': 'in_waiting_room',
        'left': 'left_early',
        'joined': 'attended',
        'attended': 'attended',
        'not_attended': 'not_attended',
        'left_early': 'left_early'
      };
      return statusMap[participant.status.toLowerCase()] || 'attended';
    }

    // Infer status from timing data
    const hasJoinTime = !!participant.join_time;
    const hasLeaveTime = !!participant.leave_time;
    const duration = participant.duration || 0;

    if (hasJoinTime && hasLeaveTime && duration > 0) {
      return 'attended';
    } else if (hasJoinTime && !hasLeaveTime) {
      return 'attended';
    } else {
      return 'not_attended';
    }
  }
}
