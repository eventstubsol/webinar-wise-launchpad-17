
-- Fix CASCADE DELETE issue on zoom_registrants and zoom_participants tables
-- This prevents data loss when webinars are updated during sync

-- First, drop the existing foreign key constraints that have CASCADE DELETE
ALTER TABLE zoom_registrants 
DROP CONSTRAINT IF EXISTS zoom_registrants_webinar_id_fkey;

ALTER TABLE zoom_participants 
DROP CONSTRAINT IF EXISTS zoom_participants_webinar_id_fkey;

-- Re-create the foreign key constraints with NO ACTION instead of CASCADE DELETE
-- This will prevent accidental deletion of registrants/participants when webinars are updated

ALTER TABLE zoom_registrants 
ADD CONSTRAINT zoom_registrants_webinar_id_fkey 
FOREIGN KEY (webinar_id) REFERENCES zoom_webinars(id) 
ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE zoom_participants 
ADD CONSTRAINT zoom_participants_webinar_id_fkey 
FOREIGN KEY (webinar_id) REFERENCES zoom_webinars(id) 
ON DELETE NO ACTION ON UPDATE CASCADE;

-- Verify that the proper indexes exist for performance
-- (These should already exist, but adding them if missing)

-- Index for zoom_registrants (webinar_id, registrant_id)
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_webinar_registrant 
ON zoom_registrants(webinar_id, registrant_id);

-- Index for zoom_participants (webinar_id, participant_id) 
CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_participant 
ON zoom_participants(webinar_id, participant_id);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_webinar_id 
ON zoom_registrants(webinar_id);

CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_id 
ON zoom_participants(webinar_id);
