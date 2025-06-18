
-- First, let's see exactly what status values exist
SELECT status, COUNT(*) as count
FROM zoom_webinars 
GROUP BY status
ORDER BY count DESC;

-- Update any problematic status values step by step
UPDATE zoom_webinars 
SET status = 'available' 
WHERE status IS NULL;

UPDATE zoom_webinars 
SET status = 'available' 
WHERE status = '';

UPDATE zoom_webinars 
SET status = 'available' 
WHERE status NOT IN ('available', 'unavailable', 'deleted', 'started', 'ended', 'scheduled');

-- Verify all status values are now valid
SELECT DISTINCT status 
FROM zoom_webinars 
WHERE status NOT IN ('available', 'unavailable', 'deleted', 'started', 'ended', 'scheduled');

-- Only add constraint if no invalid rows exist
DO $$ 
BEGIN
    -- Check if any invalid status values still exist
    IF NOT EXISTS (
        SELECT 1 FROM zoom_webinars 
        WHERE status NOT IN ('available', 'unavailable', 'deleted', 'started', 'ended', 'scheduled')
    ) THEN
        -- Drop existing constraints
        ALTER TABLE zoom_webinars DROP CONSTRAINT IF EXISTS zoom_webinars_status_check;
        ALTER TABLE zoom_webinars DROP CONSTRAINT IF EXISTS check_webinar_status;
        
        -- Add the status constraint
        ALTER TABLE zoom_webinars 
        ADD CONSTRAINT zoom_webinars_status_check 
        CHECK (status IN ('available', 'unavailable', 'deleted', 'started', 'ended', 'scheduled'));
        
        RAISE NOTICE 'Status constraint added successfully';
    ELSE
        RAISE NOTICE 'Invalid status values still exist, constraint not added';
    END IF;
END $$;

-- Add missing h323_passcode field
ALTER TABLE zoom_webinars ADD COLUMN IF NOT EXISTS h323_passcode text;

-- Add type constraint (this should work as type is integer)
ALTER TABLE zoom_webinars DROP CONSTRAINT IF EXISTS zoom_webinars_type_check;
ALTER TABLE zoom_webinars DROP CONSTRAINT IF EXISTS check_webinar_type;

ALTER TABLE zoom_webinars 
ADD CONSTRAINT zoom_webinars_type_check 
CHECK (type IN (5, 6, 9));

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_status ON zoom_webinars(status);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_start_time ON zoom_webinars(start_time);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_host_id ON zoom_webinars(host_id);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_status ON zoom_webinars(connection_id, status);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_host_start_time ON zoom_webinars(host_id, start_time);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_active ON zoom_webinars(start_time) WHERE status IN ('scheduled', 'started');
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_type ON zoom_webinars(type);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_webinar_id ON zoom_webinars(connection_id, webinar_id);
