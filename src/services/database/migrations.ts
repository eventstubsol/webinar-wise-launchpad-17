import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

export interface Migration {
  id: string;
  name: string;
  applied_at?: Date;
  checksum?: string;
}

export class MigrationService {
  private supabase: ReturnType<typeof createClient>;
  private migrationsPath: string;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.migrationsPath = path.join(process.cwd(), 'supabase', 'migrations');
  }

  /**
   * Initialize the schema_migrations table
   */
  async initialize(): Promise<void> {
    const { error } = await this.supabase.rpc('query', {
      query: `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW(),
          checksum TEXT,
          executed_by UUID REFERENCES auth.users(id),
          execution_time_ms INTEGER,
          success BOOLEAN DEFAULT true,
          error_message TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
        ON schema_migrations(applied_at);
      `
    });

    if (error) {
      throw new Error(`Failed to initialize migrations table: ${error.message}`);
    }
  }

  /**
   * Get list of pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    // Get all migration files
    const files = await fs.readdir(this.migrationsPath);
    const migrationFiles = files
      .filter(f => f.endsWith('.sql') && !f.includes('README'))
      .sort();

    // Get applied migrations
    const { data: applied, error } = await this.supabase
      .from('schema_migrations')
      .select('id, name, applied_at')
      .order('id');

    if (error) {
      throw new Error(`Failed to get applied migrations: ${error.message}`);
    }

    const appliedIds = new Set((applied || []).map(m => m.id));

    // Return pending migrations
    return migrationFiles
      .filter(file => {
        const id = file.split('_')[0];
        return !appliedIds.has(id);
      })
      .map(file => ({
        id: file.split('_')[0],
        name: file
      }));
  }

  /**
   * Apply a single migration
   */
  async applyMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();
    const migrationPath = path.join(this.migrationsPath, migration.name);
    
    try {
      // Read migration file
      const sql = await fs.readFile(migrationPath, 'utf-8');
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(sql);
      
      // Apply migration
      const { error } = await this.supabase.rpc('query', { query: sql });
      
      if (error) {
        throw error;
      }
      
      // Record successful migration
      await this.supabase.from('schema_migrations').insert({
        id: migration.id,
        name: migration.name,
        checksum,
        execution_time_ms: Date.now() - startTime,
        success: true
      });
      
      console.log(`✅ Applied migration: ${migration.name}`);
      
    } catch (error) {
      // Record failed migration
      await this.supabase.from('schema_migrations').insert({
        id: migration.id,
        name: migration.name,
        execution_time_ms: Date.now() - startTime,
        success: false,
        error_message: error instanceof Error ? error.message : String(error)
      });
      
      throw new Error(`Failed to apply migration ${migration.name}: ${error}`);
    }
  }

  /**
   * Apply all pending migrations
   */
  async applyAllPending(): Promise<void> {
    await this.initialize();
    
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      console.log('✅ Database is up to date');
      return;
    }
    
    console.log(`Found ${pending.length} pending migrations`);
    
    for (const migration of pending) {
      await this.applyMigration(migration);
    }
    
    console.log('✅ All migrations applied successfully');
  }

  /**
   * Rollback a migration (if rollback SQL is provided)
   */
  async rollbackMigration(migrationId: string): Promise<void> {
    // This would need to parse the migration file for rollback instructions
    // For now, we'll just mark it as rolled back
    const { error } = await this.supabase
      .from('schema_migrations')
      .delete()
      .eq('id', migrationId);
      
    if (error) {
      throw new Error(`Failed to rollback migration: ${error.message}`);
    }
    
    console.log(`⏪ Rolled back migration: ${migrationId}`);
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    applied: Migration[];
    pending: Migration[];
    failed: Migration[];
  }> {
    const { data: applied } = await this.supabase
      .from('schema_migrations')
      .select('*')
      .eq('success', true)
      .order('id');
      
    const { data: failed } = await this.supabase
      .from('schema_migrations')
      .select('*')
      .eq('success', false)
      .order('id');
      
    const pending = await this.getPendingMigrations();
    
    return {
      applied: applied || [],
      pending,
      failed: failed || []
    };
  }

  /**
   * Calculate checksum for migration content
   */
  private async calculateChecksum(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate migration files
   */
  async validateMigrations(): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const files = await fs.readdir(this.migrationsPath);
    const migrationFiles = files.filter(f => f.endsWith('.sql'));
    
    // Check for duplicate IDs
    const ids = migrationFiles.map(f => f.split('_')[0]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    
    if (duplicates.length > 0) {
      errors.push(`Duplicate migration IDs found: ${duplicates.join(', ')}`);
    }
    
    // Check for gaps in numbering
    const sortedIds = ids.map(Number).sort((a, b) => a - b);
    for (let i = 1; i < sortedIds.length; i++) {
      if (sortedIds[i] - sortedIds[i - 1] > 1) {
        errors.push(`Gap in migration numbering between ${sortedIds[i - 1]} and ${sortedIds[i]}`);
      }
    }
    
    // Validate SQL syntax (basic check)
    for (const file of migrationFiles) {
      const content = await fs.readFile(
        path.join(this.migrationsPath, file),
        'utf-8'
      );
      
      if (content.trim().length === 0) {
        errors.push(`Migration ${file} is empty`);
      }
      
      // Check for common SQL issues
      const upperContent = content.toUpperCase();
      if (!upperContent.includes('BEGIN') && upperContent.includes('DROP')) {
        errors.push(`Migration ${file} contains DROP without transaction`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  const service = new MigrationService(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  async function run() {
    switch (command) {
      case 'up':
        await service.applyAllPending();
        break;
        
      case 'status':
        const status = await service.getStatus();
        console.log('📊 Migration Status:');
        console.log(`Applied: ${status.applied.length}`);
        console.log(`Pending: ${status.pending.length}`);
        console.log(`Failed: ${status.failed.length}`);
        
        if (status.pending.length > 0) {
          console.log('\nPending migrations:');
          status.pending.forEach(m => console.log(`  - ${m.name}`));
        }
        break;
        
      case 'validate':
        const validation = await service.validateMigrations();
        if (validation.valid) {
          console.log('✅ All migrations are valid');
        } else {
          console.log('❌ Validation errors:');
          validation.errors.forEach(e => console.log(`  - ${e}`));
        }
        break;
        
      default:
        console.log('Usage: npm run migrate [up|status|validate]');
    }
  }
  
  run().catch(console.error);
}
