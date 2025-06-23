-- Migration to fix sync_status column issue
-- This creates a generated column alias to handle legacy queries

-- First, let's add a generated column that mirrors the status column
-- This will handle any cached or old code that's still looking for sync_status
ALTER TABLE zoom_sync_logs 
ADD COLUMN IF NOT EXISTS sync_status text GENERATED ALWAYS AS (status) STORED;

-- Create an index on the generated column for performance
CREATE INDEX IF NOT EXISTS idx_zoom_sync_logs_sync_status ON zoom_sync_logs(sync_status);

-- Add a comment explaining why this column exists
COMMENT ON COLUMN zoom_sync_logs.sync_status IS 'Generated column alias for status column - added for backward compatibility with cached queries';
