
-- Add columns to the zoom_webinars table
ALTER TABLE public.zoom_webinars
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS h323_password TEXT,
ADD COLUMN IF NOT EXISTS pstn_password TEXT,
ADD COLUMN IF NOT EXISTS encrypted_password TEXT,
ADD COLUMN IF NOT EXISTS settings JSONB,
ADD COLUMN IF NOT EXISTS tracking_fields JSONB,
ADD COLUMN IF NOT EXISTS recurrence JSONB,
ADD COLUMN IF NOT EXISTS occurrences JSONB;

-- Add columns to the zoom_participants table
ALTER TABLE public.zoom_participants
ADD COLUMN IF NOT EXISTS connection_type TEXT,
ADD COLUMN IF NOT EXISTS data_center TEXT,
ADD COLUMN IF NOT EXISTS pc_name TEXT,
ADD COLUMN IF NOT EXISTS domain TEXT,
ADD COLUMN IF NOT EXISTS mac_addr TEXT,
ADD COLUMN IF NOT EXISTS harddisk_id TEXT,
ADD COLUMN IF NOT EXISTS recording_consent BOOLEAN DEFAULT FALSE;

-- Add columns to the zoom_registrants table
ALTER TABLE public.zoom_registrants
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS purchasing_time_frame TEXT,
ADD COLUMN IF NOT EXISTS role_in_purchase_process TEXT,
ADD COLUMN IF NOT EXISTS no_of_employees TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS org TEXT,
ADD COLUMN IF NOT EXISTS language TEXT;

-- Create the zoom_panelists table
CREATE TABLE IF NOT EXISTS public.zoom_panelists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webinar_id UUID REFERENCES public.zoom_webinars(id) ON DELETE CASCADE,
    panelist_id TEXT,
    panelist_email TEXT,
    name TEXT,
    join_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create the zoom_chat_messages table
CREATE TABLE IF NOT EXISTS public.zoom_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webinar_id UUID REFERENCES public.zoom_webinars(id) ON DELETE CASCADE,
    sender_name TEXT,
    sender_email TEXT,
    message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create the zoom_webinar_tracking table
CREATE TABLE IF NOT EXISTS public.zoom_webinar_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webinar_id UUID REFERENCES public.zoom_webinars(id) ON DELETE CASCADE,
    source_name TEXT,
    tracking_url TEXT,
    visitor_count INTEGER,
    registration_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security and create policies for zoom_panelists
ALTER TABLE public.zoom_panelists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage panelists for their own webinars" ON public.zoom_panelists;
CREATE POLICY "Users can manage panelists for their own webinars"
ON public.zoom_panelists
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.zoom_webinars AS zw
    JOIN public.zoom_connections AS zc ON zw.connection_id = zc.id
    WHERE zw.id = zoom_panelists.webinar_id AND zc.user_id = auth.uid()
  )
);

-- Enable Row Level Security and create policies for zoom_chat_messages
ALTER TABLE public.zoom_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage chat messages for their own webinars" ON public.zoom_chat_messages;
CREATE POLICY "Users can manage chat messages for their own webinars"
ON public.zoom_chat_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.zoom_webinars AS zw
    JOIN public.zoom_connections AS zc ON zw.connection_id = zc.id
    WHERE zw.id = zoom_chat_messages.webinar_id AND zc.user_id = auth.uid()
  )
);

-- Enable Row Level Security and create policies for zoom_webinar_tracking
ALTER TABLE public.zoom_webinar_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage tracking for their own webinars" ON public.zoom_webinar_tracking;
CREATE POLICY "Users can manage tracking for their own webinars"
ON public.zoom_webinar_tracking
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.zoom_webinars AS zw
    JOIN public.zoom_connections AS zc ON zw.connection_id = zc.id
    WHERE zw.id = zoom_webinar_tracking.webinar_id AND zc.user_id = auth.uid()
  )
);

