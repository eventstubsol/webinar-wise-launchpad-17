
import { ZoomConnectionInsert, ZoomConnectionUpdate } from '@/types/zoom';
import { TokenUtils } from '../../utils/tokenUtils';

/**
 * Encryption utilities for connection operations
 */
export class ConnectionEncryption {
  /**
   * Encrypt tokens in connection insert data
   */
  static async encryptInsertData(data: ZoomConnectionInsert): Promise<ZoomConnectionInsert> {
    const encryptedAccessToken = await TokenUtils.encryptToken(
      data.access_token,
      data.user_id
    );
    const encryptedRefreshToken = await TokenUtils.encryptToken(
      data.refresh_token,
      data.user_id
    );

    return {
      ...data,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
    };
  }

  /**
   * Encrypt tokens in connection update data
   */
  static async encryptUpdateData(
    updates: ZoomConnectionUpdate,
    userId: string
  ): Promise<ZoomConnectionUpdate> {
    const encryptedUpdates = { ...updates };

    if (updates.access_token) {
      encryptedUpdates.access_token = await TokenUtils.encryptToken(
        updates.access_token,
        userId
      );
    }

    if (updates.refresh_token) {
      encryptedUpdates.refresh_token = await TokenUtils.encryptToken(
        updates.refresh_token,
        userId
      );
    }

    return encryptedUpdates;
  }

  /**
   * Decrypt tokens in connection data
   */
  static async decryptConnectionData(data: any): Promise<any> {
    if (!data) return data;

    try {
      const decryptedData = { ...data };

      if (data.access_token) {
        decryptedData.access_token = await TokenUtils.decryptToken(
          data.access_token,
          data.user_id
        );
      }

      if (data.refresh_token) {
        decryptedData.refresh_token = await TokenUtils.decryptToken(
          data.refresh_token,
          data.user_id
        );
      }

      return decryptedData;
    } catch (error) {
      console.error('Token decryption failed:', error);
      // Return original data if decryption fails
      return data;
    }
  }

  /**
   * Decrypt tokens for multiple connections
   */
  static async decryptMultipleConnections(connections: any[]): Promise<any[]> {
    return await Promise.all(
      connections.map(connection => this.decryptConnectionData(connection))
    );
  }
}
