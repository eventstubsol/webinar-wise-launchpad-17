# Database Migrations

This directory contains all database migrations for the Webinar Wise platform.

## Migration Naming Convention

Migrations are named using the following pattern:
```
{number}_{description}.sql
```

Examples:
- `001_create_audit_log_system.sql`
- `002_cleanup_backup_tables.sql`
- `003_add_email_tracking.sql`

## How to Create a New Migration

1. Create a new file with the next sequential number
2. Write your SQL migration
3. Test locally first
4. Apply using Supabase CLI or the migration service

## Migration Best Practices

1. **Always use transactions** when possible
2. **Make migrations idempotent** - they should be safe to run multiple times
3. **Include rollback instructions** in comments
4. **Test on a branch first** before applying to production
5. **Document the reason** for the migration

## Example Migration Template

```sql
-- Migration: {number}_{description}
-- Created: {date}
-- Author: {your_name}
-- Purpose: {why this migration is needed}

BEGIN;

-- Your migration SQL here
CREATE TABLE IF NOT EXISTS ...

-- Rollback instructions (commented out)
-- DROP TABLE IF EXISTS ...

COMMIT;
```

## Applying Migrations

### Using Supabase CLI
```bash
supabase db push
```

### Using the Migration Service
```typescript
import { applyMigration } from '@/services/database/migrations';

await applyMigration('003_add_email_tracking.sql');
```

## Migration History

The `schema_migrations` table tracks which migrations have been applied.

## Backup Strategy

Before major migrations:
1. Supabase automatic backups are enabled
2. Use database branching for testing
3. Export critical data using the backup utility
4. All changes are tracked in the audit_log table
