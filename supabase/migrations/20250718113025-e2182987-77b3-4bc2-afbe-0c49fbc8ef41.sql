-- Add missing columns to zoom_webinars table for compatibility
ALTER TABLE public.zoom_webinars 
ADD COLUMN IF NOT EXISTS total_attendees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_registrants INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS type INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS creation_source TEXT,
ADD COLUMN IF NOT EXISTS transition_to_live BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS zoom_uuid TEXT;