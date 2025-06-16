
import { ZoomConnection } from '@/types/zoom';

/**
 * Data transformation utilities for connections - simplified for plain text tokens
 */
export class ConnectionTransforms {
  /**
   * Transform database result to ZoomConnection - no decryption needed
   */
  static prepareSuccessResponse(data: any): ZoomConnection {
    return {
      ...data,
      // Ensure all required fields are present
      scopes: data.scopes || [],
      auto_sync_enabled: data.auto_sync_enabled ?? true,
      sync_frequency_hours: data.sync_frequency_hours ?? 24,
    } as ZoomConnection;
  }

  /**
   * Transform multiple database results to ZoomConnections
   */
  static transformMultipleToZoomConnections(connections: any[]): ZoomConnection[] {
    return connections.map(conn => this.prepareSuccessResponse(conn));
  }
}
