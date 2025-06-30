# Reverting Supabase Changes from June 29, 2025

## ⚠️ WARNING
This will revert all database changes made today. Please ensure you understand the implications before proceeding.

## Changes Made Today
Based on the analysis:
- **43 new participants** were added
- **40 webinars** were updated with sync information
- **21 sync logs** were created
- Several database schema changes (columns, constraints, indexes)

## Step-by-Step Revert Process

### Step 1: Create Backup (REQUIRED)
First, create a backup of your current data:

```sql
-- Run this in Supabase SQL Editor
-- File: backup_before_revert.sql
```

This will create backup tables in a schema named `backup_20250629`.

### Step 2: Execute Revert
After confirming the backup, run the revert script:

```sql
-- Run this in Supabase SQL Editor
-- File: revert_june29_changes.sql
```

This script will:
1. Delete all participants created today (43 records)
2. Delete all sync logs created today (21 records)
3. Reset webinar sync fields to their previous state
4. Remove constraints added today
5. Remove indexes added today
6. Remove columns added today (if any)

### Step 3: Alternative - Selective Revert

If you only want to revert specific changes:

#### Option A: Keep Structure, Remove Data Only
```sql
-- Just remove today's data, keep schema changes
DELETE FROM zoom_participants WHERE created_at >= '2025-06-29'::date;
DELETE FROM zoom_sync_logs WHERE created_at >= '2025-06-29'::date;

-- Reset webinar sync status
UPDATE zoom_webinars 
SET 
  participant_sync_status = 'pending',
  actual_participant_count = 0,
  unique_participant_count = 0
WHERE updated_at >= '2025-06-29'::date;
```

#### Option B: Reset to Yesterday's State
```sql
-- Restore from yesterday's backup if you have one
-- Or use Supabase's Point-in-Time Recovery if available
```

### Step 4: Verify the Revert
After running the revert:

```sql
-- Check remaining data
SELECT 
  'zoom_participants' as table_name, 
  COUNT(*) as count 
FROM zoom_participants
UNION ALL
SELECT 
  'zoom_sync_logs today', 
  COUNT(*) 
FROM zoom_sync_logs 
WHERE created_at >= '2025-06-29'::date;
```

## Using Supabase Dashboard

Alternatively, you can use Supabase's built-in features:

1. **Point-in-Time Recovery** (if enabled):
   - Go to Settings > Database
   - Use PITR to restore to a point before today's changes

2. **Manual Revert via Dashboard**:
   - Go to Table Editor
   - Filter records by `created_at >= '2025-06-29'`
   - Select and delete records

## Recover from Backup

If you need to restore from the backup:

```sql
-- Restore webinars
TRUNCATE zoom_webinars CASCADE;
INSERT INTO zoom_webinars 
SELECT * FROM backup_20250629.zoom_webinars;

-- Restore participants
TRUNCATE zoom_participants CASCADE;
INSERT INTO zoom_participants 
SELECT * FROM backup_20250629.zoom_participants;

-- Restore sync logs
TRUNCATE zoom_sync_logs CASCADE;
INSERT INTO zoom_sync_logs 
SELECT * FROM backup_20250629.zoom_sync_logs;
```

## Important Notes

1. **Cascading Deletes**: Deleting participants might affect related tables
2. **Constraints**: Some operations might fail if foreign key constraints exist
3. **Application Impact**: Your application might expect the new columns/structure

## Recommended Approach

1. **First**, run the backup script
2. **Test** in a development environment if possible
3. **Execute** the revert in small steps
4. **Monitor** your application for any issues
5. **Keep** the backup schema for at least a week

## Need Help?

If you encounter issues:
1. Check Supabase logs for errors
2. Use the backup to restore if needed
3. Consider using Supabase support for Point-in-Time Recovery
