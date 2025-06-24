
import { supabase } from '@/integrations/supabase/client';

export interface Migration {
  id: string;
  name: string;
  version: string;
  sql: string;
  rollback_sql?: string;
  executed_at?: Date;
  checksum?: string;
}

export interface MigrationStatus {
  pending: Migration[];
  executed: Migration[];
  failed: Migration[];
}

export class DatabaseMigrationService {
  /**
   * Get all available migrations
   */
  static async getMigrations(): Promise<Migration[]> {
    // This would typically come from a migrations directory
    // For now, return an empty array as migrations are handled by Supabase
    return [];
  }

  /**
   * Get migration status
   */
  static async getMigrationStatus(): Promise<MigrationStatus> {
    try {
      // Check if migrations table exists
      const { data: migrationRecords, error } = await supabase
        .from('migrations')
        .select('*')
        .order('executed_at', { ascending: false });

      if (error) {
        console.log('Migrations table not found, assuming clean state');
        return {
          pending: [],
          executed: [],
          failed: []
        };
      }

      const availableMigrations = await this.getMigrations();
      
      // Type the database records properly
      const executedMigrations: Migration[] = (migrationRecords || []).map(record => ({
        id: record.id || '',
        name: record.name || '',
        version: record.version || '',
        sql: record.sql || '',
        rollback_sql: record.rollback_sql,
        executed_at: record.executed_at ? new Date(record.executed_at) : undefined,
        checksum: record.checksum
      }));

      const executedIds = new Set(executedMigrations.map(m => m.id));
      const pendingMigrations = availableMigrations.filter(m => !executedIds.has(m.id));
      
      // Separate failed migrations (if we track status)
      const failedMigrations: Migration[] = [];

      return {
        pending: pendingMigrations,
        executed: executedMigrations,
        failed: failedMigrations
      };
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return {
        pending: [],
        executed: [],
        failed: []
      };
    }
  }

  /**
   * Execute a migration
   */
  static async executeMigration(migration: Migration): Promise<boolean> {
    try {
      // In a real implementation, you would execute the SQL
      // For now, just record that it was executed
      const { error } = await supabase.from('migrations').insert({
        id: migration.id,
        name: migration.name,
        version: migration.version,
        sql: migration.sql,
        rollback_sql: migration.rollback_sql,
        executed_at: new Date().toISOString(),
        checksum: migration.checksum
      });

      if (error) {
        console.error('Failed to record migration:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Migration execution failed:', error);
      return false;
    }
  }

  /**
   * Rollback a migration
   */
  static async rollbackMigration(migration: Migration): Promise<boolean> {
    try {
      if (!migration.rollback_sql) {
        console.error('No rollback SQL available for migration:', migration.name);
        return false;
      }

      // Execute rollback SQL (in real implementation)
      // For now, just remove the migration record
      const { error } = await supabase
        .from('migrations')
        .delete()
        .eq('id', migration.id);

      if (error) {
        console.error('Failed to rollback migration:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Migration rollback failed:', error);
      return false;
    }
  }

  /**
   * Validate migration integrity
   */
  static async validateMigrations(): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const status = await this.getMigrationStatus();
      const errors: string[] = [];

      // Check for missing migrations
      if (status.failed.length > 0) {
        errors.push(`${status.failed.length} migrations have failed`);
      }

      // Check for checksum mismatches (if implemented)
      for (const migration of status.executed) {
        if (migration.checksum) {
          // Validate checksum (implementation would go here)
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      };
    }
  }

  /**
   * Create a new migration
   */
  static createMigration(name: string, sql: string, rollbackSql?: string): Migration {
    const timestamp = new Date().toISOString().replace(/[:-]/g, '').slice(0, 15);
    const id = `${timestamp}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    return {
      id,
      name,
      version: timestamp,
      sql,
      rollback_sql: rollbackSql,
      checksum: this.calculateChecksum(sql)
    };
  }

  /**
   * Calculate migration checksum
   */
  private static calculateChecksum(sql: string): string {
    // Simple checksum calculation
    let hash = 0;
    for (let i = 0; i < sql.length; i++) {
      const char = sql.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Export migration history
   */
  static async exportMigrationHistory(): Promise<Migration[]> {
    const status = await this.getMigrationStatus();
    return status.executed;
  }

  /**
   * Import migration history
   */
  static async importMigrationHistory(migrations: Migration[]): Promise<boolean> {
    try {
      for (const migration of migrations) {
        await supabase.from('migrations').upsert({
          id: migration.id,
          name: migration.name,
          version: migration.version,
          sql: migration.sql,
          rollback_sql: migration.rollback_sql,
          executed_at: migration.executed_at?.toISOString(),
          checksum: migration.checksum
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to import migration history:', error);
      return false;
    }
  }
}
