-- Phase 3: Database Schema Improvements
-- This migration adds missing indexes, creates monitoring views, and adds proper constraints

-- 1. Add indexes for better query performance
-- Index for webinar queries by connection and status
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_status 
ON zoom_webinars(connection_id, status, start_time DESC);

-- Index for webinar queries by sync status
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_sync_status 
ON zoom_webinars(connection_id, participant_sync_status, last_synced_at DESC);

-- Index for webinar validation queries
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_validation 
ON zoom_webinars(connection_id, validation_status, last_validated_at DESC);

-- Index for host queries
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_host 
ON zoom_webinars(connection_id, host_id, start_time DESC);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_date_range 
ON zoom_webinars(connection_id, start_time) 
WHERE start_time IS NOT NULL;

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_dashboard 
ON zoom_webinars(connection_id, status, start_time DESC) 
INCLUDE (topic, total_registrants, total_attendees);

-- 2. Create materialized view for sync monitoring
CREATE MATERIALIZED VIEW IF NOT EXISTS sync_monitoring_dashboard AS
SELECT 
  s.id as sync_id,
  s.connection_id,
  c.zoom_email,
  s.status,
  s.sync_type,
  s.started_at,
  s.ended_at,
  s.webinars_synced,
  s.participants_synced,
  s.progress_percentage,
  s.current_phase,
  s.error_count,
  s.retry_count,
  s.last_error_message,
  s.last_error_at,
  EXTRACT(EPOCH FROM (COALESCE(s.ended_at, NOW()) - s.started_at))::INTEGER as duration_seconds,
  h.heartbeat_at as last_heartbeat,
  EXTRACT(EPOCH FROM (NOW() - h.heartbeat_at))::INTEGER as seconds_since_heartbeat,
  (SELECT COUNT(*) FROM sync_error_logs e WHERE e.sync_id = s.id AND NOT e.resolved) as unresolved_errors,
  (SELECT COUNT(*) FROM webinar_sync_queue q WHERE q.sync_id = s.id AND q.processing_status = 'completed') as webinars_processed,
  (SELECT COUNT(*) FROM webinar_sync_queue q WHERE q.sync_id = s.id AND q.processing_status = 'failed') as webinars_failed,
  (SELECT COUNT(*) FROM webinar_sync_queue q WHERE q.sync_id = s.id AND q.processing_status = 'pending') as webinars_pending
FROM zoom_sync_logs s
LEFT JOIN zoom_connections c ON s.connection_id = c.id
LEFT JOIN sync_heartbeats h ON s.id = h.sync_id
ORDER BY s.started_at DESC;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX idx_sync_monitoring_dashboard_sync_id 
ON sync_monitoring_dashboard(sync_id);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_sync_monitoring_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sync_monitoring_dashboard;
END;
$$ LANGUAGE plpgsql;

-- 3. Create view for webinar statistics by connection
CREATE OR REPLACE VIEW webinar_statistics_by_connection AS
SELECT 
  connection_id,
  COUNT(DISTINCT webinar_id) as total_webinars,
  COUNT(DISTINCT webinar_id) FILTER (WHERE status = 'finished') as past_webinars,
  COUNT(DISTINCT webinar_id) FILTER (WHERE status IN ('scheduled', 'pending')) as upcoming_webinars,
  COUNT(DISTINCT webinar_id) FILTER (WHERE validation_status = 'invalid') as invalid_webinars,
  COUNT(DISTINCT webinar_id) FILTER (WHERE validation_status = 'warning') as warning_webinars,
  SUM(total_registrants) as total_registrants_all,
  SUM(total_attendees) as total_attendees_all,
  AVG(total_attendees::FLOAT / NULLIF(total_registrants, 0) * 100) as avg_attendance_rate,
  MIN(start_time) as earliest_webinar,
  MAX(start_time) as latest_webinar,
  MAX(last_synced_at) as last_sync_time,
  COUNT(DISTINCT webinar_id) FILTER (WHERE last_synced_at < NOW() - INTERVAL '7 days') as stale_webinars
