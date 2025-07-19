
-- Phase 1 & 2: Enhanced Database Trigger with Status Protection
-- Replace the existing trigger function with improved logic
CREATE OR REPLACE FUNCTION update_webinar_status_trigger()
RETURNS TRIGGER AS $$
DECLARE
  calculated_status TEXT;
BEGIN
  -- Calculate what the status should be based on timing
  calculated_status := calculate_webinar_status(
    COALESCE(NEW.start_time, OLD.start_time), 
    COALESCE(NEW.duration, OLD.duration)
  );
  
  -- For INSERT operations, always set the calculated status
  IF TG_OP = 'INSERT' THEN
    NEW.status = calculated_status;
    RETURN NEW;
  END IF;
  
  -- For UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Always recalculate if start_time or duration changed
    IF OLD.start_time IS DISTINCT FROM NEW.start_time OR OLD.duration IS DISTINCT FROM NEW.duration THEN
      NEW.status = calculated_status;
      NEW.updated_at = NOW();
      RETURN NEW;
    END IF;
    
    -- CRITICAL FIX: Prevent 'scheduled' from overriding correct calculated status
    -- Only allow 'scheduled' if the webinar is actually upcoming
    IF NEW.status = 'scheduled' AND OLD.status != 'scheduled' THEN
      -- If trying to set to 'scheduled' but timing says it should be different, use calculated status
      IF calculated_status != 'scheduled' THEN
        NEW.status = calculated_status;
        NEW.updated_at = NOW();
      END IF;
    END IF;
    
    -- Allow legitimate status changes (like cancelled, deleted)
    -- But preserve calculated status for timing-based statuses
    IF NEW.status IN ('cancelled', 'deleted') THEN
      -- Allow these explicit status overrides
      NEW.updated_at = NOW();
    ELSIF NEW.status IN ('scheduled', 'upcoming', 'live', 'ended') AND NEW.status != calculated_status THEN
      -- For timing-based statuses, use calculated value instead
      NEW.status = calculated_status;
      NEW.updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 4: Enhanced status correction function with better logging
CREATE OR REPLACE FUNCTION system_update_webinar_statuses_with_logging()
RETURNS TABLE(
  updated_count INTEGER,
  upcoming_count INTEGER,
  live_count INTEGER,
  ended_count INTEGER,
  corrections_made JSONB
) AS $$
DECLARE
  updated_rows INTEGER;
  upcoming_rows INTEGER;
  live_rows INTEGER;
  ended_rows INTEGER;
  corrections JSONB := '[]'::jsonb;
  correction_record RECORD;
BEGIN
  -- Capture corrections being made
  FOR correction_record IN
    SELECT 
      id,
      webinar_id,
      topic,
      status as old_status,
      calculate_webinar_status(start_time, duration, NOW()) as new_status
    FROM zoom_webinars 
    WHERE status != calculate_webinar_status(start_time, duration, NOW())
  LOOP
    corrections := corrections || jsonb_build_object(
      'webinar_id', correction_record.webinar_id,
      'topic', correction_record.topic,
      'old_status', correction_record.old_status,
      'new_status', correction_record.new_status
    );
  END LOOP;
  
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
  
  RETURN QUERY SELECT updated_rows, upcoming_rows, live_rows, ended_rows, corrections;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS trigger_update_webinar_status ON zoom_webinars;
CREATE TRIGGER trigger_update_webinar_status
  BEFORE INSERT OR UPDATE ON zoom_webinars
  FOR EACH ROW
  EXECUTE FUNCTION update_webinar_status_trigger();
