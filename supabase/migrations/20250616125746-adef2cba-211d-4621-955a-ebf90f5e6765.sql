
-- Update the status check constraint to include all possible Zoom webinar status values
ALTER TABLE zoom_webinars 
DROP CONSTRAINT IF EXISTS zoom_webinars_status_check;

-- Add updated constraint with all known Zoom webinar status values
-- Based on Zoom API documentation: available, unavailable, started, ended, aborted
ALTER TABLE zoom_webinars 
ADD CONSTRAINT zoom_webinars_status_check 
CHECK (status IN ('available', 'unavailable', 'started', 'ended', 'aborted', 'deleted'));

-- Add index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_status ON zoom_webinars(status);

-- Add index on start_time for status update queries
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_start_time ON zoom_webinars(start_time);