FROM zoom_webinars
WHERE webinar_id IS NOT NULL
GROUP BY connection_id;

-- 4. Create view for sync performance analytics
CREATE OR REPLACE VIEW sync_performance_analytics AS
WITH sync_durations AS (
  SELECT 
    connection_id,
    sync_type,
    EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER as duration_seconds,
    webinars_synced,
    participants_synced,
    error_count,
    CASE 
      WHEN webinars_synced > 0 THEN 
        EXTRACT(EPOCH FROM (ended_at - started_at))::FLOAT / webinars_synced 
      ELSE NULL 
    END as seconds_per_webinar
  FROM zoom_sync_logs
  WHERE status = 'completed' AND ended_at IS NOT NULL
)
SELECT 
  connection_id,
  sync_type,
  COUNT(*) as total_syncs,
  AVG(duration_seconds) as avg_duration_seconds,
  MIN(duration_seconds) as min_duration_seconds,
  MAX(duration_seconds) as max_duration_seconds,
  AVG(webinars_synced) as avg_webinars_per_sync,
  SUM(webinars_synced) as total_webinars_synced,
  AVG(seconds_per_webinar) as avg_seconds_per_webinar,
  AVG(error_count) as avg_errors_per_sync
FROM sync_durations
GROUP BY connection_id, sync_type;

-- 5. Add missing foreign key constraints
-- Ensure zoom_connections reference exists
ALTER TABLE zoom_webinars 
DROP CONSTRAINT IF EXISTS zoom_webinars_connection_id_fkey;

ALTER TABLE zoom_webinars 
ADD CONSTRAINT zoom_webinars_connection_id_fkey 
FOREIGN KEY (connection_id) 
REFERENCES zoom_connections(id) 
ON DELETE CASCADE;

-- 6. Add check constraints for data integrity
ALTER TABLE zoom_webinars 
ADD CONSTRAINT check_attendance_metrics 
CHECK (
  total_attendees >= 0 AND 
  total_registrants >= 0 AND 
  total_minutes >= 0 AND 
  avg_attendance_duration >= 0
);

ALTER TABLE zoom_webinars 
ADD CONSTRAINT check_duration 
CHECK (duration >= 0);

ALTER TABLE zoom_sync_logs 
ADD CONSTRAINT check_sync_counts 
CHECK (
  webinars_synced >= 0 AND 
  participants_synced >= 0 AND 
  error_count >= 0 AND 
  retry_count >= 0 AND 
  progress_percentage >= 0 AND 
  progress_percentage <= 100
);

-- 7. Create function to clean up old sync data
CREATE OR REPLACE FUNCTION cleanup_old_sync_data(days_to_keep INTEGER DEFAULT 30)
RETURNS TABLE(
  deleted_sync_logs INTEGER,
  deleted_error_logs INTEGER,
  deleted_progress_updates INTEGER,
  deleted_queue_items INTEGER
) AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  sync_log_count INTEGER;
  error_log_count INTEGER;
  progress_count INTEGER;
  queue_count INTEGER;
BEGIN
  cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  -- Delete old completed sync queue items
  DELETE FROM webinar_sync_queue 
  WHERE completed_at < cutoff_date 
    AND processing_status = 'completed';
  GET DIAGNOSTICS queue_count = ROW_COUNT;
  
  -- Delete old sync progress updates
  DELETE FROM sync_progress_updates 
  WHERE created_at < cutoff_date;
  GET DIAGNOSTICS progress_count = ROW_COUNT;
  
  -- Delete old resolved error logs
  DELETE FROM sync_error_logs 
  WHERE resolved_at < cutoff_date 
    AND resolved = true;
  GET DIAGNOSTICS error_log_count = ROW_COUNT;
  
  -- Delete old completed sync logs
  DELETE FROM zoom_sync_logs 
  WHERE ended_at < cutoff_date 
    AND status = 'completed'
    AND error_count = 0;
  GET DIAGNOSTICS sync_log_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    sync_log_count,
    error_log_count,
    progress_count,
    queue_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get sync health status
