
import { 
  ZoomConnection, 
  ZoomConnectionInsert, 
  ZoomConnectionUpdate 
} from '@/types/zoom';
import { toast } from '@/hooks/use-toast';
import { ConnectionValidation } from './crud/connectionValidation';
import { ConnectionDatabase } from './crud/connectionDatabase';
import { ConnectionEncryption } from './crud/connectionEncryption';
import { ConnectionTransforms } from './crud/connectionTransforms';

/**
 * CRUD operations for Zoom connections
 */
export class ConnectionCrud {
  /**
   * Create a new Zoom connection
   */
  static async createConnection(connectionData: ZoomConnectionInsert): Promise<ZoomConnection | null> {
    try {
      // Validate input data
      const validationError = ConnectionValidation.validateInsertData(connectionData);
      if (validationError) {
        ConnectionValidation.showValidationError(validationError);
        return null;
      }

      // Encrypt tokens before storing
      const encryptedData = await ConnectionEncryption.encryptInsertData(connectionData);

      // Insert into database
      const result = await ConnectionDatabase.insertConnection(encryptedData);
      if (!result) return null;

      // Show success message
      toast({
        title: "Success",
        description: "Zoom account connected successfully!",
      });

      // Decrypt and transform for return
      const decryptedData = await ConnectionEncryption.decryptConnectionData(result);
      return ConnectionTransforms.prepareSuccessResponse(decryptedData);
    } catch (error) {
      console.error('Unexpected error creating connection:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }

  /**
   * Get a connection by ID with decrypted tokens
   */
  static async getConnection(id: string): Promise<ZoomConnection | null> {
    try {
      const data = await ConnectionDatabase.getConnectionById(id);
      if (!data) return null;

      // Decrypt tokens and transform
      const decryptedData = await ConnectionEncryption.decryptConnectionData(data);
      return ConnectionTransforms.prepareSuccessResponse(decryptedData);
    } catch (error) {
      console.error('Unexpected error getting connection:', error);
      toast({
        title: "Error",
        description: "Failed to retrieve connection. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }

  /**
   * Get all connections for a user
   */
  static async getUserConnections(userId: string): Promise<ZoomConnection[]> {
    try {
      const data = await ConnectionDatabase.getConnectionsByUserId(userId);
      if (!data.length) return [];

      // Decrypt tokens for all connections
      const decryptedConnections = await ConnectionEncryption.decryptMultipleConnections(data);
      return ConnectionTransforms.transformMultipleToZoomConnections(decryptedConnections);
    } catch (error) {
      console.error('Unexpected error getting user connections:', error);
      toast({
        title: "Error",
        description: "Failed to load connections. Please try again.",
        variant: "destructive",
      });
      return [];
    }
  }

  /**
   * Update a connection
   */
  static async updateConnection(id: string, updates: ZoomConnectionUpdate): Promise<ZoomConnection | null> {
    try {
      // Validate input data
      const validationError = ConnectionValidation.validateUpdateData(updates);
      if (validationError) {
        ConnectionValidation.showValidationError(validationError);
        return null;
      }

      // Get user_id for encryption
      const userId = await ConnectionDatabase.getConnectionUserIdById(id);
      if (!userId) {
        toast({
          title: "Error",
          description: "Connection not found.",
          variant: "destructive",
        });
        return null;
      }

      // Encrypt tokens if they're being updated
      const encryptedUpdates = await ConnectionEncryption.encryptUpdateData(updates, userId);

      // Update in database
      const result = await ConnectionDatabase.updateConnectionById(id, encryptedUpdates);
      if (!result) return null;

      // Return with proper type casting
      return ConnectionTransforms.prepareSuccessResponse(result);
    } catch (error) {
      console.error('Unexpected error updating connection:', error);
      toast({
        title: "Error",
        description: "Failed to update connection. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }

  /**
   * Delete a connection
   */
  static async deleteConnection(id: string): Promise<boolean> {
    try {
      const success = await ConnectionDatabase.deleteConnectionById(id);
      
      if (success) {
        toast({
          title: "Success",
          description: "Zoom account disconnected successfully.",
        });
      }

      return success;
    } catch (error) {
      console.error('Unexpected error deleting connection:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect account. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }
}
