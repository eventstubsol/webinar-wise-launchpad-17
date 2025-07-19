-- Add missing columns to zoom_webinars table
ALTER TABLE public.zoom_webinars 
ADD COLUMN IF NOT EXISTS registrants_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_attendees integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_attendees integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_attendance_duration integer DEFAULT 0;

-- Create missing tables that are being referenced in the code

-- Table for zoom polls
CREATE TABLE IF NOT EXISTS public.zoom_polls (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    webinar_id uuid NOT NULL,
    poll_id text NOT NULL,
    title text,
    questions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table for zoom Q&A
CREATE TABLE IF NOT EXISTS public.zoom_qna (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    webinar_id uuid NOT NULL,
    question_id text NOT NULL,
    question text,
    answer text,
    asker_name text,
    answerer_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table for zoom recordings
CREATE TABLE IF NOT EXISTS public.zoom_recordings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    webinar_id uuid NOT NULL,
    recording_id text NOT NULL,
    recording_type text,
    file_type text,
    file_size bigint,
    play_url text,
    download_url text,
    recording_start timestamp with time zone,
    recording_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table for zoom registrants
CREATE TABLE IF NOT EXISTS public.zoom_registrants (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    webinar_id uuid NOT NULL,
    registrant_id text NOT NULL,
    email text NOT NULL,
    first_name text,
    last_name text,
    address text,
    city text,
    country text,
    zip text,
    state text,
    phone text,
    industry text,
    org text,
    job_title text,
    purchasing_time_frame text,
    role_in_purchase_process text,
    no_of_employees text,
    comments text,
    custom_questions jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'pending',
    join_url text,
    registration_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table for webinar metrics (aggregated)
CREATE TABLE IF NOT EXISTS public.webinar_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    webinar_id uuid NOT NULL,
    total_attendees integer DEFAULT 0,
    unique_attendees integer DEFAULT 0,
    registrants_count integer DEFAULT 0,
    avg_attendance_duration integer DEFAULT 0,
    peak_concurrent_attendees integer DEFAULT 0,
    engagement_score numeric DEFAULT 0,
    attendance_rate numeric DEFAULT 0,
    calculated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table for sync performance metrics
CREATE TABLE IF NOT EXISTS public.sync_performance_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sync_id uuid NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit text,
    recorded_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Add missing columns to sync logs for stage tracking
ALTER TABLE public.zoom_sync_logs 
ADD COLUMN IF NOT EXISTS sync_stage text DEFAULT 'initializing',
ADD COLUMN IF NOT EXISTS stage_progress_percentage integer DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.zoom_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_qna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_registrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "Users can view polls from their webinars"
ON public.zoom_polls FOR SELECT
USING (webinar_id IN (
    SELECT zw.id FROM zoom_webinars zw
    JOIN zoom_connections zc ON zw.connection_id = zc.id
    WHERE zc.user_id = auth.uid()
));

CREATE POLICY "Users can view Q&A from their webinars"
ON public.zoom_qna FOR SELECT
USING (webinar_id IN (
    SELECT zw.id FROM zoom_webinars zw
    JOIN zoom_connections zc ON zw.connection_id = zc.id
    WHERE zc.user_id = auth.uid()
));

CREATE POLICY "Users can view recordings from their webinars"
ON public.zoom_recordings FOR SELECT
USING (webinar_id IN (
    SELECT zw.id FROM zoom_webinars zw
    JOIN zoom_connections zc ON zw.connection_id = zc.id
    WHERE zc.user_id = auth.uid()
));

CREATE POLICY "Users can view registrants from their webinars"
ON public.zoom_registrants FOR SELECT
USING (webinar_id IN (
    SELECT zw.id FROM zoom_webinars zw
    JOIN zoom_connections zc ON zw.connection_id = zc.id
    WHERE zc.user_id = auth.uid()
));

CREATE POLICY "Users can view metrics from their webinars"
ON public.webinar_metrics FOR SELECT
USING (webinar_id IN (
    SELECT zw.id FROM zoom_webinars zw
    JOIN zoom_connections zc ON zw.connection_id = zc.id
    WHERE zc.user_id = auth.uid()
));

CREATE POLICY "System can manage sync performance metrics"
ON public.sync_performance_metrics FOR ALL
USING (true)
WITH CHECK (true);

-- System policies for data insertion
CREATE POLICY "System can manage polls"
ON public.zoom_polls FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "System can manage Q&A"
ON public.zoom_qna FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "System can manage recordings"
ON public.zoom_recordings FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "System can manage registrants"
ON public.zoom_registrants FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "System can manage webinar metrics"
ON public.webinar_metrics FOR ALL
USING (true)
WITH CHECK (true);

-- Add foreign key relationships where appropriate
ALTER TABLE public.zoom_polls 
ADD CONSTRAINT zoom_polls_webinar_id_fkey 
FOREIGN KEY (webinar_id) REFERENCES public.zoom_webinars(id) ON DELETE CASCADE;

ALTER TABLE public.zoom_qna 
ADD CONSTRAINT zoom_qna_webinar_id_fkey 
FOREIGN KEY (webinar_id) REFERENCES public.zoom_webinars(id) ON DELETE CASCADE;

ALTER TABLE public.zoom_recordings 
ADD CONSTRAINT zoom_recordings_webinar_id_fkey 
FOREIGN KEY (webinar_id) REFERENCES public.zoom_webinars(id) ON DELETE CASCADE;

ALTER TABLE public.zoom_registrants 
ADD CONSTRAINT zoom_registrants_webinar_id_fkey 
FOREIGN KEY (webinar_id) REFERENCES public.zoom_webinars(id) ON DELETE CASCADE;

ALTER TABLE public.webinar_metrics 
ADD CONSTRAINT webinar_metrics_webinar_id_fkey 
FOREIGN KEY (webinar_id) REFERENCES public.zoom_webinars(id) ON DELETE CASCADE;

ALTER TABLE public.sync_performance_metrics 
ADD CONSTRAINT sync_performance_metrics_sync_id_fkey 
FOREIGN KEY (sync_id) REFERENCES public.zoom_sync_logs(id) ON DELETE CASCADE;