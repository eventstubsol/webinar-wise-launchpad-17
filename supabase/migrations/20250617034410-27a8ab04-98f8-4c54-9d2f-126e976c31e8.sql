
-- Update the zoom_webinars status constraint to include all possible status values
ALTER TABLE zoom_webinars 
DROP CONSTRAINT IF EXISTS zoom_webinars_status_check;

-- Add comprehensive status constraint that covers all Zoom API status possibilities
ALTER TABLE zoom_webinars 
ADD CONSTRAINT zoom_webinars_status_check 
CHECK (status IN (
    'available', 'unavailable', 'started', 'ended', 'deleted', 'scheduled',
    'completed', 'upcoming', 'cancelled', 'live', 'finished'
));

-- Update any existing webinars with 'available' status to have proper status based on timing
UPDATE zoom_webinars 
SET status = CASE
    WHEN start_time IS NULL THEN 'scheduled'
    WHEN start_time > NOW() THEN 'upcoming'
    WHEN start_time <= NOW() AND (start_time + INTERVAL '1 minute' * COALESCE(duration, 60)) > NOW() THEN 'live'
    WHEN start_time <= NOW() AND (start_time + INTERVAL '1 minute' * COALESCE(duration, 60)) <= NOW() THEN 'completed'
    ELSE status
END
WHERE status = 'available' AND start_time IS NOT NULL;

-- Add index for better status-based queries
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_status_start_time ON zoom_webinars(status, start_time);
