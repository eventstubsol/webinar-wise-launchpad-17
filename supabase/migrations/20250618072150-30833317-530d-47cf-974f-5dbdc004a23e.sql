
-- Phase 1: Fix registrant_id type mismatch by handling foreign key constraints
-- First, drop the foreign key constraint that's preventing the type change
ALTER TABLE zoom_participants 
DROP CONSTRAINT IF EXISTS zoom_participants_registrant_id_fkey;

-- Now change registrant_id from uuid to text to match Zoom API string format
ALTER TABLE zoom_participants 
ALTER COLUMN registrant_id TYPE text;

-- Add missing fields from the /past_webinars/{webinarId}/participants API spec
ALTER TABLE zoom_participants 
ADD COLUMN IF NOT EXISTS failover boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS internal_user boolean DEFAULT false;

-- Update the participant_status enum to match API specification exactly
-- First check if the enum needs updating
DO $$ 
BEGIN
    -- Add enum values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'in_meeting' AND enumtypid = 'participant_status'::regtype) THEN
        ALTER TYPE participant_status ADD VALUE 'in_meeting';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'in_waiting_room' AND enumtypid = 'participant_status'::regtype) THEN
        ALTER TYPE participant_status ADD VALUE 'in_waiting_room';
    END IF;
END $$;

-- Add indexes for new fields for better query performance
CREATE INDEX IF NOT EXISTS idx_zoom_participants_failover 
ON zoom_participants(failover) WHERE failover = true;

CREATE INDEX IF NOT EXISTS idx_zoom_participants_internal_user 
ON zoom_participants(internal_user);

-- Add index for registrant_id as text type
CREATE INDEX IF NOT EXISTS idx_zoom_participants_registrant_id_text 
ON zoom_participants(registrant_id) WHERE registrant_id IS NOT NULL;

-- Add comment explaining the registrant_id type change
COMMENT ON COLUMN zoom_participants.registrant_id IS 'Participant registrant ID as string (matches Zoom API format)';
COMMENT ON COLUMN zoom_participants.failover IS 'Whether failover occurred during the webinar (from Zoom API)';
COMMENT ON COLUMN zoom_participants.internal_user IS 'Whether the webinar participant is an internal user (from Zoom API)';
