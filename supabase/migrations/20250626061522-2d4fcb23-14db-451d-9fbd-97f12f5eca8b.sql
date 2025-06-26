
-- First, drop the dependent view that's causing the migration to fail
DROP VIEW IF EXISTS zoom_webinars_with_calculated_status;

-- Now we can safely make our schema changes
-- Remove duplicate/redundant columns from zoom_webinars table
ALTER TABLE zoom_webinars 
DROP COLUMN IF EXISTS attendees_count,
DROP COLUMN IF EXISTS registrants_count;

-- Ensure we have all the correct columns with proper names
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS total_attendees integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_registrants integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_absentees integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_attendance_duration integer DEFAULT 0;

-- Add participant session tracking columns if they don't exist
ALTER TABLE zoom_participants 
ADD COLUMN IF NOT EXISTS participant_session_id text,
ADD COLUMN IF NOT EXISTS session_sequence integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_rejoin_session boolean DEFAULT false;

-- Create unique constraint on participant_id and webinar_id to prevent duplicates
ALTER TABLE zoom_participants 
DROP CONSTRAINT IF EXISTS unique_participant_webinar_session;

ALTER TABLE zoom_participants 
ADD CONSTRAINT unique_participant_webinar_session 
UNIQUE (webinar_id, participant_id, participant_session_id);

-- Recreate the view with correct column references
CREATE OR REPLACE VIEW zoom_webinars_with_calculated_status AS
SELECT 
  *,
  calculate_webinar_status(start_time, duration) as calculated_status
FROM zoom_webinars;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_sync_status 
ON zoom_webinars(participant_sync_status);

CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_id 
ON zoom_webinars(connection_id);

CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_session 
ON zoom_participants(webinar_id, participant_session_id);
