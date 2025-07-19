
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Utility to clean up corrupted connections from the old encryption system
 */
export class ConnectionCleanup {
  /**
   * Clear all existing connections for a user (to remove encrypted tokens)
   */
  static async clearUserConnections(userId: string): Promise<boolean> {
    try {
      console.log('Clearing all connections for user:', userId);
      
      const { error } = await supabase
        .from('zoom_connections')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to clear user connections:', error);
        return false;
      }

      console.log('All connections cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing user connections:', error);
      return false;
    }
  }

  /**
   * Check if a connection has valid plain text tokens
   */
  static isValidPlainTextConnection(connection: any): boolean {
    // Check if tokens look like plain text (not base64 encoded)
    try {
      // If it's a JWT or similar, it should contain dots
      // If it's base64 encrypted, it won't have the JWT structure
      const token = connection.access_token;
      
      // Plain text tokens should be longer than 50 characters and not look like base64
      if (!token || token.length < 50) {
        return false;
      }
      
      // JWT tokens contain dots, encrypted tokens typically don't
      // Server-to-Server tokens are usually JWTs
      return token.includes('.') || token.startsWith('eyJ');
    } catch {
      return false;
    }
  }

  /**
   * Auto-cleanup corrupted connections during connection retrieval
   */
  static async autoCleanupCorruptedConnections(userId: string): Promise<void> {
    try {
      const { data: connections } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('user_id', userId);

      if (!connections || connections.length === 0) {
        return;
      }

      const corruptedIds: string[] = [];

      for (const connection of connections) {
        if (!this.isValidPlainTextConnection(connection)) {
          corruptedIds.push(connection.id);
        }
      }

      if (corruptedIds.length > 0) {
        console.log(`Found ${corruptedIds.length} corrupted connections, cleaning up...`);
        
        const { error } = await supabase
          .from('zoom_connections')
          .delete()
          .in('id', corruptedIds);

        if (error) {
          console.error('Failed to clean up corrupted connections:', error);
        } else {
          console.log('Corrupted connections cleaned up successfully');
          toast({
            title: "Connection Cleanup",
            description: "Old encrypted connections have been cleaned up. Please reconnect your Zoom account.",
            variant: "default",
          });
        }
      }
    } catch (error) {
      console.error('Error during auto-cleanup:', error);
    }
  }
}
