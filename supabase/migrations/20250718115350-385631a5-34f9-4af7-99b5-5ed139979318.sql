-- Security fixes: Add missing RLS policies and fix database security issues

-- Enable RLS on tables missing policies
ALTER TABLE public.zoom_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_participant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_qna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_registrants ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for zoom_polls
CREATE POLICY "Users can view polls from their webinars" ON public.zoom_polls
  FOR SELECT USING (webinar_id IN (
    SELECT zw.id FROM zoom_webinars zw 
    JOIN zoom_connections zc ON zw.connection_id = zc.id 
    WHERE zc.user_id = auth.uid()
  ));

-- Add RLS policies for zoom_participant_sessions  
CREATE POLICY "Users can view participant sessions from their webinars" ON public.zoom_participant_sessions
  FOR SELECT USING (webinar_id IN (
    SELECT zw.id FROM zoom_webinars zw 
    JOIN zoom_connections zc ON zw.connection_id = zc.id 
    WHERE zc.user_id = auth.uid()
  ));

-- Add RLS policies for zoom_recordings
CREATE POLICY "Users can view recordings from their webinars" ON public.zoom_recordings
  FOR SELECT USING (webinar_id IN (
    SELECT zw.id FROM zoom_webinars zw 
    JOIN zoom_connections zc ON zw.connection_id = zc.id 
    WHERE zc.user_id = auth.uid()
  ));

-- Add RLS policies for zoom_qna
CREATE POLICY "Users can view Q&A from their webinars" ON public.zoom_qna
  FOR SELECT USING (webinar_id IN (
    SELECT zw.id FROM zoom_webinars zw 
    JOIN zoom_connections zc ON zw.connection_id = zc.id 
    WHERE zc.user_id = auth.uid()
  ));

-- Add RLS policies for zoom_poll_responses
CREATE POLICY "Users can view poll responses from their webinars" ON public.zoom_poll_responses
  FOR SELECT USING (poll_id IN (
    SELECT zp.id FROM zoom_polls zp 
    JOIN zoom_webinars zw ON zp.webinar_id = zw.id
    JOIN zoom_connections zc ON zw.connection_id = zc.id 
    WHERE zc.user_id = auth.uid()
  ));

-- Add RLS policies for zoom_registrants
CREATE POLICY "Users can view registrants from their webinars" ON public.zoom_registrants
  FOR SELECT USING (webinar_id IN (
    SELECT zw.id FROM zoom_webinars zw 
    JOIN zoom_connections zc ON zw.connection_id = zc.id 
    WHERE zc.user_id = auth.uid()
  ));

-- Fix database functions security by adding SET search_path = ''
CREATE OR REPLACE FUNCTION public.update_webinar_status_based_on_time()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status = 'scheduled' AND 
     NEW.start_time < NOW() - INTERVAL '1 hour' AND
     NEW.start_time + (NEW.duration || ' minutes')::INTERVAL < NOW() THEN
    NEW.status := 'ended';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.zoom_connections zc ON zc.user_id = p.id
    WHERE p.id = user_id 
    AND (p.role IN ('owner', 'admin') OR zc.is_account_admin = true)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_webinar_status(webinar_start_time timestamp with time zone, webinar_duration integer, check_time timestamp with time zone)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  INSERT INTO public.user_settings (id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;