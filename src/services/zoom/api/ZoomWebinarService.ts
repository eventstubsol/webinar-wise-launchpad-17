
import { zoomApiClient } from './ZoomApiClient';
import { ZoomWebinar } from '@/types/zoom';

/**
 * Zoom API response for webinar list
 */
interface ZoomWebinarListResponse {
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
  webinars: ZoomWebinar[];
}

/**
 * Service for Zoom Webinar API operations
 */
export class ZoomWebinarService {
  /**
   * Get list of webinars for the authenticated user
   */
  static async getWebinars(options: {
    pageSize?: number;
    pageNumber?: number;
    type?: 'scheduled' | 'live' | 'upcoming';
  } = {}): Promise<ZoomWebinarListResponse | null> {
    const {
      pageSize = 30,
      pageNumber = 1,
      type = 'scheduled'
    } = options;

    const params = new URLSearchParams({
      page_size: pageSize.toString(),
      page_number: pageNumber.toString(),
      type,
    });

    const response = await zoomApiClient.get<ZoomWebinarListResponse>(
      `/users/me/webinars?${params}`
    );

    if (response.success) {
      return response.data || null;
    }

    console.error('Failed to fetch webinars:', response.error);
    return null;
  }

  /**
   * Get detailed information about a specific webinar
   */
  static async getWebinar(webinarId: string): Promise<ZoomWebinar | null> {
    const response = await zoomApiClient.get<ZoomWebinar>(
      `/webinars/${webinarId}`
    );

    if (response.success) {
      return response.data || null;
    }

    console.error(`Failed to fetch webinar ${webinarId}:`, response.error);
    return null;
  }

  /**
   * Get webinar registrants
   */
  static async getWebinarRegistrants(webinarId: string, options: {
    pageSize?: number;
    pageNumber?: number;
    status?: 'pending' | 'approved' | 'denied';
  } = {}) {
    const {
      pageSize = 30,
      pageNumber = 1,
      status = 'approved'
    } = options;

    const params = new URLSearchParams({
      page_size: pageSize.toString(),
      page_number: pageNumber.toString(),
      status,
    });

    const response = await zoomApiClient.get(
      `/webinars/${webinarId}/registrants?${params}`
    );

    if (response.success) {
      return response.data;
    }

    console.error(`Failed to fetch registrants for webinar ${webinarId}:`, response.error);
    return null;
  }

  /**
   * Get webinar participants (for past webinars)
   */
  static async getWebinarParticipants(webinarId: string, options: {
    pageSize?: number;
    nextPageToken?: string;
  } = {}) {
    const {
      pageSize = 30,
      nextPageToken
    } = options;

    const params = new URLSearchParams({
      page_size: pageSize.toString(),
    });

    if (nextPageToken) {
      params.append('next_page_token', nextPageToken);
    }

    const response = await zoomApiClient.get(
      `/report/webinars/${webinarId}/participants?${params}`
    );

    if (response.success) {
      return response.data;
    }

    console.error(`Failed to fetch participants for webinar ${webinarId}:`, response.error);
    return null;
  }

  /**
   * Get webinar polls
   */
  static async getWebinarPolls(webinarId: string) {
    const response = await zoomApiClient.get(
      `/webinars/${webinarId}/polls`
    );

    if (response.success) {
      return response.data;
    }

    console.error(`Failed to fetch polls for webinar ${webinarId}:`, response.error);
    return null;
  }

  /**
   * Get webinar Q&A
   */
  static async getWebinarQA(webinarId: string) {
    const response = await zoomApiClient.get(
      `/report/webinars/${webinarId}/qa`
    );

    if (response.success) {
      return response.data;
    }

    console.error(`Failed to fetch Q&A for webinar ${webinarId}:`, response.error);
    return null;
  }
}
