-- REVERT SCRIPT: Undo all changes made on June 29, 2025
-- WARNING: This will remove data and schema changes. Make sure to backup first!

-- Step 1: Remove all data created today
BEGIN;

-- Delete sync logs created today
DELETE FROM zoom_sync_logs 
WHERE created_at >= '2025-06-29'::date;

-- Delete participants created today (43 records)
DELETE FROM zoom_participants 
WHERE created_at >= '2025-06-29'::date;

-- Delete participant sessions created today
DELETE FROM zoom_participant_sessions 
WHERE created_at >= '2025-06-29'::date;

-- Revert updates made to webinars today
-- Note: This is tricky as we need to restore previous values
-- For now, we'll reset the sync-related fields
UPDATE zoom_webinars 
SET 
  participant_sync_status = 'pending',
  actual_participant_count = 0,
  unique_participant_count = 0,
  participant_sync_completed_at = NULL,
  last_successful_sync = NULL,
  sync_method = NULL,
  updated_at = updated_at -- Keep the timestamp as is
WHERE updated_at >= '2025-06-29'::date 
  AND created_at < '2025-06-29'::date;

COMMIT;

-- Step 2: Drop constraints added today
ALTER TABLE zoom_webinars DROP CONSTRAINT IF EXISTS zoom_webinars_zoom_webinar_id_connection_id_key;
ALTER TABLE zoom_participants DROP CONSTRAINT IF EXISTS zoom_participants_webinar_id_participant_uuid_key;
ALTER TABLE zoom_participant_sessions DROP CONSTRAINT IF EXISTS zoom_participant_sessions_session_id_key;
ALTER TABLE zoom_registrants DROP CONSTRAINT IF EXISTS zoom_registrants_webinar_id_registrant_id_key;

-- Step 3: Drop indexes added today
DROP INDEX IF EXISTS idx_zoom_webinars_connection_id;
DROP INDEX IF EXISTS idx_zoom_webinars_sync_status;
DROP INDEX IF EXISTS idx_zoom_participants_webinar_id;
DROP INDEX IF EXISTS idx_zoom_participant_sessions_participant_id;
DROP INDEX IF EXISTS idx_zoom_participant_sessions_webinar_id;
DROP INDEX IF EXISTS idx_zoom_registrants_webinar_id;
DROP INDEX IF EXISTS idx_zoom_sync_logs_connection_id;
DROP INDEX IF EXISTS idx_zoom_sync_logs_sync_status;

-- Step 4: Remove columns added today (if any)
-- First check which columns were added
DO $$ 
BEGIN
  -- Remove columns that might have been added today
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'actual_participant_count') THEN
    ALTER TABLE zoom_webinars DROP COLUMN actual_participant_count;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'unique_participant_count') THEN
    ALTER TABLE zoom_webinars DROP COLUMN unique_participant_count;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'participant_sync_status') THEN
    ALTER TABLE zoom_webinars DROP COLUMN participant_sync_status;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'participant_sync_completed_at') THEN
    ALTER TABLE zoom_webinars DROP COLUMN participant_sync_completed_at;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'last_successful_sync') THEN
    ALTER TABLE zoom_webinars DROP COLUMN last_successful_sync;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_webinars' AND column_name = 'sync_method') THEN
    ALTER TABLE zoom_webinars DROP COLUMN sync_method;
  END IF;
  
  -- Remove participant columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_participants' AND column_name = 'first_join_time') THEN
    ALTER TABLE zoom_participants DROP COLUMN first_join_time;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_participants' AND column_name = 'last_leave_time') THEN
    ALTER TABLE zoom_participants DROP COLUMN last_leave_time;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_participants' AND column_name = 'is_aggregated') THEN
    ALTER TABLE zoom_participants DROP COLUMN is_aggregated;
  END IF;
  
  -- Remove sync log columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_sync_logs' AND column_name = 'sync_progress') THEN
    ALTER TABLE zoom_sync_logs DROP COLUMN sync_progress;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_sync_logs' AND column_name = 'current_operation') THEN
    ALTER TABLE zoom_sync_logs DROP COLUMN current_operation;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zoom_sync_logs' AND column_name = 'metadata') THEN
    ALTER TABLE zoom_sync_logs DROP COLUMN metadata;
  END IF;
END $$;

-- Step 5: Verify the revert
SELECT 'Data Revert Summary:' as info
UNION ALL
SELECT 'zoom_participants remaining: ' || COUNT(*)::text FROM zoom_participants
UNION ALL
SELECT 'zoom_sync_logs from today: ' || COUNT(*)::text FROM zoom_sync_logs WHERE created_at >= '2025-06-29'::date
UNION ALL
SELECT 'zoom_webinars with sync data: ' || COUNT(*)::text FROM zoom_webinars WHERE participant_sync_status IS NOT NULL;
