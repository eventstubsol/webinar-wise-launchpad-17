
-- Add missing columns to zoom_sync_logs table
ALTER TABLE public.zoom_sync_logs 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'::text,
ADD COLUMN IF NOT EXISTS error_details jsonb DEFAULT '{}'::jsonb;

-- Add missing columns to zoom_webinars table
ALTER TABLE public.zoom_webinars 
ADD COLUMN IF NOT EXISTS webinar_id text,
ADD COLUMN IF NOT EXISTS participant_sync_status text DEFAULT 'not_applicable'::text,
ADD COLUMN IF NOT EXISTS participant_sync_attempted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS participant_sync_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS participant_sync_error text;

-- Update webinar_id to use zoom_webinar_id if webinar_id is null
UPDATE public.zoom_webinars 
SET webinar_id = zoom_webinar_id 
WHERE webinar_id IS NULL;

-- Create connection_health_log table that's referenced in ConnectionHealthCheck.tsx
CREATE TABLE IF NOT EXISTS public.connection_health_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  connection_type text NOT NULL,
  status text NOT NULL DEFAULT 'unknown'::text,
  ping_time_ms integer,
  error_message text,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for connection_health_log
ALTER TABLE public.connection_health_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their connection health logs" ON public.connection_health_log
  FOR ALL USING (auth.uid() = user_id);

-- Add index for connection_health_log
CREATE INDEX IF NOT EXISTS idx_connection_health_log_user_type ON public.connection_health_log(user_id, connection_type, recorded_at DESC);
