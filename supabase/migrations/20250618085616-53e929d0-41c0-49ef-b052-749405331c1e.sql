
-- Phase 1: Fix Database Constraint
-- Drop the problematic unique constraint that includes join_time
ALTER TABLE zoom_participants DROP CONSTRAINT IF EXISTS unique_participant_session;

-- Create the correct unique constraint that matches our upsert logic
ALTER TABLE zoom_participants ADD CONSTRAINT unique_webinar_participant 
UNIQUE (webinar_id, participant_id);

-- Phase 2: Reset Failed Sync States
-- Reset all failed participant syncs to pending so they can be retried
UPDATE zoom_webinars 
SET participant_sync_status = 'pending',
    participant_sync_error = NULL,
    participant_sync_attempted_at = NULL
WHERE participant_sync_status = 'failed';

-- Also reset any webinars that might have had constraint errors
UPDATE zoom_webinars 
SET participant_sync_status = 'pending',
    participant_sync_error = NULL,
    participant_sync_attempted_at = NULL
WHERE participant_sync_error LIKE '%unique or exclusion constraint%'
   OR participant_sync_error LIKE '%constraint matching the ON CONFLICT%';

-- Update webinar statuses to ensure finished webinars are properly marked
UPDATE zoom_webinars 
SET status = 'finished',
    participant_sync_status = 'pending'
WHERE start_time < NOW() - INTERVAL '1 hour'
  AND status IN ('available', 'scheduled')
  AND participant_sync_status IN ('not_applicable', 'failed');
