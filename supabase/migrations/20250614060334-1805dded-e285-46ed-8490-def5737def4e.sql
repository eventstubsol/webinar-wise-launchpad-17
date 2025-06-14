
-- Create analytics cache table for storing computed insights
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL,
    cache_data JSONB NOT NULL,
    cache_version INTEGER DEFAULT 1,
    dependencies TEXT[] DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(cache_key)
);

-- Create processing queue table for background tasks
CREATE TABLE processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type TEXT NOT NULL,
    task_data JSONB NOT NULL,
    priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    webinar_id UUID REFERENCES zoom_webinars(id),
    user_id UUID,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create realtime events table for WebSocket broadcasting
CREATE TABLE realtime_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    target_users UUID[],
    channel_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed BOOLEAN DEFAULT false
);

-- Add indexes for performance
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX idx_processing_queue_status_priority ON processing_queue(status, priority);
CREATE INDEX idx_processing_queue_webinar ON processing_queue(webinar_id);
CREATE INDEX idx_processing_queue_scheduled ON processing_queue(scheduled_at);
CREATE INDEX idx_realtime_events_processed ON realtime_events(processed);
CREATE INDEX idx_realtime_events_channel ON realtime_events(channel_name);

-- Enable realtime for the new tables
ALTER TABLE analytics_cache REPLICA IDENTITY FULL;
ALTER TABLE processing_queue REPLICA IDENTITY FULL;
ALTER TABLE realtime_events REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE analytics_cache;
ALTER PUBLICATION supabase_realtime ADD TABLE processing_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE realtime_events;

-- Create function to invalidate cache based on dependencies
CREATE OR REPLACE FUNCTION invalidate_cache_dependencies(dep_pattern TEXT)
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    DELETE FROM analytics_cache 
    WHERE dep_pattern = ANY(dependencies) OR expires_at < now();
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to enqueue processing tasks
CREATE OR REPLACE FUNCTION enqueue_task(
    p_task_type TEXT,
    p_task_data JSONB,
    p_priority INTEGER DEFAULT 5,
    p_webinar_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    task_id UUID;
BEGIN
    INSERT INTO processing_queue (task_type, task_data, priority, webinar_id, user_id)
    VALUES (p_task_type, p_task_data, p_priority, p_webinar_id, p_user_id)
    RETURNING id INTO task_id;
    
    RETURN task_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to broadcast realtime events
CREATE OR REPLACE FUNCTION broadcast_event(
    p_event_type TEXT,
    p_event_data JSONB,
    p_target_users UUID[] DEFAULT NULL,
    p_channel_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO realtime_events (event_type, event_data, target_users, channel_name)
    VALUES (p_event_type, p_event_data, p_target_users, p_channel_name)
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update timestamps
CREATE TRIGGER update_analytics_cache_updated_at
    BEFORE UPDATE ON analytics_cache
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_processing_queue_updated_at
    BEFORE UPDATE ON processing_queue
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
