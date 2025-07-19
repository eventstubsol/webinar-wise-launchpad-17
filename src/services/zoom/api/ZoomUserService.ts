
import { zoomApiClient } from './ZoomApiClient';

/**
 * Zoom user information from API
 */
interface ZoomUser {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  email: string;
  type: number;
  role_name: string;
  account_type: string;
  status: string;
  timezone: string;
  verified: number;
  created_at: string;
  last_login_time: string;
}

/**
 * Service for Zoom User API operations
 */
export class ZoomUserService {
  /**
   * Get current user information
   */
  static async getCurrentUser(): Promise<ZoomUser | null> {
    const response = await zoomApiClient.get<ZoomUser>('/users/me');

    if (response.success) {
      return response.data || null;
    }

    console.error('Failed to fetch current user:', response.error);
    return null;
  }

  /**
   * Get user settings
   */
  static async getUserSettings() {
    const response = await zoomApiClient.get('/users/me/settings');

    if (response.success) {
      return response.data;
    }

    console.error('Failed to fetch user settings:', response.error);
    return null;
  }

  /**
   * Validate connection by making a simple API call
   */
  static async validateConnection(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }
}
