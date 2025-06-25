
-- Add missing unique constraints required for upsert operations
-- These constraints are essential for the backend's onConflict operations

-- Fix zoom_webinars table - add unique constraint for connection_id + webinar_id
ALTER TABLE zoom_webinars 
ADD CONSTRAINT unique_connection_webinar UNIQUE (connection_id, webinar_id);

-- Fix zoom_participants table - add unique constraint for webinar_id + participant_id  
ALTER TABLE zoom_participants 
ADD CONSTRAINT unique_webinar_participant_id UNIQUE (webinar_id, participant_id);

-- Fix zoom_registrants table - add unique constraint for webinar_id + registrant_id
ALTER TABLE zoom_registrants 
ADD CONSTRAINT unique_webinar_registrant_id UNIQUE (webinar_id, registrant_id);

-- Create indexes for better performance on these constraints
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_webinar ON zoom_webinars(connection_id, webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_participant ON zoom_participants(webinar_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_zoom_registrants_webinar_registrant ON zoom_registrants(webinar_id, registrant_id);
