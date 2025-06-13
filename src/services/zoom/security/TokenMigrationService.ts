
import { supabase } from '@/integrations/supabase/client';
import { TokenEncryptionService } from './TokenEncryptionService';
import { toast } from '@/hooks/use-toast';

/**
 * Service to migrate existing tokens to new encryption
 */
export class TokenMigrationService {
  /**
   * Check if tokens need migration (are using old base64 encoding)
   */
  static async checkMigrationNeeded(userId: string): Promise<boolean> {
    try {
      const { data: connections } = await supabase
        .from('zoom_connections')
        .select('id, access_token')
        .eq('user_id', userId)
        .limit(1);

      if (!connections || connections.length === 0) {
        return false; // No connections to migrate
      }

      // Check if token can be decoded as base64 (old format)
      try {
        const token = connections[0].access_token;
        atob(token); // If this succeeds, it's likely base64 encoded
        
        // Try to validate if it's properly encrypted
        const canDecrypt = await TokenEncryptionService.validateTokenDecryption(token, userId);
        return !canDecrypt; // If we can't decrypt with new service, migration is needed
      } catch {
        return false; // Already encrypted or invalid
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Migrate all user tokens from base64 to secure encryption
   */
  static async migrateUserTokens(userId: string): Promise<boolean> {
    try {
      if (!TokenEncryptionService.isSupported()) {
        console.warn('Web Crypto API not supported, skipping migration');
        return false;
      }

      // Get all user connections
      const { data: connections, error } = await supabase
        .from('zoom_connections')
        .select('id, access_token, refresh_token')
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to fetch connections for migration:', error);
        return false;
      }

      if (!connections || connections.length === 0) {
        return true; // No connections to migrate
      }

      let migratedCount = 0;
      const errors: string[] = [];

      for (const connection of connections) {
        try {
          // Try to decode base64 tokens (old format)
          let accessToken: string;
          let refreshToken: string;

          try {
            accessToken = atob(connection.access_token);
            refreshToken = atob(connection.refresh_token);
          } catch {
            // Tokens might already be encrypted, skip this connection
            console.log(`Connection ${connection.id} tokens already encrypted, skipping`);
            continue;
          }

          // Re-encrypt with new service
          const newEncryptedAccess = await TokenEncryptionService.encryptToken(accessToken, userId);
          const newEncryptedRefresh = await TokenEncryptionService.encryptToken(refreshToken, userId);

          // Update in database
          const { error: updateError } = await supabase
            .from('zoom_connections')
            .update({
              access_token: newEncryptedAccess,
              refresh_token: newEncryptedRefresh,
              updated_at: new Date().toISOString(),
            })
            .eq('id', connection.id);

          if (updateError) {
            errors.push(`Connection ${connection.id}: ${updateError.message}`);
          } else {
            migratedCount++;
          }
        } catch (error) {
          errors.push(`Connection ${connection.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        console.error('Migration errors:', errors);
        toast({
          title: "Migration Warning",
          description: `${migratedCount} tokens migrated successfully, ${errors.length} failed.`,
          variant: "destructive",
        });
        return false;
      }

      if (migratedCount > 0) {
        toast({
          title: "Migration Complete",
          description: `Successfully migrated ${migratedCount} token(s) to secure encryption.`,
        });
      }

      return true;
    } catch (error) {
      console.error('Token migration failed:', error);
      toast({
        title: "Migration Error",
        description: "Failed to migrate tokens to secure encryption.",
        variant: "destructive",
      });
      return false;
    }
  }

  /**
   * Run migration check and migrate if needed
   */
  static async autoMigrateIfNeeded(userId: string): Promise<void> {
    try {
      const needsMigration = await this.checkMigrationNeeded(userId);
      if (needsMigration) {
        console.log('Token migration needed, starting migration...');
        await this.migrateUserTokens(userId);
      }
    } catch (error) {
      console.error('Auto migration check failed:', error);
    }
  }
}
