
-- First, add the missing ENCRYPTION_SALT secret to Supabase secrets
-- This will be used for consistent token encryption/decryption

-- Add RLS policies for zoom_sync_logs and zoom_webinars tables
-- These are missing and causing 406 errors

-- Enable RLS on tables (safe to run if already enabled)
ALTER TABLE public.zoom_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_webinars ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for zoom_sync_logs table
DROP POLICY IF EXISTS "Users can view their own sync logs" ON public.zoom_sync_logs;
CREATE POLICY "Users can view their own sync logs"
ON public.zoom_sync_logs FOR SELECT
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create their own sync logs" ON public.zoom_sync_logs;
CREATE POLICY "Users can create their own sync logs"
ON public.zoom_sync_logs FOR INSERT
WITH CHECK (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own sync logs" ON public.zoom_sync_logs;
CREATE POLICY "Users can update their own sync logs"
ON public.zoom_sync_logs FOR UPDATE
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

-- Add RLS policies for zoom_webinars table
DROP POLICY IF EXISTS "Users can view their own webinars" ON public.zoom_webinars;
CREATE POLICY "Users can view their own webinars"
ON public.zoom_webinars FOR SELECT
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own webinars" ON public.zoom_webinars;
CREATE POLICY "Users can insert their own webinars"
ON public.zoom_webinars FOR INSERT
WITH CHECK (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own webinars" ON public.zoom_webinars;
CREATE POLICY "Users can update their own webinars"
ON public.zoom_webinars FOR UPDATE
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

-- Add function to safely check if user owns a connection
CREATE OR REPLACE FUNCTION public.user_owns_connection(connection_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.zoom_connections 
    WHERE id = connection_id AND user_id = auth.uid()
  );
$$;
