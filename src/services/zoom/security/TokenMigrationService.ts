
import { supabase } from '@/integrations/supabase/client';
import { TokenUtils, TokenDecryptionError } from '../utils/tokenUtils';

/**
 * Service to handle token migration and recovery for corrupted encryption
 */
export class TokenMigrationService {
  /**
   * Check if token migration is needed for a user
   */
  static async checkMigrationNeeded(userId: string): Promise<boolean> {
    try {
      const { data: connections } = await supabase
        .from('zoom_connections')
        .select('id, access_token, refresh_token')
        .eq('user_id', userId)
        .eq('connection_status', 'active');

      if (!connections || connections.length === 0) {
        return false;
      }

      // Check if any tokens fail to decrypt
      for (const connection of connections) {
        try {
          const accessTokenValid = await TokenUtils.validateTokenDecryption(
            connection.access_token, 
            userId
          );
          const refreshTokenValid = await TokenUtils.validateTokenDecryption(
            connection.refresh_token, 
            userId
          );

          if (!accessTokenValid || !refreshTokenValid) {
            console.log('Migration needed for connection:', connection.id);
            return true;
          }
        } catch (error) {
          // If validation throws an error, migration is likely needed
          console.log('Token validation error, migration needed:', error.message);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Migrate tokens for a user (mark connections as needing re-auth)
   */
  static async migrateUserTokens(userId: string): Promise<void> {
    try {
      console.log('Starting token migration for user:', userId);
      
      // Delete all connections instead of marking as error to force clean slate
      const { error } = await supabase
        .from('zoom_connections')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to delete connections during migration:', error);
        throw error;
      }

      console.log('Token migration completed - all connections deleted for user:', userId);
    } catch (error) {
      console.error('Token migration failed:', error);
      throw error;
    }
  }

  /**
   * Auto-migrate if needed (called during connection retrieval) - DISABLED to prevent error loops
   */
  static async autoMigrateIfNeeded(userId: string): Promise<void> {
    // Temporarily disabled to prevent error loops
    // The cleanup is now handled directly in getPrimaryConnection
    console.log('Auto-migration disabled - cleanup handled in connection retrieval');
    return;
  }
}
