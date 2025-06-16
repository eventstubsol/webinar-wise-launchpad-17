
import { ZoomConnectionInsert, ZoomConnectionUpdate } from '@/types/zoom';
import { toast } from '@/hooks/use-toast';

/**
 * Validation utilities for connection data
 */
export class ConnectionValidation {
  /**
   * Validate connection insert data
   */
  static validateInsertData(data: ZoomConnectionInsert): string | null {
    if (!data.user_id) {
      return 'User ID is required';
    }
    
    if (!data.zoom_user_id) {
      return 'Zoom user ID is required';
    }
    
    if (!data.access_token || data.access_token.length < 10) {
      return 'Valid access token is required';
    }
    
    if (!data.refresh_token || data.refresh_token.length < 10) {
      return 'Valid refresh token is required';
    }
    
    if (!data.token_expires_at) {
      return 'Token expiration time is required';
    }
    
    return null;
  }

  /**
   * Validate connection update data
   */
  static validateUpdateData(data: ZoomConnectionUpdate): string | null {
    if (data.access_token && data.access_token.length < 10) {
      return 'Valid access token is required';
    }
    
    if (data.refresh_token && data.refresh_token.length < 10) {
      return 'Valid refresh token is required';
    }
    
    return null;
  }

  /**
   * Show validation error to user
   */
  static showValidationError(error: string): void {
    toast({
      title: "Validation Error",
      description: error,
      variant: "destructive",
    });
  }
}
