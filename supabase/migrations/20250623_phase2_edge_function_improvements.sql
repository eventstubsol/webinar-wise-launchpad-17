-- Phase 2: Edge Function Improvements
-- This migration adds better progress tracking, retry logic, and validation

-- 1. Add more detailed tracking columns to zoom_sync_logs
ALTER TABLE zoom_sync_logs 
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_phase TEXT,
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_error_message TEXT;

-- 2. Create an index for better sync log performance
CREATE INDEX IF NOT EXISTS idx_zoom_sync_logs_connection_status 
ON zoom_sync_logs(connection_id, status, started_at DESC);

-- 3. Add validation status to zoom_webinars
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
ADD COLUMN IF NOT EXISTS validation_errors JSONB,
ADD COLUMN IF NOT EXISTS validation_warnings JSONB,
ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ;

-- 4. Create a sync error log table for detailed error tracking
CREATE TABLE IF NOT EXISTS sync_error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_id UUID REFERENCES zoom_sync_logs(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_details JSONB,
  webinar_id TEXT,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for error log queries
CREATE INDEX IF NOT EXISTS idx_sync_error_logs_sync_id 
ON sync_error_logs(sync_id, resolved, created_at DESC);

-- 5. Create a table for retry policies
CREATE TABLE IF NOT EXISTS sync_retry_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  max_retries INTEGER DEFAULT 3,
  initial_delay_ms INTEGER DEFAULT 1000,
  max_delay_ms INTEGER DEFAULT 60000,
  backoff_multiplier FLOAT DEFAULT 2.0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(error_type)
);

-- Insert default retry policies
INSERT INTO sync_retry_policies (error_type, max_retries, initial_delay_ms, max_delay_ms) VALUES
  ('rate_limit', 5, 60000, 300000),
  ('network_error', 3, 2000, 30000),
  ('auth_error', 2, 5000, 15000),
  ('server_error', 3, 5000, 60000),
  ('timeout', 2, 10000, 30000),
  ('default', 3, 1000, 60000)
ON CONFLICT (error_type) DO NOTHING;

-- 6. Create a table for sync performance metrics
CREATE TABLE IF NOT EXISTS sync_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_id UUID REFERENCES zoom_sync_logs(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  metric_unit TEXT,
  phase TEXT,
  details JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance queries
CREATE INDEX IF NOT EXISTS idx_sync_performance_metrics_sync_id 
ON sync_performance_metrics(sync_id, metric_type, recorded_at DESC);

-- 7. Add a heartbeat mechanism for long-running syncs
CREATE TABLE IF NOT EXISTS sync_heartbeats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_id UUID REFERENCES zoom_sync_logs(id) ON DELETE CASCADE,
  heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  message TEXT,
  progress_percentage INTEGER,
  details JSONB,
  UNIQUE(sync_id)
);

