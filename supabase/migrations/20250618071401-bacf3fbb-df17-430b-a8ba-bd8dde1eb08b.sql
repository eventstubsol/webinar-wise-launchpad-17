
-- Add missing registrant_uuid column to align with Zoom API
ALTER TABLE zoom_registrants 
ADD COLUMN IF NOT EXISTS registrant_uuid TEXT;

-- Add index for registrant_uuid for performance
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_registrant_uuid 
ON zoom_registrants(registrant_uuid) 
WHERE registrant_uuid IS NOT NULL;

-- Update the unique constraint to include registrant_uuid as an alternative identifier
-- Drop existing constraint first
ALTER TABLE zoom_registrants 
DROP CONSTRAINT IF EXISTS zoom_registrants_webinar_id_registrant_id_key;

-- Add new constraint that allows either registrant_id or registrant_uuid
ALTER TABLE zoom_registrants 
ADD CONSTRAINT zoom_registrants_unique_per_webinar 
UNIQUE (webinar_id, registrant_id);

-- Add comment for clarity
COMMENT ON COLUMN zoom_registrants.registrant_uuid IS 'Zoom API registrant UUID field for enhanced identification';
