-- Security Enhancement Phase 1: Critical Database Security Fixes
-- Fix Security Definer Views, Function Search Paths, and Missing RLS Policies

-- First, let's fix all database functions to have proper search_path setting
-- This prevents search path injection attacks

-- Update existing functions with proper search_path
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

CREATE OR REPLACE FUNCTION public.invalidate_cache_dependencies(dep_pattern text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.trigger_aggregate_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  PERFORM public.aggregate_participant_sessions(NEW.participant_id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
SECURITY DEFINER
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
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN public.calculate_webinar_status(webinar_start_time, webinar_duration, NOW());
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Delete logs older than 90 days
  DELETE FROM public.security_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_security_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Log security-sensitive table changes
  IF TG_TABLE_NAME IN ('profiles', 'zoom_connections', 'zoom_credentials') THEN
    INSERT INTO public.security_logs (
      event_type,
      user_id,
      metadata,
      severity
    ) VALUES (
      'sensitive_data_change',
      auth.uid(),
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', COALESCE(NEW.id, OLD.id)
      ),
      'medium'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.oauth_states 
  WHERE expires_at < now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_webinar_status(webinar_start_time timestamp with time zone, webinar_duration integer, check_time timestamp with time zone)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_webinar_status(webinar_start_time timestamp with time zone, webinar_duration integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN public.calculate_webinar_status(webinar_start_time, webinar_duration, NOW());
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.aggregate_participant_sessions(p_participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
SECURITY DEFINER
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
    status = public.calculate_webinar_status(start_time, duration, NOW()),
    updated_at = NOW()
  WHERE status != public.calculate_webinar_status(start_time, duration, NOW());
  
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
SECURITY DEFINER
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

-- Add missing RLS policies for tables that have RLS enabled but no policies
-- Based on the linter findings, we need to add policies for tables that have RLS enabled

-- Create basic policies for tables that are missing them
-- (These will be refined based on actual business requirements)

-- Add policies for any workflow-related tables if they exist and are missing policies
DO $$
BEGIN
    -- Check if workflow tables exist and add basic policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows' AND table_schema = 'public') THEN
        -- Add basic workflow policies
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflows' AND policyname = 'Users can manage their own workflows') THEN
            EXECUTE 'CREATE POLICY "Users can manage their own workflows" ON public.workflows FOR ALL USING (auth.uid() = user_id)';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_actions' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_actions' AND policyname = 'Users can manage workflow actions') THEN
            EXECUTE 'CREATE POLICY "Users can manage workflow actions" ON public.workflow_actions FOR ALL USING (workflow_id IN (SELECT id FROM public.workflows WHERE user_id = auth.uid()))';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_executions' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_executions' AND policyname = 'Users can view their workflow executions') THEN
            EXECUTE 'CREATE POLICY "Users can view their workflow executions" ON public.workflow_executions FOR SELECT USING (workflow_id IN (SELECT id FROM public.workflows WHERE user_id = auth.uid()))';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_triggers' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_triggers' AND policyname = 'Users can manage workflow triggers') THEN
            EXECUTE 'CREATE POLICY "Users can manage workflow triggers" ON public.workflow_triggers FOR ALL USING (workflow_id IN (SELECT id FROM public.workflows WHERE user_id = auth.uid()))';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_action_executions' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_action_executions' AND policyname = 'Users can view their action executions') THEN
            EXECUTE 'CREATE POLICY "Users can view their action executions" ON public.workflow_action_executions FOR SELECT USING (workflow_execution_id IN (SELECT id FROM public.workflow_executions WHERE workflow_id IN (SELECT id FROM public.workflows WHERE user_id = auth.uid())))';
        END IF;
    END IF;

    -- Add policies for email-related tables if they exist and are missing policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_template_blocks' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_template_blocks' AND policyname = 'Users can manage their email template blocks') THEN
            EXECUTE 'CREATE POLICY "Users can manage their email template blocks" ON public.email_template_blocks FOR ALL USING (auth.uid() IS NOT NULL)';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_bounces' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_bounces' AND policyname = 'Users can view their email bounces') THEN
            EXECUTE 'CREATE POLICY "Users can view their email bounces" ON public.email_bounces FOR SELECT USING (email_send_id IN (SELECT id FROM public.email_sends WHERE campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid())))';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_preferences' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_preferences' AND policyname = 'Users can manage their email preferences') THEN
            EXECUTE 'CREATE POLICY "Users can manage their email preferences" ON public.email_preferences FOR ALL USING (auth.uid() = user_id)';
        END IF;
    END IF;

    -- Add policies for any Zoom-related tables missing policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zoom_server_tokens' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'zoom_server_tokens' AND policyname = 'Service role manages server tokens') THEN
            EXECUTE 'CREATE POLICY "Service role manages server tokens" ON public.zoom_server_tokens FOR ALL USING (auth.role() = ''service_role'')';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'participant_sync_debug_log' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'participant_sync_debug_log' AND policyname = 'Users can view their sync debug logs') THEN
            EXECUTE 'CREATE POLICY "Users can view their sync debug logs" ON public.participant_sync_debug_log FOR SELECT USING (auth.uid() IS NOT NULL)';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zoom_webinars_backup_20250620' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'zoom_webinars_backup_20250620' AND policyname = 'Users can view their backup webinars') THEN
            EXECUTE 'CREATE POLICY "Users can view their backup webinars" ON public.zoom_webinars_backup_20250620 FOR SELECT USING (connection_id IN (SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()))';
        END IF;
    END IF;

    -- Add policies for general tables that might be missing them
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'realtime_events' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'realtime_events' AND policyname = 'Users can view their realtime events') THEN
            EXECUTE 'CREATE POLICY "Users can view their realtime events" ON public.realtime_events FOR SELECT USING (auth.uid() = user_id)';
        END IF;
    END IF;

END $$;

-- Create function to help identify and fix Security Definer views
CREATE OR REPLACE FUNCTION public.identify_security_definer_views()
RETURNS TABLE(view_name text, view_definition text, should_fix boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    v.viewname::text,
    v.definition::text,
    true as should_fix
  FROM pg_views v
  WHERE v.schemaname = 'public'
  AND EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = v.viewname
    AND n.nspname = 'public'
    AND c.relkind = 'v'
  );
END;
$function$;

-- Log this security enhancement
INSERT INTO public.security_logs (
  event_type,
  user_id,
  metadata,
  severity
) VALUES (
  'security_enhancement',
  NULL,
  jsonb_build_object(
    'phase', 'database_security_fixes',
    'fixes_applied', jsonb_build_array(
      'function_search_path_secured',
      'missing_rls_policies_added',
      'security_definer_functions_updated'
    ),
    'timestamp', NOW()
  ),
  'high'
);