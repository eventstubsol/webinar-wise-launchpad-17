
-- Add new columns to zoom_sync_logs table for tracking individual webinar sync progress
ALTER TABLE public.zoom_sync_logs 
ADD COLUMN current_webinar_id TEXT,
ADD COLUMN sync_stage TEXT,
ADD COLUMN stage_progress_percentage INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_zoom_sync_logs_webinar_id ON public.zoom_sync_logs(current_webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_sync_logs_sync_stage ON public.zoom_sync_logs(sync_stage);

-- Add comments for documentation
COMMENT ON COLUMN public.zoom_sync_logs.current_webinar_id IS 'Zoom webinar ID currently being processed';
COMMENT ON COLUMN public.zoom_sync_logs.sync_stage IS 'Current sync stage: webinar_details, registrants, participants, polls, qa, recordings';
COMMENT ON COLUMN public.zoom_sync_logs.stage_progress_percentage IS 'Progress percentage for the current sync stage (0-100)';