CREATE OR REPLACE FUNCTION get_sync_health_status(p_connection_id UUID)
RETURNS JSONB AS $$
DECLARE
  health_status JSONB;
  last_successful_sync TIMESTAMPTZ;
  failed_syncs_24h INTEGER;
  avg_sync_duration INTEGER;
  stale_webinar_count INTEGER;
BEGIN
  -- Get last successful sync
  SELECT MAX(ended_at) INTO last_successful_sync
  FROM zoom_sync_logs
  WHERE connection_id = p_connection_id
    AND status = 'completed'
    AND error_count = 0;
  
  -- Count failed syncs in last 24 hours
  SELECT COUNT(*) INTO failed_syncs_24h
  FROM zoom_sync_logs
  WHERE connection_id = p_connection_id
    AND status = 'failed'
    AND started_at > NOW() - INTERVAL '24 hours';
  
  -- Get average sync duration
  SELECT AVG(EXTRACT(EPOCH FROM (ended_at - started_at)))::INTEGER INTO avg_sync_duration
  FROM zoom_sync_logs
  WHERE connection_id = p_connection_id
    AND status = 'completed'
    AND ended_at IS NOT NULL
    AND started_at > NOW() - INTERVAL '7 days';
  
  -- Count stale webinars
  SELECT COUNT(*) INTO stale_webinar_count
  FROM zoom_webinars
  WHERE connection_id = p_connection_id
    AND last_synced_at < NOW() - INTERVAL '7 days';
  
  health_status := jsonb_build_object(
    'connection_id', p_connection_id,
    'last_successful_sync', last_successful_sync,
    'hours_since_last_sync', EXTRACT(EPOCH FROM (NOW() - last_successful_sync))::INTEGER / 3600,
    'failed_syncs_24h', failed_syncs_24h,
    'avg_sync_duration_seconds', avg_sync_duration,
    'stale_webinar_count', stale_webinar_count,
    'health_score', CASE
      WHEN last_successful_sync IS NULL THEN 0
      WHEN last_successful_sync < NOW() - INTERVAL '24 hours' THEN 50
      WHEN failed_syncs_24h > 3 THEN 60
      WHEN stale_webinar_count > 10 THEN 70
      ELSE 100
    END,
    'status', CASE
      WHEN last_successful_sync IS NULL THEN 'critical'
      WHEN last_successful_sync < NOW() - INTERVAL '24 hours' THEN 'warning'
      WHEN failed_syncs_24h > 3 THEN 'degraded'
      ELSE 'healthy'
    END
  );
  
  RETURN health_status;
END;
$$ LANGUAGE plpgsql;

-- 9. Create composite type for better organization
CREATE TYPE sync_summary AS (
  total_syncs INTEGER,
  successful_syncs INTEGER,
  failed_syncs INTEGER,
  in_progress_syncs INTEGER,
  total_webinars_synced INTEGER,
  total_participants_synced INTEGER,
  avg_sync_duration_minutes FLOAT
);

-- 10. Create function to get sync summary
CREATE OR REPLACE FUNCTION get_sync_summary(
  p_connection_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS sync_summary AS $$
DECLARE
  result sync_summary;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed' AND error_count = 0),
    COUNT(*) FILTER (WHERE status = 'failed' OR error_count > 0),
    COUNT(*) FILTER (WHERE status IN ('running', 'started')),
    COALESCE(SUM(webinars_synced), 0),
    COALESCE(SUM(participants_synced), 0),
    AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60) FILTER (WHERE ended_at IS NOT NULL)
  INTO result
  FROM zoom_sync_logs
  WHERE connection_id = p_connection_id
    AND started_at > NOW() - (p_days || ' days')::INTERVAL;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 11. Add comment to track this migration
COMMENT ON MATERIALIZED VIEW sync_monitoring_dashboard IS 'Phase 3 improvements - comprehensive sync monitoring';
COMMENT ON FUNCTION cleanup_old_sync_data IS 'Phase 3 improvements - automated cleanup for old sync data';
