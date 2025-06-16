
-- Add INSERT policy for zoom_registrants to allow users to insert registrants for their own webinars
CREATE POLICY "Users can insert registrants for their own webinars"
ON public.zoom_registrants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zoom_webinars zw
    JOIN public.zoom_connections zc ON zw.connection_id = zc.id
    WHERE zw.id = zoom_registrants.webinar_id 
    AND zc.user_id = auth.uid()
  )
);

-- Add UPDATE policy for zoom_registrants to allow users to update registrants for their own webinars
CREATE POLICY "Users can update registrants for their own webinars"
ON public.zoom_registrants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.zoom_webinars zw
    JOIN public.zoom_connections zc ON zw.connection_id = zc.id
    WHERE zw.id = zoom_registrants.webinar_id 
    AND zc.user_id = auth.uid()
  )
);
