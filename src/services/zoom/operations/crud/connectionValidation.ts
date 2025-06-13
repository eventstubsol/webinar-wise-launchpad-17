
import { ZoomConnectionInsert, ZoomConnectionUpdate } from '@/types/zoom';
import { toast } from '@/hooks/use-toast';

/**
 * Validation utilities for connection operations
 */
export class ConnectionValidation {
  /**
   * Validate connection data for creation
   */
  static validateInsertData(data: ZoomConnectionInsert): string | null {
    if (!data.user_id) {
      return 'User ID is required';
    }
    
    if (!data.zoom_user_id) {
      return 'Zoom user ID is required';
    }
    
    if (!data.access_token) {
      return 'Access token is required';
    }
    
    if (!data.refresh_token) {
      return 'Refresh token is required';
    }
    
    if (!data.token_expires_at) {
      return 'Token expiration time is required';
    }

    return null;
  }

  /**
   * Validate connection data for updates
   */
  static validateUpdateData(data: ZoomConnectionUpdate): string | null {
    // For updates, only validate non-empty values
    if (data.access_token === '') {
      return 'Access token cannot be empty';
    }
    
    if (data.refresh_token === '') {
      return 'Refresh token cannot be empty';
    }

    return null;
  }

  /**
   * Show validation error toast
   */
  static showValidationError(message: string): void {
    toast({
      title: "Validation Error",
      description: message,
      variant: "destructive",
    });
  }
}
