
-- Create rate_limit_tracking table
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES zoom_connections(id) ON DELETE CASCADE,
  api_calls_made integer NOT NULL DEFAULT 0,
  api_calls_limit integer NOT NULL DEFAULT 100,
  reset_time timestamp with time zone NOT NULL,
  warning_threshold integer DEFAULT 80,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create sync_progress table
CREATE TABLE IF NOT EXISTS public.sync_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_id uuid NOT NULL REFERENCES zoom_sync_logs(id) ON DELETE CASCADE,
  total_webinars integer NOT NULL DEFAULT 0,
  completed_webinars integer NOT NULL DEFAULT 0,
  current_webinar_name text,
  current_webinar_index integer DEFAULT 0,
  current_stage text,
  estimated_completion timestamp with time zone,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rate_limit_tracking
CREATE POLICY "Users can view their own rate limit tracking" ON public.rate_limit_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limit tracking" ON public.rate_limit_tracking
  FOR ALL USING (true) WITH CHECK (true);

-- Create RLS policies for sync_progress
CREATE POLICY "Users can view their own sync progress" ON public.sync_progress
  FOR SELECT USING (
    sync_id IN (
      SELECT id FROM zoom_sync_logs 
      WHERE connection_id IN (
        SELECT id FROM zoom_connections WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage sync progress" ON public.sync_progress
  FOR ALL USING (true) WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_id ON public.rate_limit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_connection_id ON public.rate_limit_tracking(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_progress_sync_id ON public.sync_progress(sync_id);

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at_rate_limit_tracking
  BEFORE UPDATE ON public.rate_limit_tracking
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sync_progress
  BEFORE UPDATE ON public.sync_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable real-time replication
ALTER TABLE public.rate_limit_tracking REPLICA IDENTITY FULL;
ALTER TABLE public.sync_progress REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.rate_limit_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_progress;
