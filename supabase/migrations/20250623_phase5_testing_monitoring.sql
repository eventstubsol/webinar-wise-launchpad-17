-- Phase 5: Testing and Monitoring
-- This migration creates test utilities and monitoring dashboard

-- 1. Create test utilities table for storing test results
CREATE TABLE IF NOT EXISTS sync_test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  test_type TEXT CHECK (test_type IN ('unit', 'integration', 'e2e', 'performance')) NOT NULL,
  connection_id UUID REFERENCES zoom_connections(id) ON DELETE SET NULL,
  sync_id UUID REFERENCES zoom_sync_logs(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('passed', 'failed', 'skipped', 'error')) NOT NULL,
  duration_ms INTEGER,
  error_message TEXT,
  error_details JSONB,
  test_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for test queries
CREATE INDEX idx_sync_test_results_connection 
ON sync_test_results(connection_id, test_type, created_at DESC);

-- 2. Create function to run sync health checks
CREATE OR REPLACE FUNCTION run_sync_health_checks(p_connection_id UUID)
RETURNS TABLE(
  check_name TEXT,
  check_status TEXT,
  check_message TEXT,
  check_details JSONB
) AS $$
BEGIN
  -- Check 1: Connection validity
  RETURN QUERY
  SELECT 
    'connection_validity'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM zoom_connections 
        WHERE id = p_connection_id 
        AND is_active = true
        AND token_expires_at > NOW()
      ) THEN 'passed'::TEXT
      ELSE 'failed'::TEXT
    END,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM zoom_connections 
        WHERE id = p_connection_id 
        AND is_active = true
        AND token_expires_at > NOW()
      ) THEN 'Connection is valid and active'::TEXT
      ELSE 'Connection is invalid or expired'::TEXT
    END,
    jsonb_build_object(
      'connection_exists', EXISTS (SELECT 1 FROM zoom_connections WHERE id = p_connection_id),
      'is_active', (SELECT is_active FROM zoom_connections WHERE id = p_connection_id),
      'token_expires_at', (SELECT token_expires_at FROM zoom_connections WHERE id = p_connection_id)
    );

  -- Check 2: Recent sync success
  RETURN QUERY
  SELECT 
    'recent_sync_success'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM zoom_sync_logs 
        WHERE connection_id = p_connection_id 
        AND status = 'completed'
        AND ended_at > NOW() - INTERVAL '24 hours'
      ) THEN 'passed'::TEXT
      ELSE 'warning'::TEXT
    END,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM zoom_sync_logs 
        WHERE connection_id = p_connection_id 
        AND status = 'completed'
        AND ended_at > NOW() - INTERVAL '24 hours'
      ) THEN 'Recent sync completed successfully'::TEXT
      ELSE 'No successful sync in the last 24 hours'::TEXT
    END,
    (
      SELECT jsonb_build_object(
        'last_sync_time', MAX(ended_at),
        'hours_since_sync', EXTRACT(EPOCH FROM (NOW() - MAX(ended_at))) / 3600
      )
      FROM zoom_sync_logs 
      WHERE connection_id = p_connection_id 
      AND status = 'completed'
    );

  -- Check 3: Data integrity
  RETURN QUERY
  SELECT 
    'data_integrity'::TEXT,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM zoom_webinars 
        WHERE connection_id = p_connection_id 
        AND validation_status = 'invalid'
      ) THEN 'passed'::TEXT
      ELSE 'warning'::TEXT
    END,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM zoom_webinars 
        WHERE connection_id = p_connection_id 
        AND validation_status = 'invalid'
      ) THEN 'All webinars have valid data'::TEXT
      ELSE 'Some webinars have validation issues'::TEXT
    END,
    (
      SELECT jsonb_build_object(
        'total_webinars', COUNT(*),
        'invalid_webinars', COUNT(*) FILTER (WHERE validation_status = 'invalid'),
        'warning_webinars', COUNT(*) FILTER (WHERE validation_status = 'warning')
      )
      FROM zoom_webinars 
      WHERE connection_id = p_connection_id
    );

  -- Check 4: Sync performance
  RETURN QUERY
  SELECT 
    'sync_performance'::TEXT,
    CASE 
      WHEN (
        SELECT AVG(EXTRACT(EPOCH FROM (ended_at - started_at)))
        FROM zoom_sync_logs 
        WHERE connection_id = p_connection_id 
        AND status = 'completed'
        AND ended_at > NOW() - INTERVAL '7 days'
      ) < 300 THEN 'passed'::TEXT
      ELSE 'warning'::TEXT
    END,
    CASE 
      WHEN (
        SELECT AVG(EXTRACT(EPOCH FROM (ended_at - started_at)))
        FROM zoom_sync_logs 
        WHERE connection_id = p_connection_id 
        AND status = 'completed'
        AND ended_at > NOW() - INTERVAL '7 days'
      ) < 300 THEN 'Average sync time is under 5 minutes'::TEXT
      ELSE 'Average sync time exceeds 5 minutes'::TEXT
    END,
    (
      SELECT jsonb_build_object(
        'avg_duration_seconds', AVG(EXTRACT(EPOCH FROM (ended_at - started_at)))::INTEGER,
        'min_duration_seconds', MIN(EXTRACT(EPOCH FROM (ended_at - started_at)))::INTEGER,
        'max_duration_seconds', MAX(EXTRACT(EPOCH FROM (ended_at - started_at)))::INTEGER,
        'sync_count', COUNT(*)
      )
      FROM zoom_sync_logs 
      WHERE connection_id = p_connection_id 
      AND status = 'completed'
      AND ended_at > NOW() - INTERVAL '7 days'
    );

