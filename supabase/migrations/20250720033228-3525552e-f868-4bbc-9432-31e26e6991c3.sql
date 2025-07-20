
-- Deep dive RCA fix: Clean up zoom_webinars table schema
-- This migration addresses duplicate columns and constraint issues

-- First, let's safely consolidate duplicate columns and clean up the schema
-- We'll keep the most appropriate column names and drop duplicates

-- 1. Consolidate webinar_id columns (keep zoom_webinar_id as primary)
UPDATE zoom_webinars 
SET zoom_webinar_id = COALESCE(zoom_webinar_id, webinar_id)
WHERE zoom_webinar_id IS NULL AND webinar_id IS NOT NULL;

-- 2. Drop the duplicate webinar_id column
ALTER TABLE zoom_webinars DROP COLUMN IF EXISTS webinar_id;

-- 3. Ensure zoom_webinar_id is properly typed as TEXT and not null
ALTER TABLE zoom_webinars ALTER COLUMN zoom_webinar_id SET NOT NULL;

-- 4. Add comprehensive logging table for sync operations
CREATE TABLE IF NOT EXISTS zoom_sync_operation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_id UUID NOT NULL,
  operation_type TEXT NOT NULL, -- 'webinar_upsert', 'registrant_fetch', etc.
  webinar_zoom_id TEXT,
  operation_status TEXT NOT NULL, -- 'success', 'error', 'skipped'
  error_details JSONB DEFAULT '{}',
  operation_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create RLS policies for the new logging table
ALTER TABLE zoom_sync_operation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage sync operation logs" 
ON zoom_sync_operation_logs 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Users can view sync operation logs for their syncs" 
ON zoom_sync_operation_logs 
FOR SELECT 
USING (
  sync_id IN (
    SELECT zsl.id 
    FROM zoom_sync_logs zsl
    JOIN zoom_connections zc ON zsl.connection_id = zc.id
    WHERE zc.user_id = auth.uid()
  )
);

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zoom_sync_operation_logs_sync_id 
ON zoom_sync_operation_logs(sync_id);

CREATE INDEX IF NOT EXISTS idx_zoom_sync_operation_logs_status 
ON zoom_sync_operation_logs(operation_status);

-- 7. Ensure the unique constraint exists and is properly named
DO $$ 
BEGIN
    -- Drop existing constraint if it exists with old name
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'zoom_webinars_connection_id_zoom_webinar_id_key'
    ) THEN
        ALTER TABLE zoom_webinars 
        DROP CONSTRAINT zoom_webinars_connection_id_zoom_webinar_id_key;
    END IF;
    
    -- Add the constraint with proper name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'zoom_webinars_connection_zoom_webinar_unique'
    ) THEN
        ALTER TABLE zoom_webinars 
        ADD CONSTRAINT zoom_webinars_connection_zoom_webinar_unique 
        UNIQUE (connection_id, zoom_webinar_id);
    END IF;
END $$;

-- 8. Add a function to verify sync data integrity
CREATE OR REPLACE FUNCTION verify_sync_data_integrity()
RETURNS TABLE(
  sync_id UUID,
  expected_webinars INTEGER,
  actual_webinars INTEGER,
  missing_webinars INTEGER,
  integrity_status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    zsl.id as sync_id,
    zsl.total_items as expected_webinars,
    zsl.processed_items as actual_webinars,
    (zsl.total_items - zsl.processed_items) as missing_webinars,
    CASE 
      WHEN zsl.total_items = zsl.processed_items THEN 'COMPLETE'
      WHEN zsl.processed_items = 0 THEN 'NO_DATA_SAVED'
      ELSE 'PARTIAL_SYNC'
    END as integrity_status
  FROM zoom_sync_logs zsl
  WHERE zsl.sync_status = 'completed'
  ORDER BY zsl.created_at DESC;
END;
$$;

-- 9. Clean up any orphaned or duplicate records
WITH duplicate_webinars AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY connection_id, zoom_webinar_id 
      ORDER BY created_at DESC
    ) as rn
  FROM zoom_webinars
)
DELETE FROM zoom_webinars 
WHERE id IN (
  SELECT id FROM duplicate_webinars WHERE rn > 1
);

-- 10. Add trigger to automatically log webinar operations
CREATE OR REPLACE FUNCTION log_webinar_operation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log successful webinar upserts
  INSERT INTO zoom_sync_operation_logs (
    sync_id,
    operation_type,
    webinar_zoom_id,
    operation_status,
    operation_duration_ms
  ) VALUES (
    COALESCE(NEW.last_synced_at::TEXT::UUID, gen_random_uuid()), -- Use a placeholder sync_id
    'webinar_upsert',
    NEW.zoom_webinar_id,
    'success',
    0
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for webinar insert/update operations
DROP TRIGGER IF EXISTS webinar_operation_log_trigger ON zoom_webinars;
CREATE TRIGGER webinar_operation_log_trigger
  AFTER INSERT OR UPDATE ON zoom_webinars
  FOR EACH ROW
  EXECUTE FUNCTION log_webinar_operation();
