-- Fix participant sync constraint issues

-- First, check if the unique constraint exists and create it if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'zoom_participants_webinar_participant_unique'
    ) THEN
        -- Remove any duplicate participants first
        DELETE FROM zoom_participants a
        USING zoom_participants b
        WHERE a.id < b.id
        AND a.webinar_id = b.webinar_id
        AND a.participant_id = b.participant_id;

        -- Create the unique constraint
        ALTER TABLE zoom_participants
        ADD CONSTRAINT zoom_participants_webinar_participant_unique 
        UNIQUE (webinar_id, participant_id);
    END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_id 
ON zoom_participants(webinar_id);

CREATE INDEX IF NOT EXISTS idx_zoom_participants_participant_id 
ON zoom_participants(participant_id);

-- Add composite index for queries
CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_participant 
ON zoom_participants(webinar_id, participant_id);

-- Update the participant_sync_status for webinars that had constraint errors
UPDATE zoom_webinars
SET 
    participant_sync_status = 'pending',
    participant_sync_error = NULL,
    participant_sync_attempted_at = NULL
WHERE 
    participant_sync_error LIKE '%ON CONFLICT DO UPDATE command cannot affect row a second time%'
    OR participant_sync_error LIKE '%no unique or exclusion constraint matching the ON CONFLICT specification%';

-- Add comment for documentation
COMMENT ON CONSTRAINT zoom_participants_webinar_participant_unique ON zoom_participants 
IS 'Ensures unique participants per webinar to prevent duplicate entries';
