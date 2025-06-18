
-- Complete Zoom webinar schema with missing fields and optimizations

-- Add missing h323_passcode field (Zoom API uses 'passcode', not just 'password')
ALTER TABLE zoom_webinars ADD COLUMN IF NOT EXISTS h323_passcode text;

-- Add proper type constraint (webinar types: 5=webinar, 6=recurring, 9=recurring_fixed)
ALTER TABLE zoom_webinars DROP CONSTRAINT IF EXISTS zoom_webinars_type_check;
ALTER TABLE zoom_webinars DROP CONSTRAINT IF EXISTS check_webinar_type;

ALTER TABLE zoom_webinars 
ADD CONSTRAINT zoom_webinars_type_check 
CHECK (type IN (5, 6, 9));

-- Add status constraint (ensure only valid status values)
ALTER TABLE zoom_webinars DROP CONSTRAINT IF EXISTS zoom_webinars_status_check;
ALTER TABLE zoom_webinars DROP CONSTRAINT IF EXISTS check_webinar_status;

ALTER TABLE zoom_webinars 
ADD CONSTRAINT zoom_webinars_status_check 
CHECK (status IN ('available', 'unavailable', 'deleted', 'started', 'ended', 'scheduled'));

-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_status ON zoom_webinars(status);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_start_time ON zoom_webinars(start_time);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_host_id ON zoom_webinars(host_id);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_status 
  ON zoom_webinars(connection_id, status);

CREATE INDEX IF NOT EXISTS idx_zoom_webinars_host_start_time 
  ON zoom_webinars(host_id, start_time);

CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_webinar_id 
  ON zoom_webinars(connection_id, webinar_id);

-- Partial indexes for active webinars (better performance for common queries)
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_active 
  ON zoom_webinars(start_time) 
  WHERE status IN ('scheduled', 'started');

-- Index for sync status tracking
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_sync_status 
  ON zoom_webinars(participant_sync_status) 
  WHERE participant_sync_status IS NOT NULL;

-- Add index for type filtering
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_type ON zoom_webinars(type);
