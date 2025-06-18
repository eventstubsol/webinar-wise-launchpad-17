
/**
 * Validation utilities for Zoom API data transformation
 */
import { ZoomWebinar } from '@/types/zoom';
import { WebinarStatus, WebinarType } from '@/types/zoom/enums';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FieldMappingReport {
  mapped: string[];
  unmapped: string[];
  enhanced: string[];
  missingInDatabase: string[];
}

/**
 * Validate transformed webinar data against database schema
 */
export class ZoomDataValidator {
  /**
   * Validate transformed webinar data
   */
  static validateWebinarData(transformedData: Omit<ZoomWebinar, 'id' | 'created_at' | 'updated_at'>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required field validation
    if (!transformedData.connection_id) {
      errors.push('Missing connection_id');
    }
    
    if (!transformedData.webinar_id) {
      errors.push('Missing webinar_id');
    }
    
    if (!transformedData.topic) {
      errors.push('Missing topic');
    }
    
    // Type validation
    if (transformedData.type && ![5, 6, 9].includes(transformedData.type)) {
      errors.push(`Invalid webinar type: ${transformedData.type}. Must be 5, 6, or 9`);
    }
    
    // Status validation
    const validStatuses = [
      WebinarStatus.SCHEDULED,
      WebinarStatus.STARTED,
      WebinarStatus.FINISHED,
      WebinarStatus.CANCELLED
    ];
    
    if (transformedData.status && !validStatuses.includes(transformedData.status)) {
      errors.push(`Invalid status: ${transformedData.status}`);
    }
    
    // Registration logic validation
    if (transformedData.registration_required === null && transformedData.approval_type !== null) {
      warnings.push('registration_required is null but approval_type is set');
    }
    
    // URL validation
    if (transformedData.join_url && !this.isValidUrl(transformedData.join_url)) {
      warnings.push('join_url appears to be invalid');
    }
    
    if (transformedData.start_url && !this.isValidUrl(transformedData.start_url)) {
      warnings.push('start_url appears to be invalid');
    }
    
    // Alternative hosts validation
    if (transformedData.alternative_hosts && Array.isArray(transformedData.alternative_hosts)) {
      transformedData.alternative_hosts.forEach((host, index) => {
        if (!this.isValidEmail(host)) {
          warnings.push(`Invalid email in alternative_hosts[${index}]: ${host}`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Generate field mapping report for debugging
   */
  static getFieldMappingReport(apiWebinar: any): FieldMappingReport {
    const apiFields = Object.keys(apiWebinar);
    const settings = apiWebinar.settings || {};
    const settingsFields = Object.keys(settings).map(key => `settings.${key}`);
    
    const mapped = [
      'id', 'uuid', 'host_id', 'host_email', 'topic', 'agenda', 'type', 'status',
      'start_time', 'duration', 'timezone', 'join_url', 'registration_url',
      'password', 'settings', 'occurrences', 'recurrence', 'tracking_fields', 'panelists'
    ];
    
    const enhanced = [
      'start_url', 'encrypted_passcode', 'h323_password', 'h323_passcode', 'pstn_password',
      'created_at', 'creation_source', 'is_simulive', 'record_file_id', 'transition_to_live',
      'occurrence_id', 'alternative_hosts', 'registration_type'
    ];
    
    const allMappedFields = [...mapped, ...enhanced];
    const unmapped = apiFields.filter(field => !allMappedFields.includes(field));
    
    // Fields that might be missing in database
    const databaseFields = [
      'connection_id', 'webinar_id', 'webinar_uuid', 'host_id', 'host_email', 'topic',
      'agenda', 'type', 'status', 'start_time', 'duration', 'timezone', 'registration_required',
      'registration_type', 'registration_url', 'join_url', 'start_url', 'password',
      'encrypted_passcode', 'h323_password', 'h323_passcode', 'pstn_password', 'approval_type',
      'max_registrants', 'alternative_hosts', 'is_simulive', 'record_file_id', 'transition_to_live',
      'creation_source', 'webinar_created_at', 'occurrence_id', 'attendees_count', 'registrants_count',
      'settings', 'recurrence', 'occurrences', 'tracking_fields', 'panelists', 'synced_at',
      'participant_sync_status', 'participant_sync_attempted_at', 'participant_sync_error'
    ];
    
    const missingInDatabase = enhanced.filter(field => !databaseFields.includes(field));
    
    return {
      mapped,
      unmapped,
      enhanced,
      missingInDatabase
    };
  }
  
  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Enhanced error recovery strategies
 */
export class ZoomErrorRecovery {
  /**
   * Attempt to recover from Zoom API errors
   */
  static async handleApiError(error: any, context: {
    operation: string;
    webinarId?: string;
    retryCount?: number;
    maxRetries?: number;
  }): Promise<{ shouldRetry: boolean; delayMs: number; errorType: string }> {
    const { operation, webinarId, retryCount = 0, maxRetries = 3 } = context;
    
    // Categorize error types
    const errorCode = error?.code || error?.status;
    
    switch (errorCode) {
      case 429: // Rate limit exceeded
        return {
          shouldRetry: retryCount < maxRetries,
          delayMs: Math.min(60000, Math.pow(2, retryCount) * 1000), // Exponential backoff up to 60s
          errorType: 'rate_limit'
        };
        
      case 500:
      case 502:
      case 503: // Server errors
        return {
          shouldRetry: retryCount < maxRetries,
          delayMs: Math.pow(2, retryCount) * 1000, // Exponential backoff
          errorType: 'server_error'
        };
        
      case 401:
      case 124: // Auth errors
        return {
          shouldRetry: false,
          delayMs: 0,
          errorType: 'auth_error'
        };
        
      case 300:
      case 3001: // Invalid webinar ID
        return {
          shouldRetry: false,
          delayMs: 0,
          errorType: 'invalid_resource'
        };
        
      default:
        return {
          shouldRetry: retryCount < maxRetries && errorCode >= 500,
          delayMs: 1000,
          errorType: 'unknown_error'
        };
    }
  }
  
  /**
   * Log error for monitoring and debugging
   */
  static logError(error: any, context: any): void {
    console.error('Zoom API Error:', {
      timestamp: new Date().toISOString(),
      error: {
        code: error?.code,
        message: error?.message,
        details: error?.details
      },
      context,
      stack: error?.stack
    });
  }
}
