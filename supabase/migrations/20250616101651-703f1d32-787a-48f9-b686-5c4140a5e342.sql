
-- Create participant status enum for Zoom API status values
CREATE TYPE participant_status AS ENUM ('in_meeting', 'in_waiting_room');

-- Add missing fields to zoom_participants table to align with Zoom API
ALTER TABLE zoom_participants 
ADD COLUMN IF NOT EXISTS failover BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status participant_status,
ADD COLUMN IF NOT EXISTS internal_user BOOLEAN DEFAULT false;

-- Make join_time nullable since API can return participants without join times
ALTER TABLE zoom_participants ALTER COLUMN join_time DROP NOT NULL;

-- Add indexes for new fields for better query performance
CREATE INDEX IF NOT EXISTS idx_zoom_participants_status ON zoom_participants(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_zoom_participants_failover ON zoom_participants(failover) WHERE failover = true;
CREATE INDEX IF NOT EXISTS idx_zoom_participants_internal_user ON zoom_participants(internal_user) WHERE internal_user = true;

-- Add comment for documentation
COMMENT ON COLUMN zoom_participants.failover IS 'Whether failover occurred during the webinar';
COMMENT ON COLUMN zoom_participants.status IS 'Participant status: in_meeting or in_waiting_room';
COMMENT ON COLUMN zoom_participants.internal_user IS 'Whether the webinar participant is an internal user';
