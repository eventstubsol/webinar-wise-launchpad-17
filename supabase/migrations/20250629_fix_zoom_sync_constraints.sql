-- Fix for Zoom sync: Ensure proper unique constraints for upsert operations

-- First, check if the unique constraint exists and drop it if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'zoom_webinars_zoom_webinar_id_connection_id_key'
    ) THEN
        ALTER TABLE zoom_webinars DROP CONSTRAINT zoom_webinars_zoom_webinar_id_connection_id_key;
    END IF;
END $$;

-- Create unique constraint for webinar upserts
ALTER TABLE zoom_webinars
ADD CONSTRAINT zoom_webinars_zoom_webinar_id_connection_id_key 
UNIQUE (zoom_webinar_id, connection_id);

-- Check and create unique constraint for participants
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'zoom_participants_webinar_id_participant_uuid_key'
    ) THEN
        ALTER TABLE zoom_participants
        ADD CONSTRAINT zoom_participants_webinar_id_participant_uuid_key 
        UNIQUE (webinar_id, participant_uuid);
    END IF;
END $$;

-- Check and create unique constraint for participant sessions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'zoom_participant_sessions_session_id_key'
    ) THEN
        ALTER TABLE zoom_participant_sessions
        ADD CONSTRAINT zoom_participant_sessions_session_id_key 
        UNIQUE (session_id);
    END IF;
END $$;

-- Check and create unique constraint for registrants
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'zoom_registrants_webinar_id_registrant_id_key'
    ) THEN
        ALTER TABLE zoom_registrants
        ADD CONSTRAINT zoom_registrants_webinar_id_registrant_id_key 
        UNIQUE (webinar_id, registrant_id);
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_id ON zoom_webinars(connection_id);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_sync_status ON zoom_webinars(participant_sync_status);
CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_id ON zoom_participants(webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_participant_sessions_participant_id ON zoom_participant_sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_zoom_participant_sessions_webinar_id ON zoom_participant_sessions(webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_webinar_id ON zoom_registrants(webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_sync_logs_connection_id ON zoom_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_zoom_sync_logs_sync_status ON zoom_sync_logs(sync_status);

-- Ensure columns exist for tracking
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS actual_participant_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_participant_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS participant_sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS participant_sync_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_successful_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_method TEXT;

ALTER TABLE zoom_participants
ADD COLUMN IF NOT EXISTS first_join_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_leave_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_aggregated BOOLEAN DEFAULT FALSE;

ALTER TABLE zoom_sync_logs
ADD COLUMN IF NOT EXISTS sync_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_operation TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment
COMMENT ON TABLE zoom_webinars IS 'Stores Zoom webinar data with proper unique constraints for upsert operations';
COMMENT ON TABLE zoom_participants IS 'Stores unique participants per webinar with session aggregation';
COMMENT ON TABLE zoom_participant_sessions IS 'Stores individual join/leave sessions for participants';
