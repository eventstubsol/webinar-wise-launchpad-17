
import { ZoomConnection, ConnectionStatus } from '@/types/zoom';

/**
 * Data transformation utilities for connections
 */
export class ConnectionTransforms {
  /**
   * Transform raw database data to ZoomConnection type
   */
  static transformToZoomConnection(data: any): ZoomConnection {
    return {
      ...data,
      connection_status: data.connection_status as ConnectionStatus,
    } as ZoomConnection;
  }

  /**
   * Transform multiple database records to ZoomConnection array
   */
  static transformMultipleToZoomConnections(dataArray: any[]): ZoomConnection[] {
    return dataArray.map(data => this.transformToZoomConnection(data));
  }

  /**
   * Prepare success response with proper typing
   */
  static prepareSuccessResponse(data: any): ZoomConnection {
    return this.transformToZoomConnection(data);
  }
}
