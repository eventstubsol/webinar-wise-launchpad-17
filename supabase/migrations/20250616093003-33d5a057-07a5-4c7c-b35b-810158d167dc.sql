
-- Add missing fields to zoom_registrants table to align with Zoom API
ALTER TABLE zoom_registrants 
ADD COLUMN IF NOT EXISTS join_url TEXT,
ADD COLUMN IF NOT EXISTS create_time TIMESTAMP WITH TIME ZONE;

-- Update the status constraint to match exact Zoom API enum values
ALTER TABLE zoom_registrants 
DROP CONSTRAINT IF EXISTS zoom_registrants_status_check;

ALTER TABLE zoom_registrants 
ADD CONSTRAINT zoom_registrants_status_check 
CHECK (status IN ('approved', 'denied', 'pending'));

-- Add index for join_url for potential performance benefits
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_join_url ON zoom_registrants(join_url) WHERE join_url IS NOT NULL;

-- Add index for create_time for time-based queries
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_create_time ON zoom_registrants(create_time) WHERE create_time IS NOT NULL;
