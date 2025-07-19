
import { ZoomConnectionInsert, ZoomConnectionUpdate } from '@/types/zoom';

/**
 * No-op encryption utilities - tokens are stored as plain text now
 */
export class ConnectionEncryption {
  /**
   * Pass-through for connection insert data (no encryption)
   */
  static async encryptInsertData(data: ZoomConnectionInsert): Promise<ZoomConnectionInsert> {
    return data;
  }

  /**
   * Pass-through for connection update data (no encryption)
   */
  static async encryptUpdateData(
    updates: ZoomConnectionUpdate,
    userId: string
  ): Promise<ZoomConnectionUpdate> {
    return updates;
  }

  /**
   * Pass-through for connection data (no decryption needed)
   */
  static async decryptConnectionData(data: any): Promise<any> {
    return data;
  }

  /**
   * Pass-through for multiple connections (no decryption needed)
   */
  static async decryptMultipleConnections(connections: any[]): Promise<any[]> {
    return connections;
  }
}
