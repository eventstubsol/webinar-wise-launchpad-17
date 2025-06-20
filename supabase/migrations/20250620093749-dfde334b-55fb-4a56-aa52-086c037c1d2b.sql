
-- Check existing policies and fix RLS for zoom_sync_logs table

-- First, let's see what policies exist by attempting to drop them safely
DROP POLICY IF EXISTS "Users can create their own sync logs" ON public.zoom_sync_logs;
DROP POLICY IF EXISTS "Users can update their own sync logs" ON public.zoom_sync_logs;
DROP POLICY IF EXISTS "Users can view their own sync logs" ON public.zoom_sync_logs;
DROP POLICY IF EXISTS "Users can delete their own sync logs" ON public.zoom_sync_logs;

-- The service role policy already exists, so let's just create the user policies
CREATE POLICY "Users can view their own sync logs"
ON public.zoom_sync_logs
FOR SELECT
TO authenticated
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create sync logs for their connections"
ON public.zoom_sync_logs
FOR INSERT
TO authenticated
WITH CHECK (
  connection_id IN (
    SELECT id FROM public.zoom_connections 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update sync logs for their connections"
ON public.zoom_sync_logs
FOR UPDATE
TO authenticated
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  connection_id IN (
    SELECT id FROM public.zoom_connections 
    WHERE user_id = auth.uid()
  )
);

-- Ensure zoom_webinars service role policy exists (drop and recreate to be safe)
DROP POLICY IF EXISTS "Service role can manage all webinars" ON public.zoom_webinars;

CREATE POLICY "Service role can manage all webinars"
ON public.zoom_webinars
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
