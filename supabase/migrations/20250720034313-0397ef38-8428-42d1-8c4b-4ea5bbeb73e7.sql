
-- COMPREHENSIVE FIX: Complete cleanup and recreation of calculate_webinar_status function
-- Step 1: Drop ALL calculate_webinar_status functions with CASCADE to remove all dependencies
DROP FUNCTION IF EXISTS calculate_webinar_status(timestamp with time zone, integer, timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS calculate_webinar_status(timestamp with time zone, integer) CASCADE;

-- Step 2: Drop the trigger first to avoid conflicts
DROP TRIGGER IF EXISTS trigger_update_webinar_status ON zoom_webinars;

-- Step 3: Create a single, clean calculate_webinar_status function with proper overloads
CREATE OR REPLACE FUNCTION public.calculate_webinar_status(
  webinar_start_time timestamp with time zone, 
  webinar_duration integer, 
  check_time timestamp with time zone DEFAULT now()
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
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
$function$;

-- Step 4: Create the 2-parameter overload for backward compatibility
CREATE OR REPLACE FUNCTION public.calculate_webinar_status(
  webinar_start_time timestamp with time zone, 
  webinar_duration integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
  RETURN calculate_webinar_status(webinar_start_time, webinar_duration, NOW());
END;
$function$;

-- Step 5: Recreate the trigger function (ensure it exists and works properly)
CREATE OR REPLACE FUNCTION public.update_webinar_status_trigger()
RETURNS TRIGGER AS $function$
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
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Recreate the trigger on the zoom_webinars table
CREATE TRIGGER trigger_update_webinar_status
  BEFORE INSERT OR UPDATE ON zoom_webinars
  FOR EACH ROW
  EXECUTE FUNCTION update_webinar_status_trigger();

-- Step 7: Test that the function works correctly
SELECT 
  'Test 1 - Upcoming webinar' as test_name,
  calculate_webinar_status(NOW() + INTERVAL '1 hour', 60) as result
UNION ALL
SELECT 
  'Test 2 - Live webinar' as test_name,
  calculate_webinar_status(NOW() - INTERVAL '30 minutes', 60) as result
UNION ALL
SELECT 
  'Test 3 - Ended webinar' as test_name,
  calculate_webinar_status(NOW() - INTERVAL '2 hours', 60) as result;

-- Step 8: Force update existing webinars to use the correct status calculation
UPDATE zoom_webinars 
SET 
  status = calculate_webinar_status(start_time, duration, NOW()),
  updated_at = NOW()
WHERE start_time IS NOT NULL AND duration IS NOT NULL;
