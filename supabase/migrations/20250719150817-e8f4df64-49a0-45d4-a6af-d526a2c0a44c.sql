-- Fix duplicate calculate_webinar_status functions with cascade
-- First, drop all existing versions with cascade
DROP FUNCTION IF EXISTS calculate_webinar_status(timestamp with time zone, integer, timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS calculate_webinar_status(timestamp with time zone, integer) CASCADE;

-- Recreate the correct function with both overloads
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

-- Also create the 2-parameter version for backward compatibility
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