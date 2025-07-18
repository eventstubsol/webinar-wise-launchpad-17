-- Critical Security Fixes - Phase 1: Database Security

-- 1. Enable RLS on zoom_webinars_backup table (addresses RLS Disabled in Public)
ALTER TABLE public.zoom_webinars_backup ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policy for zoom_webinars_backup
CREATE POLICY "Users can view their own webinar backups" ON public.zoom_webinars_backup
  FOR SELECT USING (connection_id IN (
    SELECT zc.id FROM zoom_connections zc WHERE zc.user_id = auth.uid()
  ));

-- 2. Fix Function Search Path Mutable warnings by adding SET search_path = ''
-- Update all functions that are missing proper search_path settings

CREATE OR REPLACE FUNCTION public.enqueue_task(p_task_type text, p_task_data jsonb, p_priority integer DEFAULT 5, p_webinar_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    task_id uuid;
BEGIN
    INSERT INTO public.processing_queue (task_type, task_data, priority, webinar_id, user_id)
    VALUES (p_task_type, p_task_data, p_priority, p_webinar_id, p_user_id)
    RETURNING id INTO task_id;
    
    RETURN task_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_record_history(p_table_name text, p_record_id text)
RETURNS TABLE(audit_id uuid, action text, changes jsonb, changed_by uuid, changed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    al.id as audit_id,
    al.action,
    CASE 
      WHEN al.action = 'DELETE' THEN al.old_data
      WHEN al.action = 'INSERT' THEN al.new_data
      ELSE jsonb_build_object('before', al.old_data, 'after', al.new_data)
    END as changes,
    al.changed_by,
    al.changed_at
  FROM public.audit_log al
  WHERE al.table_name = p_table_name 
    AND al.record_id = p_record_id
  ORDER BY al.changed_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_webinar_status(webinar_start_time timestamp with time zone, webinar_duration integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
  RETURN calculate_webinar_status(webinar_start_time, webinar_duration, NOW());
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.invalidate_cache_dependencies(dep_pattern text)
RETURNS integer
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
    affected_count integer;
BEGIN
    DELETE FROM public.analytics_cache 
    WHERE dep_pattern = ANY(dependencies) OR expires_at < now();
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.aggregate_participant_sessions(p_participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_total_duration INTEGER;
  v_session_count INTEGER;
  v_first_join TIMESTAMPTZ;
  v_last_leave TIMESTAMPTZ;
BEGIN
  SELECT 
    COALESCE(SUM(duration), 0),
    COUNT(*),
    MIN(join_time),
    MAX(leave_time)
  INTO v_total_duration, v_session_count, v_first_join, v_last_leave
  FROM public.zoom_participant_sessions
  WHERE participant_id = p_participant_id;
  
  UPDATE public.zoom_participants
  SET 
    total_duration = v_total_duration,
    session_count = v_session_count,
    first_join_time = v_first_join,
    last_leave_time = v_last_leave,
    duration = v_total_duration,
    join_time = v_first_join,
    leave_time = v_last_leave,
    is_aggregated = TRUE,
    updated_at = NOW()
  WHERE id = p_participant_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.batch_update_webinar_statuses()
RETURNS TABLE(updated_count integer, upcoming_count integer, live_count integer, ended_count integer)
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  updated_rows INTEGER;
  upcoming_rows INTEGER;
  live_rows INTEGER;
  ended_rows INTEGER;
BEGIN
  UPDATE public.zoom_webinars 
  SET 
    status = calculate_webinar_status(start_time, duration, NOW()),
    updated_at = NOW()
  WHERE status != calculate_webinar_status(start_time, duration, NOW());
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  SELECT COUNT(*) INTO upcoming_rows FROM public.zoom_webinars WHERE status = 'upcoming';
  SELECT COUNT(*) INTO live_rows FROM public.zoom_webinars WHERE status = 'live';
  SELECT COUNT(*) INTO ended_rows FROM public.zoom_webinars WHERE status = 'ended';
  
  RETURN QUERY SELECT updated_rows, upcoming_rows, live_rows, ended_rows;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_webinar_stats(p_webinar_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.zoom_webinars
  SET 
    actual_participant_count = (
      SELECT COUNT(DISTINCT p.id) 
      FROM public.zoom_participants p 
      WHERE p.webinar_id = p_webinar_id
    ),
    unique_participant_count = (
      SELECT COUNT(DISTINCT COALESCE(p.participant_email, p.participant_name, p.participant_uuid))
      FROM public.zoom_participants p 
      WHERE p.webinar_id = p_webinar_id
    ),
    total_participant_minutes = (
      SELECT COALESCE(SUM(p.total_duration), 0) / 60
      FROM public.zoom_participants p 
      WHERE p.webinar_id = p_webinar_id
    ),
    updated_at = NOW()
  WHERE id = p_webinar_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_aggregate_sessions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  PERFORM aggregate_participant_sessions(NEW.participant_id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_webinar_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.start_time < NOW() AND NEW.status NOT IN ('ended', 'finished') THEN
    NEW.status := 'ended';
  END IF;
  
  NEW.total_absentees := GREATEST(0, COALESCE(NEW.total_registrants, 0) - COALESCE(NEW.total_attendees, 0));
  
  IF NEW.sync_status = 'pending' AND NEW.last_synced_at IS NOT NULL AND 
     (NEW.total_registrants > 0 OR NEW.total_attendees > 0 OR NEW.uuid IS NOT NULL) THEN
    NEW.sync_status := 'synced';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_webinar_status(webinar_start_time timestamp with time zone, webinar_duration integer)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $function$
BEGIN
  RETURN calculate_webinar_status(webinar_start_time, webinar_duration, NOW());
END;
$function$;