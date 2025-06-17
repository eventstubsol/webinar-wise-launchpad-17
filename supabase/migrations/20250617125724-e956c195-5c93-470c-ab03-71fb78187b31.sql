
-- Add participant sync status enum type
CREATE TYPE participant_sync_status AS ENUM (
    'not_applicable',
    'pending', 
    'synced',
    'failed',
    'no_participants'
);

-- Add new columns to zoom_webinars table for participant sync tracking
ALTER TABLE zoom_webinars 
ADD COLUMN participant_sync_status participant_sync_status DEFAULT 'pending',
ADD COLUMN participant_sync_attempted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN participant_sync_error TEXT;

-- Create index for efficient querying of sync status
CREATE INDEX idx_zoom_webinars_participant_sync_status ON zoom_webinars(participant_sync_status);
CREATE INDEX idx_zoom_webinars_participant_sync_attempted_at ON zoom_webinars(participant_sync_attempted_at);

-- Update existing webinars to have appropriate initial status based on their timing
UPDATE zoom_webinars 
SET participant_sync_status = CASE
    WHEN start_time IS NULL OR start_time > NOW() THEN 'not_applicable'::participant_sync_status
    WHEN start_time <= NOW() THEN 'pending'::participant_sync_status
    ELSE 'pending'::participant_sync_status
END;
