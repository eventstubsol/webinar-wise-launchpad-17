
-- Create analytics cache table for storing computed insights
CREATE TABLE IF NOT EXISTS public.analytics_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key text NOT NULL,
    cache_data jsonb NOT NULL,
    cache_version integer DEFAULT 1,
    dependencies text[] DEFAULT '{}',
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(cache_key)
);

-- Create processing queue table for background tasks
CREATE TABLE IF NOT EXISTS public.processing_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type text NOT NULL,
    task_data jsonb NOT NULL,
    priority integer DEFAULT 5, -- 1=highest, 10=lowest
    status text DEFAULT 'pending', -- pending, processing, completed, failed
    webinar_id uuid REFERENCES zoom_webinars(id),
    user_id uuid,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    scheduled_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create sync performance metrics table
CREATE TABLE IF NOT EXISTS public.sync_performance_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id uuid NOT NULL REFERENCES zoom_sync_logs(id) ON DELETE CASCADE,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit text,
    recorded_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Create sync queue table
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id uuid NOT NULL REFERENCES zoom_sync_logs(id) ON DELETE CASCADE,
    webinar_id uuid REFERENCES zoom_webinars(id),
    webinar_title text,
    queue_position integer NOT NULL,
    status text DEFAULT 'pending', -- pending, processing, completed, failed
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_message text,
    estimated_duration_seconds integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON public.analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON public.analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_processing_queue_status_priority ON public.processing_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_processing_queue_webinar ON public.processing_queue(webinar_id);
CREATE INDEX IF NOT EXISTS idx_processing_queue_scheduled ON public.processing_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sync_performance_metrics_sync_id ON public.sync_performance_metrics(sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_sync_id ON public.sync_queue(sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(status);

-- Enable realtime for the new tables
ALTER TABLE public.analytics_cache REPLICA IDENTITY FULL;
ALTER TABLE public.processing_queue REPLICA IDENTITY FULL;
ALTER TABLE public.sync_performance_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.sync_queue REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_cache;
ALTER PUBLICATION supabase_realtime ADD TABLE public.processing_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_performance_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_queue;

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at_analytics_cache
  BEFORE UPDATE ON public.analytics_cache
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_processing_queue
  BEFORE UPDATE ON public.processing_queue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sync_queue
  BEFORE UPDATE ON public.sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on new tables
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own analytics cache" ON public.analytics_cache
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their own processing tasks" ON public.processing_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage processing queue" ON public.processing_queue
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view sync performance metrics" ON public.sync_performance_metrics
  FOR SELECT USING (
    sync_id IN (
      SELECT id FROM zoom_sync_logs 
      WHERE connection_id IN (
        SELECT id FROM zoom_connections WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage sync performance metrics" ON public.sync_performance_metrics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their sync queue" ON public.sync_queue
  FOR SELECT USING (
    sync_id IN (
      SELECT id FROM zoom_sync_logs 
      WHERE connection_id IN (
        SELECT id FROM zoom_connections WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage sync queue" ON public.sync_queue
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to invalidate cache based on dependencies
CREATE OR REPLACE FUNCTION public.invalidate_cache_dependencies(dep_pattern text)
RETURNS integer AS $$
DECLARE
    affected_count integer;
BEGIN
    DELETE FROM public.analytics_cache 
    WHERE dep_pattern = ANY(dependencies) OR expires_at < now();
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to enqueue processing tasks
CREATE OR REPLACE FUNCTION public.enqueue_task(
    p_task_type text,
    p_task_data jsonb,
    p_priority integer DEFAULT 5,
    p_webinar_id uuid DEFAULT NULL,
    p_user_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    task_id uuid;
BEGIN
    INSERT INTO public.processing_queue (task_type, task_data, priority, webinar_id, user_id)
    VALUES (p_task_type, p_task_data, p_priority, p_webinar_id, p_user_id)
    RETURNING id INTO task_id;
    
    RETURN task_id;
END;
$$ LANGUAGE plpgsql;
