
-- Add retry tracking fields to zoom_sync_logs table
ALTER TABLE zoom_sync_logs 
ADD COLUMN retry_attempts INTEGER DEFAULT 0,
ADD COLUMN retry_schedule JSONB DEFAULT '[]'::jsonb,
ADD COLUMN max_participant_retries INTEGER DEFAULT 3;

-- Add index for efficient retry queue queries
CREATE INDEX idx_zoom_sync_logs_retry_schedule ON zoom_sync_logs USING GIN (retry_schedule);

-- Add index for retry attempts tracking
CREATE INDEX idx_zoom_sync_logs_retry_attempts ON zoom_sync_logs(retry_attempts);
