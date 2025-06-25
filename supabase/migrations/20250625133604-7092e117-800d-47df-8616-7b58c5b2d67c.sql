
-- Phase 1: Update zoom_participants table to match Zoom API documentation
-- Add missing engagement and technical fields from participants API

ALTER TABLE zoom_participants 
-- Participant identification (fix existing columns)
ADD COLUMN IF NOT EXISTS participant_id TEXT, -- For storing the actual participant ID from API
ADD COLUMN IF NOT EXISTS participant_name TEXT, -- Rename from 'name' for clarity
ADD COLUMN IF NOT EXISTS participant_email TEXT, -- Rename from 'email' for clarity
ADD COLUMN IF NOT EXISTS participant_user_id TEXT, -- Rename from 'user_id' for clarity

-- Engagement metrics from Zoom API
ADD COLUMN IF NOT EXISTS attentiveness_score INTEGER,
ADD COLUMN IF NOT EXISTS camera_on_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_application_duration INTEGER DEFAULT 0, 
ADD COLUMN IF NOT EXISTS share_desktop_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_whiteboard_duration INTEGER DEFAULT 0,

-- Interaction flags
ADD COLUMN IF NOT EXISTS posted_chat BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS raised_hand BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS answered_polling BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS asked_question BOOLEAN DEFAULT FALSE,

-- Technical information
ADD COLUMN IF NOT EXISTS device TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS network_type TEXT,
ADD COLUMN IF NOT EXISTS version TEXT,
ADD COLUMN IF NOT EXISTS customer_key TEXT,

-- Participant status enum for better data integrity
ADD COLUMN IF NOT EXISTS participant_status TEXT DEFAULT 'in_meeting';

-- Add check constraint for participant_status separately
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'zoom_participants_participant_status_check'
    ) THEN
        ALTER TABLE zoom_participants 
        ADD CONSTRAINT zoom_participants_participant_status_check 
        CHECK (participant_status IN ('in_meeting', 'in_waiting_room'));
    END IF;
END $$;

-- Update zoom_registrants table to ensure full alignment with registrants API
ALTER TABLE zoom_registrants
-- Add missing fields from registrants API
ADD COLUMN IF NOT EXISTS registrant_uuid TEXT,
ADD COLUMN IF NOT EXISTS source_id TEXT,
ADD COLUMN IF NOT EXISTS tracking_source TEXT,
ADD COLUMN IF NOT EXISTS registration_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS language TEXT,

-- Fields to track attendance (populated when participant data is available)
ADD COLUMN IF NOT EXISTS join_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS leave_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_zoom_participants_participant_id ON zoom_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_zoom_participants_attentiveness ON zoom_participants(attentiveness_score);
CREATE INDEX IF NOT EXISTS idx_zoom_participants_engagement ON zoom_participants(posted_chat, raised_hand, answered_polling, asked_question);
CREATE INDEX IF NOT EXISTS idx_zoom_participants_status ON zoom_participants(participant_status);

CREATE INDEX IF NOT EXISTS idx_zoom_registrants_registration_time ON zoom_registrants(registration_time);
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_attended ON zoom_registrants(attended);
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_uuid ON zoom_registrants(registrant_uuid);

-- Add unique constraints with proper syntax
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_webinar_participant'
    ) THEN
        ALTER TABLE zoom_participants 
        ADD CONSTRAINT unique_webinar_participant UNIQUE (webinar_id, participant_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_webinar_registrant'
    ) THEN
        ALTER TABLE zoom_registrants
        ADD CONSTRAINT unique_webinar_registrant UNIQUE (webinar_id, registrant_id);
    END IF;
END $$;

-- Update existing records to set default values for new fields
UPDATE zoom_participants 
SET 
  participant_id = COALESCE(participant_id, participant_uuid),
  participant_name = COALESCE(participant_name, name),
  participant_email = COALESCE(participant_email, email),
  participant_user_id = COALESCE(participant_user_id, user_id),
  camera_on_duration = COALESCE(camera_on_duration, 0),
  share_application_duration = COALESCE(share_application_duration, 0),
  share_desktop_duration = COALESCE(share_desktop_duration, 0),
  share_whiteboard_duration = COALESCE(share_whiteboard_duration, 0),
  posted_chat = COALESCE(posted_chat, FALSE),
  raised_hand = COALESCE(raised_hand, FALSE),
  answered_polling = COALESCE(answered_polling, FALSE),
  asked_question = COALESCE(asked_question, FALSE),
  participant_status = COALESCE(participant_status, 'in_meeting')
WHERE 
  participant_id IS NULL OR 
  participant_name IS NULL OR 
  participant_email IS NULL;

UPDATE zoom_registrants
SET 
  attended = COALESCE(attended, FALSE),
  registration_time = COALESCE(registration_time, create_time, created_at)
WHERE 
  attended IS NULL OR 
  registration_time IS NULL;