END;
$$ LANGUAGE plpgsql;

-- 3. Create monitoring dashboard view
CREATE OR REPLACE VIEW sync_monitoring_metrics AS
WITH hourly_metrics AS (
  SELECT 
    date_trunc('hour', started_at) as hour,
    COUNT(*) as sync_count,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_syncs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs,
    AVG(webinars_synced) as avg_webinars_synced,
    AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_duration_seconds
  FROM zoom_sync_logs
  WHERE started_at > NOW() - INTERVAL '24 hours'
  GROUP BY date_trunc('hour', started_at)
)
SELECT 
  hour,
  sync_count,
  successful_syncs,
  failed_syncs,
  ROUND(successful_syncs::NUMERIC / NULLIF(sync_count, 0) * 100, 2) as success_rate,
  avg_webinars_synced,
  avg_duration_seconds
FROM hourly_metrics
ORDER BY hour DESC;

-- 4. Create alert conditions view
CREATE OR REPLACE VIEW sync_alert_conditions AS
SELECT 
  c.id as connection_id,
  c.zoom_email,
  -- High failure rate alert
  CASE 
    WHEN (
      SELECT COUNT(*) FILTER (WHERE status = 'failed')::FLOAT / NULLIF(COUNT(*), 0)
      FROM zoom_sync_logs 
      WHERE connection_id = c.id 
      AND started_at > NOW() - INTERVAL '24 hours'
    ) > 0.5 THEN true
    ELSE false
  END as high_failure_rate,
  
  -- Stale data alert
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM zoom_sync_logs 
      WHERE connection_id = c.id 
      AND status = 'completed'
      AND ended_at > NOW() - INTERVAL '48 hours'
    ) THEN true
    ELSE false
  END as stale_data,
  
  -- Long running sync alert
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM zoom_sync_logs 
      WHERE connection_id = c.id 
      AND status IN ('running', 'started')
      AND started_at < NOW() - INTERVAL '1 hour'
    ) THEN true
    ELSE false
  END as long_running_sync,
  
  -- High error count alert
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM zoom_webinars 
      WHERE connection_id = c.id 
      AND validation_status = 'invalid'
      GROUP BY connection_id
      HAVING COUNT(*) > 10
    ) THEN true
    ELSE false
  END as high_error_count

FROM zoom_connections c
WHERE c.is_active = true;

