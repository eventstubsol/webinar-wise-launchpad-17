-- Add missing columns to zoom_webinars table
ALTER TABLE public.zoom_webinars 
ADD COLUMN IF NOT EXISTS participant_sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS participant_sync_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS participant_sync_attempted_at TIMESTAMPTZ;

-- Add missing columns to zoom_connections table if they don't exist
ALTER TABLE public.zoom_connections 
ADD COLUMN IF NOT EXISTS zoom_role TEXT,
ADD COLUMN IF NOT EXISTS zoom_role_id TEXT;