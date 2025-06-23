
-- Phase 1: Database Schema Alignment
-- Add missing sync_notes column to zoom_sync_logs table
ALTER TABLE zoom_sync_logs ADD COLUMN IF NOT EXISTS sync_notes JSONB DEFAULT '{}';

-- Add index for performance on sync_notes queries
CREATE INDEX IF NOT EXISTS idx_zoom_sync_logs_sync_notes ON zoom_sync_logs USING GIN (sync_notes);

-- Update any existing records to have empty sync_notes if null
UPDATE zoom_sync_logs SET sync_notes = '{}' WHERE sync_notes IS NULL;
