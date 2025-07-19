-- Add unique constraint for zoom webinars to enable proper upsert
-- This prevents duplicate webinars from the same connection
ALTER TABLE public.zoom_webinars 
ADD CONSTRAINT zoom_webinars_connection_webinar_unique 
UNIQUE (connection_id, zoom_webinar_id);

-- Also add unique constraints for the other tables that use ON CONFLICT
ALTER TABLE public.zoom_participants 
ADD CONSTRAINT zoom_participants_webinar_participant_unique 
UNIQUE (webinar_id, participant_id);

ALTER TABLE public.zoom_registrants 
ADD CONSTRAINT zoom_registrants_webinar_registrant_unique 
UNIQUE (webinar_id, registrant_id);