-- 5. Create function to generate sync report
CREATE OR REPLACE FUNCTION generate_sync_report(
  p_connection_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSONB AS $$
DECLARE
  report JSONB;
BEGIN
  report := jsonb_build_object(
    'connection_id', p_connection_id,
    'report_period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'summary', (
      SELECT jsonb_build_object(
        'total_syncs', COUNT(*),
        'successful_syncs', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_syncs', COUNT(*) FILTER (WHERE status = 'failed'),
        'success_rate', ROUND(
          COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
          NULLIF(COUNT(*), 0) * 100, 2
        ),
        'total_webinars_synced', SUM(webinars_synced),
        'total_participants_synced', SUM(participants_synced),
        'total_api_calls', SUM(api_calls_made),
        'total_rate_limit_hits', SUM(rate_limit_hits)
      )
      FROM zoom_sync_logs
      WHERE connection_id = p_connection_id
      AND started_at BETWEEN p_start_date AND p_end_date
    ),
    'performance_metrics', (
      SELECT jsonb_build_object(
        'avg_sync_duration_seconds', AVG(EXTRACT(EPOCH FROM (ended_at - started_at)))::INTEGER,
        'min_sync_duration_seconds', MIN(EXTRACT(EPOCH FROM (ended_at - started_at)))::INTEGER,
        'max_sync_duration_seconds', MAX(EXTRACT(EPOCH FROM (ended_at - started_at)))::INTEGER,
        'avg_webinars_per_sync', AVG(webinars_synced),
        'avg_webinars_per_minute', AVG(
          webinars_synced::FLOAT / NULLIF(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60, 0)
        )
      )
      FROM zoom_sync_logs
      WHERE connection_id = p_connection_id
      AND status = 'completed'
      AND started_at BETWEEN p_start_date AND p_end_date
      AND ended_at IS NOT NULL
    ),
    'error_analysis', (
      SELECT jsonb_build_object(
        'total_errors', COUNT(*),
        'unique_error_types', COUNT(DISTINCT error_type),
        'top_errors', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'error_type', error_type,
              'count', error_count,
              'last_occurred', last_occurred
            )
          )
          FROM (
            SELECT 
              error_type,
              COUNT(*) as error_count,
              MAX(created_at) as last_occurred
            FROM sync_error_logs
            WHERE sync_id IN (
              SELECT id FROM zoom_sync_logs 
              WHERE connection_id = p_connection_id
              AND started_at BETWEEN p_start_date AND p_end_date
            )
            GROUP BY error_type
            ORDER BY error_count DESC
            LIMIT 5
          ) top_errors
        )
      )
      FROM sync_error_logs
      WHERE sync_id IN (
        SELECT id FROM zoom_sync_logs 
        WHERE connection_id = p_connection_id
        AND started_at BETWEEN p_start_date AND p_end_date
      )
    ),
    'webinar_statistics', (
      SELECT jsonb_build_object(
        'total_webinars', COUNT(DISTINCT webinar_id),
        'webinars_synced_in_period', COUNT(DISTINCT webinar_id) FILTER (
          WHERE last_synced_at BETWEEN p_start_date AND p_end_date
        ),
        'invalid_webinars', COUNT(*) FILTER (WHERE validation_status = 'invalid'),
        'warning_webinars', COUNT(*) FILTER (WHERE validation_status = 'warning'),
        'avg_attendance_rate', AVG(
          total_attendees::FLOAT / NULLIF(total_registrants, 0) * 100
        )
      )
      FROM zoom_webinars
      WHERE connection_id = p_connection_id
    ),
    'health_checks', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'check_name', check_name,
          'status', check_status,
          'message', check_message
        )
      )
      FROM run_sync_health_checks(p_connection_id)
    )
  );
  
  RETURN report;
END;
$$ LANGUAGE plpgsql;

-- 6. Add RLS policies for test results
ALTER TABLE sync_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage test results" ON sync_test_results
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Authenticated users can read test results" ON sync_test_results
FOR SELECT USING (auth.role() = 'authenticated');

-- 7. Create scheduled cleanup function
CREATE OR REPLACE FUNCTION scheduled_cleanup()
RETURNS void AS $$
BEGIN
  -- Clean up old data (older than 30 days)
  PERFORM cleanup_old_sync_data(30);
  
  -- Refresh materialized views if they exist
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'sync_monitoring_dashboard') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY sync_monitoring_dashboard;
  END IF;
  
  -- Mark stale syncs as failed
  UPDATE zoom_sync_logs
  SET 
    status = 'failed',
    ended_at = NOW(),
    last_error_message = 'Sync timed out after 1 hour of inactivity'
  WHERE status IN ('running', 'started')
    AND started_at < NOW() - INTERVAL '1 hour'
    AND NOT EXISTS (
      SELECT 1 FROM sync_heartbeats h
      WHERE h.sync_id = zoom_sync_logs.id
      AND h.heartbeat_at > NOW() - INTERVAL '10 minutes'
    );
  
  -- Log cleanup results
  INSERT INTO sync_test_results (
    test_name,
    test_type,
    status,
    test_data
  ) VALUES (
    'scheduled_cleanup',
    'integration',
    'passed',
    jsonb_build_object(
      'cleanup_time', NOW(),
      'next_run', NOW() + INTERVAL '1 day'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Add comment to track this migration
COMMENT ON FUNCTION run_sync_health_checks IS 'Phase 5 - comprehensive health monitoring';
COMMENT ON FUNCTION generate_sync_report IS 'Phase 5 - detailed sync reporting';
