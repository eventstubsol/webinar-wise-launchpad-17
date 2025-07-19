-- Add unique constraint for zoom webinars to enable proper upsert
-- This prevents duplicate webinars from the same connection
ALTER TABLE public.zoom_webinars 
ADD CONSTRAINT zoom_webinars_connection_webinar_unique 
UNIQUE (connection_id, zoom_webinar_id);

-- Add unique constraint for registrants 
ALTER TABLE public.zoom_registrants 
ADD CONSTRAINT zoom_registrants_webinar_registrant_unique 
UNIQUE (webinar_id, registrant_id);

-- Add unique constraint for participants using participant_uuid
-- Since there's no participant_id column
ALTER TABLE public.zoom_participants 
ADD CONSTRAINT zoom_participants_webinar_uuid_unique 
UNIQUE (webinar_id, participant_uuid);