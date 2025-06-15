
-- Migration to fix RLS policies for sync operations

-- Enable RLS on zoom_sync_logs and zoom_webinars if not already enabled.
-- It's safe to run this even if it's already enabled.
ALTER TABLE public.zoom_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_webinars ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for zoom_sync_logs table
CREATE POLICY "Users can view their own sync logs"
ON public.zoom_sync_logs FOR SELECT
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own sync logs"
ON public.zoom_sync_logs FOR INSERT
WITH CHECK (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own sync logs"
ON public.zoom_sync_logs FOR UPDATE
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own sync logs"
ON public.zoom_sync_logs FOR DELETE
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

-- Add RLS policies for zoom_webinars table
CREATE POLICY "Users can view their own webinars"
ON public.zoom_webinars FOR SELECT
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own webinars"
ON public.zoom_webinars FOR INSERT
WITH CHECK (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own webinars"
ON public.zoom_webinars FOR UPDATE
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own webinars"
ON public.zoom_webinars FOR DELETE
USING (
  connection_id IN (
    SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
  )
);
