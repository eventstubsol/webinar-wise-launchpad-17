
-- Fix the zoom_participants table constraints to handle null values properly
-- and fix the ip_address field type issue

-- Drop the existing unique constraint that's causing issues
ALTER TABLE zoom_participants 
DROP CONSTRAINT IF EXISTS zoom_participants_webinar_id_participant_id_key;

-- Create a new unique constraint that handles the reality of participant data
-- Use a partial unique index to handle cases where participant_id might be null
CREATE UNIQUE INDEX IF NOT EXISTS idx_zoom_participants_unique 
ON zoom_participants (webinar_id, COALESCE(participant_id, 'null_' || id::text));

-- Also ensure we have a proper index for queries
CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_participant 
ON zoom_participants (webinar_id, participant_id) 
WHERE participant_id IS NOT NULL;

-- Update the ip_address column to use text instead of inet to avoid type conversion issues
ALTER TABLE zoom_participants 
ALTER COLUMN ip_address TYPE text;
