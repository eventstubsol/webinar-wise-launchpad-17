
-- Add missing fields to zoom_registrants table for full API compliance
ALTER TABLE zoom_registrants 
ADD COLUMN IF NOT EXISTS occurrence_id text,
ADD COLUMN IF NOT EXISTS tracking_source_id text,
ADD COLUMN IF NOT EXISTS registration_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS source_id text,
ADD COLUMN IF NOT EXISTS tracking_source text,
ADD COLUMN IF NOT EXISTS language text;

-- Add indexes for performance on new query parameters
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_occurrence_id ON zoom_registrants(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_tracking_source_id ON zoom_registrants(tracking_source_id);
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_registration_time ON zoom_registrants(registration_time);

-- Create a unique index that handles nullable occurrence_id properly
-- This allows multiple registrants with NULL occurrence_id, but enforces uniqueness when occurrence_id is provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_zoom_registrants_unique_registration 
ON zoom_registrants (webinar_id, registrant_id, occurrence_id)
WHERE occurrence_id IS NOT NULL;

-- Create another unique index for registrants without occurrence_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_zoom_registrants_unique_registration_no_occurrence 
ON zoom_registrants (webinar_id, registrant_id)
WHERE occurrence_id IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN zoom_registrants.occurrence_id IS 'The meeting or webinar occurrence ID for recurring webinars';
COMMENT ON COLUMN zoom_registrants.tracking_source_id IS 'The tracking source ID for registration source tracking';
COMMENT ON COLUMN zoom_registrants.registration_time IS 'When the registrant registered for the webinar';
COMMENT ON COLUMN zoom_registrants.source_id IS 'Source identifier for tracking registration sources';
COMMENT ON COLUMN zoom_registrants.tracking_source IS 'Source tracking information for analytics';
COMMENT ON COLUMN zoom_registrants.language IS 'Registrant preferred language';
