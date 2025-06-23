-- Fix Zoom Webinar Data Quality Issues
-- This migration ensures all columns are properly set up and fixes data quality issues

-- 1. Ensure all columns exist with correct types
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS total_minutes INTEGER DEFAULT 0;

-- 2. Add missing columns for proper data mapping
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS transition_to_live BOOLEAN DEFAULT false;

ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS creation_source TEXT;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_status 
ON zoom_webinars(status, connection_id);

CREATE INDEX IF NOT EXISTS idx_zoom_webinars_start_time 
ON zoom_webinars(start_time, connection_id);

CREATE INDEX IF NOT EXISTS idx_zoom_webinars_type 
ON zoom_webinars(type, connection_id);

-- 4. Fix existing data - Update status for past webinars that are incorrectly marked as scheduled
UPDATE zoom_webinars 
SET 
  status = 'finished',
  updated_at = NOW(),
  updated_at_db = NOW()
WHERE 
  status = 'scheduled' 
  AND start_time < NOW()
  AND start_time IS NOT NULL;

-- 5. Add validation constraints
ALTER TABLE zoom_webinars 
DROP CONSTRAINT IF EXISTS valid_webinar_status;

ALTER TABLE zoom_webinars 
ADD CONSTRAINT valid_webinar_status 
CHECK (status IN ('scheduled', 'started', 'finished', 'waiting', 'synced'));

-- 6. Create a function to automatically fix webinar status based on time
CREATE OR REPLACE FUNCTION fix_webinar_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If start_time is in the past and status is scheduled, change to finished
  IF NEW.start_time IS NOT NULL AND NEW.start_time < NOW() AND NEW.status = 'scheduled' THEN
    NEW.status = 'finished';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically fix status
DROP TRIGGER IF EXISTS fix_webinar_status_trigger ON zoom_webinars;
CREATE TRIGGER fix_webinar_status_trigger
BEFORE INSERT OR UPDATE ON zoom_webinars
FOR EACH ROW
EXECUTE FUNCTION fix_webinar_status();

-- 7. Create a view for better webinar status visibility
CREATE OR REPLACE VIEW webinar_status_overview AS
SELECT 
  connection_id,
  status,
  COUNT(*) as count,
  MIN(start_time) as earliest_start,
  MAX(start_time) as latest_start,
  SUM(total_registrants) as total_registrants,
  SUM(total_attendees) as total_attendees
FROM zoom_webinars
GROUP BY connection_id, status
ORDER BY connection_id, status;

-- 8. Add comments for documentation
COMMENT ON TABLE zoom_webinars IS 'Stores Zoom webinar data with enhanced status tracking and data quality fixes';
COMMENT ON COLUMN zoom_webinars.status IS 'Webinar status: scheduled, started, finished, waiting, or synced';
COMMENT ON COLUMN zoom_webinars.total_registrants IS 'Total number of registrants for the webinar';
COMMENT ON COLUMN zoom_webinars.total_attendees IS 'Total number of attendees who actually joined the webinar';
COMMENT ON COLUMN zoom_webinars.avg_attendance_duration IS 'Average attendance duration in seconds';

-- 9. Create a function to get webinar metrics
CREATE OR REPLACE FUNCTION get_webinar_metrics(p_connection_id UUID)
RETURNS TABLE(
  total_webinars BIGINT,
  scheduled_webinars BIGINT,
  finished_webinars BIGINT,
  total_registrants BIGINT,
  total_attendees BIGINT,
  avg_attendance_rate NUMERIC,
  webinars_with_missing_data BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_webinars,
    COUNT(*) FILTER (WHERE status = 'scheduled')::BIGINT as scheduled_webinars,
    COUNT(*) FILTER (WHERE status = 'finished')::BIGINT as finished_webinars,
    COALESCE(SUM(total_registrants), 0)::BIGINT as total_registrants,
    COALESCE(SUM(total_attendees), 0)::BIGINT as total_attendees,
    CASE 
      WHEN SUM(total_registrants) > 0 
      THEN ROUND((SUM(total_attendees)::NUMERIC / SUM(total_registrants)::NUMERIC) * 100, 2)
      ELSE 0
    END as avg_attendance_rate,
    COUNT(*) FILTER (
      WHERE host_email IS NULL 
      OR total_registrants IS NULL 
      OR (status = 'finished' AND total_attendees IS NULL)
    )::BIGINT as webinars_with_missing_data
  FROM zoom_webinars
  WHERE connection_id = p_connection_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Grant necessary permissions
GRANT SELECT ON webinar_status_overview TO authenticated;
GRANT EXECUTE ON FUNCTION get_webinar_metrics(UUID) TO authenticated;

-- Add comment to track this migration
COMMENT ON TABLE zoom_webinars IS 'Data quality fixes applied - status determination, missing columns, and validation';
