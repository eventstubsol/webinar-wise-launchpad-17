
/**
 * Service for detecting and normalizing webinar status from Zoom API data
 */
export class WebinarStatusDetector {
  /**
   * Determine webinar status based on Zoom API data and timing
   */
  static detectStatus(apiWebinar: any): string {
    // First, try to use the API status if it's valid
    if (apiWebinar.status) {
      const normalizedStatus = this.normalizeZoomStatus(apiWebinar.status);
      if (normalizedStatus !== 'unknown') {
        return normalizedStatus;
      }
    }

    // Fallback to time-based status detection
    return this.calculateTimeBasedStatus(apiWebinar.start_time, apiWebinar.duration);
  }

  /**
   * Normalize Zoom API status values to database-compatible values
   */
  private static normalizeZoomStatus(zoomStatus: string): string {
    if (!zoomStatus) return 'unknown';

    const statusMap: { [key: string]: string } = {
      // Direct mappings
      'available': 'upcoming',
      'unavailable': 'cancelled',
      'started': 'live',
      'ended': 'completed',
      'deleted': 'cancelled',
      'scheduled': 'upcoming',
      'completed': 'completed',
      'upcoming': 'upcoming',
      'cancelled': 'cancelled',
      'live': 'live',
      'finished': 'completed',
      
      // Alternative mappings for edge cases
      'waiting': 'upcoming',
      'in_progress': 'live',
      'active': 'live',
      'inactive': 'cancelled',
      'draft': 'upcoming'
    };

    const normalized = statusMap[zoomStatus.toLowerCase()];
    return normalized || 'unknown';
  }

  /**
   * Calculate status based on webinar timing
   */
  private static calculateTimeBasedStatus(startTime: string | null, duration: number | null): string {
    if (!startTime) {
      return 'upcoming'; // No start time = scheduled for future
    }

    const now = new Date();
    const start = new Date(startTime);
    const durationMs = (duration || 60) * 60 * 1000; // Default 60 minutes
    const end = new Date(start.getTime() + durationMs);

    if (now < start) {
      return 'upcoming';
    } else if (now >= start && now <= end) {
      return 'live';
    } else {
      return 'completed';
    }
  }

  /**
   * Validate that a status is allowed by database constraints
   */
  static isValidStatus(status: string): boolean {
    const validStatuses = [
      'available', 'unavailable', 'started', 'ended', 'deleted', 'scheduled',
      'completed', 'upcoming', 'cancelled', 'live', 'finished'
    ];
    return validStatuses.includes(status);
  }

  /**
   * Get a safe fallback status
   */
  static getFallbackStatus(): string {
    return 'upcoming';
  }
}
