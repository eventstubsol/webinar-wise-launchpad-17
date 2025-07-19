
-- Fix database constraints for proper upsert operations in zoom sync

-- Add missing unique constraints for zoom_webinars upsert
-- This constraint allows upsert on (connection_id, zoom_webinar_id)
ALTER TABLE zoom_webinars 
ADD CONSTRAINT zoom_webinars_connection_zoom_webinar_unique 
UNIQUE (connection_id, zoom_webinar_id);

-- Add missing unique constraints for zoom_participants upsert  
-- This constraint allows upsert on (webinar_id, participant_id)
-- Note: Using participant_id (not participant_uuid) to match sync function logic
DO $$ 
BEGIN
    -- Check if participant_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'zoom_participants' 
        AND column_name = 'participant_id'
    ) THEN
        ALTER TABLE zoom_participants ADD COLUMN participant_id TEXT;
    END IF;
    
    -- Add unique constraint for upsert operations
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'zoom_participants_webinar_participant_unique'
    ) THEN
        ALTER TABLE zoom_participants
        ADD CONSTRAINT zoom_participants_webinar_participant_unique 
        UNIQUE (webinar_id, participant_id);
    END IF;
END $$;

-- Add missing unique constraints for zoom_registrants upsert
-- This constraint allows upsert on (webinar_id, registrant_id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'zoom_registrants_webinar_registrant_unique'
    ) THEN
        ALTER TABLE zoom_registrants
        ADD CONSTRAINT zoom_registrants_webinar_registrant_unique 
        UNIQUE (webinar_id, registrant_id);
    END IF;
END $$;

-- Add indexes for better performance on these constraints
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_zoom_webinar 
ON zoom_webinars(connection_id, zoom_webinar_id);

CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_participant 
ON zoom_participants(webinar_id, participant_id);

CREATE INDEX IF NOT EXISTS idx_zoom_registrants_webinar_registrant 
ON zoom_registrants(webinar_id, registrant_id);

-- Add performance indexes for sync operations
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_status ON zoom_webinars(status);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_participant_sync_status ON zoom_webinars(participant_sync_status);
CREATE INDEX IF NOT EXISTS idx_zoom_sync_logs_status ON zoom_sync_logs(sync_status);

-- Ensure participant_id is properly populated from participant_uuid where missing
UPDATE zoom_participants 
SET participant_id = participant_uuid 
WHERE participant_id IS NULL AND participant_uuid IS NOT NULL;
