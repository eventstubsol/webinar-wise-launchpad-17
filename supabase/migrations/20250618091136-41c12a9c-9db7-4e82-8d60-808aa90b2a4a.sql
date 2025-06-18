
-- Add missing RLS policies for zoom_participants table
-- These policies allow users to insert and update participants for their own webinars

-- Policy for INSERT: Allow users to insert participants for webinars they own
CREATE POLICY "Users can insert participants for their own webinars"
ON public.zoom_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zoom_webinars zw
    JOIN public.zoom_connections zc ON zw.connection_id = zc.id
    WHERE zw.id = zoom_participants.webinar_id 
    AND zc.user_id = auth.uid()
  )
);

-- Policy for UPDATE: Allow users to update participants for webinars they own
CREATE POLICY "Users can update participants for their own webinars"
ON public.zoom_participants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.zoom_webinars zw
    JOIN public.zoom_connections zc ON zw.connection_id = zc.id
    WHERE zw.id = zoom_participants.webinar_id 
    AND zc.user_id = auth.uid()
  )
);
