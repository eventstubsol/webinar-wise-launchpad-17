
-- Phase 1: Database Status Update Function (Fixed parameter naming)
-- Create a function to calculate webinar status based on timing
CREATE OR REPLACE FUNCTION calculate_webinar_status(
  webinar_start_time TIMESTAMP WITH TIME ZONE,
  webinar_duration INTEGER,
  check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Phase 4: Database Migration - Update existing webinar records with correct statuses
-- Update all existing webinars with calculated status
UPDATE zoom_webinars 
SET 
  status = calculate_webinar_status(start_time, duration, NOW()),
  updated_at = NOW()
WHERE status = 'available' OR status != calculate_webinar_status(start_time, duration, NOW());

-- Add database indexes for efficient status-based queries
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_status_timing ON zoom_webinars(status, start_time, duration);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_calculated_status ON zoom_webinars(calculate_webinar_status(start_time, duration));

-- Add a view for easy access to webinars with calculated status
CREATE OR REPLACE VIEW zoom_webinars_with_calculated_status AS
SELECT 
  *,
  calculate_webinar_status(start_time, duration) as calculated_status
FROM zoom_webinars;

-- Create a trigger to automatically update webinar status when start_time or duration changes
CREATE OR REPLACE FUNCTION update_webinar_status_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on timing when start_time or duration changes
  IF TG_OP = 'UPDATE' AND (
    OLD.start_time IS DISTINCT FROM NEW.start_time OR 
    OLD.duration IS DISTINCT FROM NEW.duration
  ) THEN
    NEW.status = calculate_webinar_status(NEW.start_time, NEW.duration);
    NEW.updated_at = NOW();
  END IF;
  
  -- For new inserts, set the calculated status
  IF TG_OP = 'INSERT' THEN
    NEW.status = calculate_webinar_status(NEW.start_time, NEW.duration);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_webinar_status ON zoom_webinars;
CREATE TRIGGER trigger_update_webinar_status
  BEFORE INSERT OR UPDATE ON zoom_webinars
  FOR EACH ROW
  EXECUTE FUNCTION update_webinar_status_trigger();

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
