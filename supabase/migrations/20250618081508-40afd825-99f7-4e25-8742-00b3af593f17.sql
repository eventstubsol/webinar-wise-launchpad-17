
-- Phase 1: Database Schema Alignment
-- Add missing enum values to participant_status type to match code expectations

-- First, let's add the missing enum values that the code expects
ALTER TYPE participant_status ADD VALUE IF NOT EXISTS 'attended';
ALTER TYPE participant_status ADD VALUE IF NOT EXISTS 'not_attended';  
ALTER TYPE participant_status ADD VALUE IF NOT EXISTS 'left_early';

-- Update the comment on the zoom_participants table to clarify the status field
COMMENT ON COLUMN zoom_participants.status IS 'Participant status during webinar (uses participant_status enum)';

-- Reset failed participant sync statuses to allow retry after schema fix
UPDATE zoom_webinars 
SET participant_sync_status = 'pending',
    participant_sync_error = NULL,
    participant_sync_attempted_at = NULL
WHERE participant_sync_status = 'failed' 
   AND participant_sync_error LIKE '%participant_status%';
