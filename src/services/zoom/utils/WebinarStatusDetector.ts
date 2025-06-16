
/**
 * Enhanced webinar status detection service
 * Handles status detection when Zoom API doesn't provide explicit status
 */

import { WebinarStatus } from '@/types/zoom/enums';

export interface WebinarStatusContext {
  id: string;
  start_time?: string;
  duration?: number;
  status?: string;
  created_at?: string;
  occurrences?: any[];
  type?: number;
}

export class WebinarStatusDetector {
  /**
   * Calculate smart webinar status based on timing and available data
   */
  static calculateSmartStatus(webinar: WebinarStatusContext): WebinarStatus {
    console.log(`Calculating smart status for webinar ${webinar.id}:`, {
      status: webinar.status,
      start_time: webinar.start_time,
      duration: webinar.duration,
      type: webinar.type
    });

    // If Zoom provides explicit status, use it with proper mapping
    if (webinar.status) {
      const mappedStatus = this.mapZoomStatus(webinar.status);
      if (mappedStatus !== WebinarStatus.SCHEDULED) {
        console.log(`Using explicit Zoom status: ${webinar.status} -> ${mappedStatus}`);
        return mappedStatus;
      }
    }

    // If no start time, treat as scheduled
    if (!webinar.start_time) {
      console.log('No start time found, defaulting to scheduled');
      return WebinarStatus.SCHEDULED;
    }

    const now = new Date();
    const startTime = new Date(webinar.start_time);
    const duration = webinar.duration || 60; // Default 60 minutes if not specified
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));

    console.log(`Time calculation:`, {
      now: now.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: duration
    });

    // Time-based status detection
    if (now < startTime) {
      // Future webinar
      const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilStart <= 1) {
        console.log('Webinar starts within 1 hour, marking as scheduled');
        return WebinarStatus.SCHEDULED;
      }
      console.log('Future webinar, marking as scheduled');
      return WebinarStatus.SCHEDULED;
    } else if (now >= startTime && now <= endTime) {
      // Currently running
      console.log('Webinar is currently running, marking as started');
      return WebinarStatus.STARTED;
    } else {
      // Past webinar
      console.log('Past webinar, marking as finished');
      return WebinarStatus.FINISHED;
    }
  }

  /**
   * Map Zoom API status values to our enum values
   */
  static mapZoomStatus(zoomStatus: string): WebinarStatus {
    const normalizedStatus = zoomStatus.toLowerCase().trim();
    
    switch (normalizedStatus) {
      case 'available':
      case 'waiting':
      case 'pending':
        return WebinarStatus.SCHEDULED;
      case 'started':
      case 'live':
      case 'in_progress':
        return WebinarStatus.STARTED;
      case 'ended':
      case 'finished':
      case 'completed':
        return WebinarStatus.FINISHED;
      case 'cancelled':
      case 'canceled':
        return WebinarStatus.CANCELLED;
      default:
        console.log(`Unknown Zoom status '${zoomStatus}', will use timing-based detection`);
        return WebinarStatus.SCHEDULED; // Will be overridden by timing logic
    }
  }

  /**
   * Get user-friendly status label
   */
  static getStatusLabel(status: WebinarStatus): string {
    switch (status) {
      case WebinarStatus.SCHEDULED:
        return 'Upcoming';
      case WebinarStatus.STARTED:
        return 'Live';
      case WebinarStatus.FINISHED:
        return 'Completed';
      case WebinarStatus.CANCELLED:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  /**
   * Determine if a webinar needs status update based on timing
   */
  static needsStatusUpdate(webinar: WebinarStatusContext, currentStatus: WebinarStatus): boolean {
    const calculatedStatus = this.calculateSmartStatus(webinar);
    return calculatedStatus !== currentStatus;
  }
}
