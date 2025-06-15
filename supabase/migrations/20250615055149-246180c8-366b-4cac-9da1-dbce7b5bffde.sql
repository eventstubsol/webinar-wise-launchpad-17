
-- Create sync performance metrics table
CREATE TABLE public.sync_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_id UUID NOT NULL REFERENCES zoom_sync_logs(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT, -- 'seconds', 'count', 'bytes', 'percentage'
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create sync queue table
CREATE TABLE public.sync_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_id UUID NOT NULL REFERENCES zoom_sync_logs(id) ON DELETE CASCADE,
  webinar_id TEXT NOT NULL,
  webinar_title TEXT,
  queue_position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  estimated_duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  browser_notifications_enabled BOOLEAN DEFAULT false,
  toast_notifications_enabled BOOLEAN DEFAULT true,
  email_notifications_enabled BOOLEAN DEFAULT false,
  notification_types JSONB DEFAULT '["sync_complete", "sync_failed", "rate_limit_warning"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create rate limit tracking table
CREATE TABLE public.rate_limit_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES zoom_connections(id) ON DELETE CASCADE,
  api_calls_made INTEGER NOT NULL DEFAULT 0,
  api_calls_limit INTEGER NOT NULL DEFAULT 100,
  reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
  warning_threshold INTEGER DEFAULT 80, -- Warn when 80% of limit is reached
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sync_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sync performance metrics" 
  ON public.sync_performance_metrics 
  FOR SELECT 
  USING (
    sync_id IN (
      SELECT id FROM zoom_sync_logs 
      WHERE connection_id IN (
        SELECT id FROM zoom_connections WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their own sync queue" 
  ON public.sync_queue 
  FOR SELECT 
  USING (
    sync_id IN (
      SELECT id FROM zoom_sync_logs 
      WHERE connection_id IN (
        SELECT id FROM zoom_connections WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their own notification preferences" 
  ON public.notification_preferences 
  FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own rate limit tracking" 
  ON public.rate_limit_tracking 
  FOR SELECT 
  USING (user_id = auth.uid());

-- System policies for managing sync data
CREATE POLICY "System can manage sync performance metrics" 
  ON public.sync_performance_metrics 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can manage sync queue" 
  ON public.sync_queue 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can manage rate limit tracking" 
  ON public.rate_limit_tracking 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_sync_performance_metrics_sync_id ON sync_performance_metrics(sync_id);
CREATE INDEX idx_sync_performance_metrics_metric_name ON sync_performance_metrics(metric_name);
CREATE INDEX idx_sync_queue_sync_id ON sync_queue(sync_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_position ON sync_queue(queue_position);
CREATE INDEX idx_rate_limit_tracking_user_id ON rate_limit_tracking(user_id);
CREATE INDEX idx_rate_limit_tracking_connection_id ON rate_limit_tracking(connection_id);

-- Enable real-time replication
ALTER TABLE sync_performance_metrics REPLICA IDENTITY FULL;
ALTER TABLE sync_queue REPLICA IDENTITY FULL;
ALTER TABLE notification_preferences REPLICA IDENTITY FULL;
ALTER TABLE rate_limit_tracking REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE sync_performance_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE rate_limit_tracking;

-- Create triggers to update updated_at
CREATE TRIGGER update_sync_queue_updated_at
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limit_tracking_updated_at
  BEFORE UPDATE ON rate_limit_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
