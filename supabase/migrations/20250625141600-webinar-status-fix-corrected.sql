
-- Phase 1: Database Foundation Repair (Corrected version)
-- Re-create the missing calculate_webinar_status() database function
CREATE OR REPLACE FUNCTION calculate_webinar_status(
  webinar_start_time TIMESTAMP WITH TIME ZONE,
  webinar_duration INTEGER,
  check_time TIMESTAMP WITH TIME ZONE
) RETURNS TEXT AS $$
DECLARE
  estimated_end_time TIMESTAMP WITH TIME ZONE;
  buffer_minutes INTEGER := 5; -- 5 minute buffer after end time
BEGIN
  -- Handle null inputs
  IF webinar_start_time IS NULL OR webinar_duration IS NULL THEN
    RETURN 'unknown';
  END IF;
  
  -- Calculate estimated end time (duration is in minutes)
  estimated_end_time := webinar_start_time + (webinar_duration || ' minutes')::INTERVAL;
  
  -- Determine status based on timing
  IF check_time < webinar_start_time THEN
    RETURN 'upcoming';
  ELSIF check_time >= webinar_start_time AND check_time <= (estimated_end_time + (buffer_minutes || ' minutes')::INTERVAL) THEN
    RETURN 'live';
  ELSE
    RETURN 'ended';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create overloaded version with NOW() default for convenience
CREATE OR REPLACE FUNCTION calculate_webinar_status(
  webinar_start_time TIMESTAMP WITH TIME ZONE,
  webinar_duration INTEGER
) RETURNS TEXT AS $$
BEGIN
  RETURN calculate_webinar_status(webinar_start_time, webinar_duration, NOW());
END;
$$ LANGUAGE plpgsql STABLE;

-- Re-create the view for easy access to webinars with calculated status
CREATE OR REPLACE VIEW zoom_webinars_with_calculated_status AS
SELECT 
  *,
  calculate_webinar_status(start_time, duration, NOW()) as calculated_status
FROM zoom_webinars;

-- Add database indexes for efficient status-based queries
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_status_timing ON zoom_webinars(status, start_time, duration);

-- Add a function to batch update webinar statuses (useful for maintenance)
CREATE OR REPLACE FUNCTION batch_update_webinar_statuses()
RETURNS TABLE(
  updated_count INTEGER,
  upcoming_count INTEGER,
  live_count INTEGER,
  ended_count INTEGER
) AS $$
DECLARE
  updated_rows INTEGER;
  upcoming_rows INTEGER;
  live_rows INTEGER;
  ended_rows INTEGER;
BEGIN
  -- Update all webinars with calculated status
  UPDATE zoom_webinars 
  SET 
    status = calculate_webinar_status(start_time, duration, NOW()),
    updated_at = NOW()
  WHERE status != calculate_webinar_status(start_time, duration, NOW());
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  -- Count webinars by status
  SELECT COUNT(*) INTO upcoming_rows FROM zoom_webinars WHERE status = 'upcoming';
  SELECT COUNT(*) INTO live_rows FROM zoom_webinars WHERE status = 'live';
  SELECT COUNT(*) INTO ended_rows FROM zoom_webinars WHERE status = 'ended';
  
  RETURN QUERY SELECT updated_rows, upcoming_rows, live_rows, ended_rows;
END;
$$ LANGUAGE plpgsql;
