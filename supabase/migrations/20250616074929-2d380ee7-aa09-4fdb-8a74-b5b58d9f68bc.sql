
-- First, let's see the current constraint definition
SELECT conname, pg_get_constraintdef(oid) as constraint_definition 
FROM pg_constraint 
WHERE conname = 'zoom_webinars_status_check';

-- Update the status check constraint to include all possible Zoom webinar status values
ALTER TABLE zoom_webinars 
DROP CONSTRAINT IF EXISTS zoom_webinars_status_check;

-- Add updated constraint with all known Zoom webinar status values
ALTER TABLE zoom_webinars 
ADD CONSTRAINT zoom_webinars_status_check 
CHECK (status IN ('available', 'unavailable', 'started', 'ended', 'deleted', 'scheduled'));

-- Also ensure the type column allows all Zoom webinar types
ALTER TABLE zoom_webinars 
DROP CONSTRAINT IF EXISTS zoom_webinars_type_check;

ALTER TABLE zoom_webinars 
ADD CONSTRAINT zoom_webinars_type_check 
CHECK (type IN (5, 6, 9));
