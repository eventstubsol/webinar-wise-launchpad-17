
/**
 * Enhanced webinar status detection service
 * Determines accurate webinar status when Zoom API doesn't provide it
 */

export interface WebinarStatusResult {
  status: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'api' | 'timing' | 'prediction';
}

export class EnhancedStatusDetector {
  /**
   * Determine accurate webinar status using multiple detection methods
   */
  static determineWebinarStatus(
    webinarData: any,
    apiStatus?: string
  ): WebinarStatusResult {
    // If we have a valid API status, use it
    if (apiStatus && apiStatus !== 'undefined' && apiStatus.trim() !== '') {
      return {
        status: this.normalizeZoomStatus(apiStatus),
        confidence: 'high',
        source: 'api'
      };
    }

    // Fall back to timing-based detection
    return this.predictStatusFromTiming(webinarData);
  }

  /**
   * Predict status based on webinar timing
   */
  private static predictStatusFromTiming(webinarData: any): WebinarStatusResult {
    if (!webinarData.start_time) {
      return {
        status: 'unavailable',
        confidence: 'low',
        source: 'prediction'
      };
    }

    const now = new Date();
    const startTime = new Date(webinarData.start_time);
    const duration = webinarData.duration || 60; // Default 60 minutes if not specified
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));

    // Buffer times for more accurate detection
    const startBuffer = 15 * 60 * 1000; // 15 minutes before
    const endBuffer = 30 * 60 * 1000; // 30 minutes after

    if (now < new Date(startTime.getTime() - startBuffer)) {
      // Future webinar - scheduled/upcoming
      return {
        status: 'available',
        confidence: 'high',
        source: 'timing'
      };
    } else if (now >= new Date(startTime.getTime() - startBuffer) && now < startTime) {
      // Within start buffer - likely starting soon
      return {
        status: 'available',
        confidence: 'high',
        source: 'timing'
      };
    } else if (now >= startTime && now <= new Date(endTime.getTime() + endBuffer)) {
      // During webinar time (with buffer) - could be live or just ended
      const timeSinceEnd = now.getTime() - endTime.getTime();
      
      if (timeSinceEnd <= 0) {
        // Still within scheduled time
        return {
          status: 'started',
          confidence: 'medium',
          source: 'timing'
        };
      } else if (timeSinceEnd <= endBuffer) {
        // Just ended (within buffer)
        return {
          status: 'ended',
          confidence: 'medium',
          source: 'timing'
        };
      }
    }

    // Past webinar - completed
    return {
      status: 'ended',
      confidence: 'high',
      source: 'timing'
    };
  }

  /**
   * Normalize Zoom API status values to our standard statuses
   */
  private static normalizeZoomStatus(zoomStatus: string): string {
    const status = zoomStatus.toLowerCase().trim();
    
    switch (status) {
      case 'available':
      case 'waiting':
      case 'scheduled':
        return 'available';
      case 'started':
      case 'live':
      case 'in_progress':
        return 'started';
      case 'ended':
      case 'finished':
      case 'completed':
        return 'ended';
      case 'aborted':
      case 'cancelled':
      case 'canceled':
        return 'aborted';
      case 'deleted':
        return 'deleted';
      case 'unavailable':
      case 'not_available':
        return 'unavailable';
      default:
        console.log(`Unknown Zoom status '${zoomStatus}', mapping to 'unavailable'`);
        return 'unavailable';
    }
  }

  /**
   * Get user-friendly status label for UI display
   */
  static getStatusLabel(status: string): string {
    switch (status.toLowerCase()) {
      case 'available':
        return 'Scheduled';
      case 'started':
        return 'Live';
      case 'ended':
        return 'Completed';
      case 'aborted':
        return 'Cancelled';
      case 'deleted':
        return 'Deleted';
      case 'unavailable':
        return 'Unavailable';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  /**
   * Get status variant for UI badges
   */
  static getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status.toLowerCase()) {
      case 'available':
        return 'outline';
      case 'started':
        return 'default';
      case 'ended':
        return 'secondary';
      case 'aborted':
      case 'deleted':
        return 'destructive';
      default:
        return 'outline';
    }
  }
}
