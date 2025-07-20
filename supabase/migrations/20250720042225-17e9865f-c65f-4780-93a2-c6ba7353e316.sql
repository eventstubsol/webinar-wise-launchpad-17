-- Final fix: Drop all calculate_webinar_status functions and recreate with unique signatures
-- This should completely resolve the function ambiguity issue

-- Drop all functions and triggers completely
DROP FUNCTION IF EXISTS calculate_webinar_status(timestamp with time zone, integer, timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS calculate_webinar_status(timestamp with time zone, integer) CASCADE;
DROP TRIGGER IF EXISTS trigger_update_webinar_status ON zoom_webinars;
DROP FUNCTION IF EXISTS update_webinar_status_trigger() CASCADE;

-- Create the main function with 3 parameters
CREATE OR REPLACE FUNCTION public.calculate_webinar_status_main(
  webinar_start_time timestamp with time zone, 
  webinar_duration integer, 
  check_time timestamp with time zone
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  estimated_end_time TIMESTAMP WITH TIME ZONE;
  buffer_minutes INTEGER := 5;
BEGIN
  IF webinar_start_time IS NULL OR webinar_duration IS NULL THEN
    RETURN 'unknown';
  END IF;
  
  estimated_end_time := webinar_start_time + (webinar_duration || ' minutes')::INTERVAL;
  
  IF check_time < webinar_start_time THEN
    RETURN 'upcoming';
  ELSIF check_time >= webinar_start_time AND check_time <= (estimated_end_time + (buffer_minutes || ' minutes')::INTERVAL) THEN
    RETURN 'live';
  ELSE
    RETURN 'ended';
  END IF;
END;
$function$;

-- Create the 2-parameter version that calls the main function
CREATE OR REPLACE FUNCTION public.calculate_webinar_status(
  webinar_start_time timestamp with time zone, 
  webinar_duration integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
  RETURN calculate_webinar_status_main(webinar_start_time, webinar_duration, NOW());
END;
$function$;

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION public.update_webinar_status_trigger()
RETURNS TRIGGER AS $function$
DECLARE
  calculated_status TEXT;
BEGIN
  calculated_status := calculate_webinar_status(
    COALESCE(NEW.start_time, OLD.start_time), 
    COALESCE(NEW.duration, OLD.duration)
  );
  
  IF TG_OP = 'INSERT' THEN
    NEW.status = calculated_status;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.start_time IS DISTINCT FROM NEW.start_time OR OLD.duration IS DISTINCT FROM NEW.duration THEN
      NEW.status = calculated_status;
      NEW.updated_at = NOW();
      RETURN NEW;
    END IF;
    
    IF NEW.status = 'scheduled' AND OLD.status != 'scheduled' THEN
      IF calculated_status != 'scheduled' THEN
        NEW.status = calculated_status;
        NEW.updated_at = NOW();
      END IF;
    END IF;
    
    IF NEW.status IN ('cancelled', 'deleted') THEN
      NEW.updated_at = NOW();
    ELSIF NEW.status IN ('scheduled', 'upcoming', 'live', 'ended') AND NEW.status != calculated_status THEN
      NEW.status = calculated_status;
      NEW.updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_update_webinar_status
  BEFORE INSERT OR UPDATE ON zoom_webinars
  FOR EACH ROW
  EXECUTE FUNCTION update_webinar_status_trigger();

-- Test the functions
SELECT calculate_webinar_status(NOW() + INTERVAL '1 hour', 60) as upcoming_test;
SELECT calculate_webinar_status(NOW() - INTERVAL '30 minutes', 60) as live_test;
SELECT calculate_webinar_status(NOW() - INTERVAL '2 hours', 60) as ended_test;