
-- Phase 2: Fix Supabase Security Issues
-- Remove the problematic view that uses SECURITY DEFINER
DROP VIEW IF EXISTS public.zoom_webinars_with_calculated_status;

-- Remove any unused security definer functions that might be causing warnings
-- (keeping only the essential ones like handle_new_user and handle_updated_at)

-- Create a simple function to calculate webinar status without SECURITY DEFINER
-- This replaces the view with a safer approach
CREATE OR REPLACE FUNCTION public.get_webinar_status(
  webinar_start_time timestamp with time zone, 
  webinar_duration integer
) 
RETURNS text 
LANGUAGE plpgsql 
IMMUTABLE 
AS $$
BEGIN
  RETURN calculate_webinar_status(webinar_start_time, webinar_duration, NOW());
END;
$$;

-- Update RLS policies to ensure they work correctly with service role
-- Make sure all zoom-related tables have proper policies

-- Ensure zoom_sync_logs has proper RLS that allows service role access
DROP POLICY IF EXISTS "Service role and users can manage sync logs" ON public.zoom_sync_logs;

CREATE POLICY "Service role can manage all sync logs" 
    ON public.zoom_sync_logs 
    FOR ALL 
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.zoom_connections 
            WHERE zoom_connections.id = zoom_sync_logs.connection_id 
            AND zoom_connections.user_id = auth.uid()
        )
    );

-- Ensure zoom_webinars table has proper service role access
DROP POLICY IF EXISTS "Service role can manage webinars" ON public.zoom_webinars;

CREATE POLICY "Service role can manage all webinars" 
    ON public.zoom_webinars 
    FOR ALL 
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.zoom_connections 
            WHERE zoom_connections.id = zoom_webinars.connection_id 
            AND zoom_connections.user_id = auth.uid()
        )
    );