-- 8. Create a function to check for stale syncs
CREATE OR REPLACE FUNCTION check_stale_syncs()
RETURNS TABLE(
  sync_id UUID,
  connection_id UUID,
  started_at TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ,
  minutes_since_heartbeat INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as sync_id,
    s.connection_id,
    s.started_at,
    h.heartbeat_at as last_heartbeat,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(h.heartbeat_at, s.started_at)))::INTEGER / 60 as minutes_since_heartbeat
  FROM zoom_sync_logs s
  LEFT JOIN sync_heartbeats h ON s.id = h.sync_id
  WHERE s.status IN ('running', 'started')
    AND (
      h.heartbeat_at IS NULL AND s.started_at < NOW() - INTERVAL '10 minutes'
      OR h.heartbeat_at < NOW() - INTERVAL '10 minutes'
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Create a function to calculate exponential backoff
CREATE OR REPLACE FUNCTION calculate_backoff_delay(
  retry_count INTEGER,
  initial_delay_ms INTEGER DEFAULT 1000,
  max_delay_ms INTEGER DEFAULT 60000,
  multiplier FLOAT DEFAULT 2.0
) RETURNS INTEGER AS $$
DECLARE
  delay INTEGER;
BEGIN
  -- Calculate exponential backoff with jitter
  delay := LEAST(
    initial_delay_ms * POWER(multiplier, retry_count),
    max_delay_ms
  );
  
  -- Add random jitter (±25%)
  delay := delay + (delay * 0.25 * (RANDOM() * 2 - 1))::INTEGER;
  
  RETURN GREATEST(delay, initial_delay_ms);
END;
$$ LANGUAGE plpgsql;

-- 10. Create validation function for webinar data
CREATE OR REPLACE FUNCTION validate_webinar_data(webinar_record zoom_webinars)
RETURNS JSONB AS $$
DECLARE
  errors JSONB := '[]'::jsonb;
  warnings JSONB := '[]'::jsonb;
  validation_result JSONB;
BEGIN
  -- Check required fields
  IF webinar_record.webinar_id IS NULL THEN
    errors := errors || '{"field": "webinar_id", "message": "Webinar ID is required"}'::jsonb;
  END IF;
  
  IF webinar_record.topic IS NULL OR LENGTH(webinar_record.topic) = 0 THEN
    errors := errors || '{"field": "topic", "message": "Topic is required"}'::jsonb;
  END IF;
  
  IF webinar_record.host_id IS NULL THEN
    errors := errors || '{"field": "host_id", "message": "Host ID is required"}'::jsonb;
  END IF;
  
  -- Check data consistency
  IF webinar_record.start_time IS NOT NULL AND webinar_record.duration IS NOT NULL THEN
    IF webinar_record.duration < 0 THEN
      errors := errors || '{"field": "duration", "message": "Duration cannot be negative"}'::jsonb;
    END IF;
    
    IF webinar_record.duration > 1440 THEN -- 24 hours
      warnings := warnings || '{"field": "duration", "message": "Duration exceeds 24 hours"}'::jsonb;
    END IF;
  END IF;
  
  -- Check attendance metrics
  IF webinar_record.total_attendees > webinar_record.total_registrants THEN
    warnings := warnings || '{"field": "attendees", "message": "Attendees count exceeds registrants"}'::jsonb;
  END IF;
  
  -- Check date consistency
  IF webinar_record.start_time IS NOT NULL AND webinar_record.created_at IS NOT NULL THEN
    IF webinar_record.start_time < webinar_record.created_at THEN
      warnings := warnings || '{"field": "dates", "message": "Start time is before creation time"}'::jsonb;
    END IF;
  END IF;
  
  validation_result := jsonb_build_object(
    'status', CASE 
      WHEN jsonb_array_length(errors) > 0 THEN 'invalid'
      WHEN jsonb_array_length(warnings) > 0 THEN 'warning'
      ELSE 'valid'
    END,
    'errors', errors,
    'warnings', warnings,
    'validated_at', NOW()
  );
  
  RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

-- 11. Add RLS policies for new tables
ALTER TABLE sync_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_retry_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_heartbeats ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role can manage error logs" ON sync_error_logs
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage retry policies" ON sync_retry_policies
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage performance metrics" ON sync_performance_metrics
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage heartbeats" ON sync_heartbeats
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Authenticated user read policies
CREATE POLICY "Authenticated users can read error logs" ON sync_error_logs
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read retry policies" ON sync_retry_policies
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read performance metrics" ON sync_performance_metrics
FOR SELECT USING (auth.role() = 'authenticated');

-- 12. Create a trigger to validate webinar data on insert/update
CREATE OR REPLACE FUNCTION trigger_validate_webinar()
RETURNS TRIGGER AS $$
DECLARE
  validation_result JSONB;
BEGIN
  validation_result := validate_webinar_data(NEW);
  
  NEW.validation_status := validation_result->>'status';
  NEW.validation_errors := validation_result->'errors';
  NEW.validation_warnings := validation_result->'warnings';
  NEW.last_validated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_webinar_data_trigger
BEFORE INSERT OR UPDATE ON zoom_webinars
FOR EACH ROW
EXECUTE FUNCTION trigger_validate_webinar();

-- Add comment to track this migration
COMMENT ON TABLE sync_error_logs IS 'Phase 2 improvements - enhanced error tracking and retry logic';
