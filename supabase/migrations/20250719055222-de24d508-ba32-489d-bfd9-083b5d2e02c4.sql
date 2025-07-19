-- Create zoom_participants table for storing participant data
CREATE TABLE public.zoom_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    webinar_id UUID NOT NULL REFERENCES public.zoom_webinars(id) ON DELETE CASCADE,
    participant_uuid TEXT,
    participant_user_id TEXT,
    participant_name TEXT,
    participant_email TEXT,
    join_time TIMESTAMP WITH TIME ZONE,
    leave_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    attentiveness_score TEXT,
    registration_time TIMESTAMP WITH TIME ZONE,
    approval_type TEXT,
    custom_questions JSONB DEFAULT '[]',
    is_rejoin_session BOOLEAN DEFAULT false,
    user_location JSONB DEFAULT '{}',
    connection_type TEXT,
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rate_limit_tracking table for monitoring API usage
CREATE TABLE public.rate_limit_tracking (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES public.zoom_connections(id) ON DELETE CASCADE,
    api_calls_made INTEGER NOT NULL DEFAULT 0,
    api_calls_limit INTEGER NOT NULL DEFAULT 100,
    reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
    warning_threshold INTEGER DEFAULT 80,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_syncs table for sync scheduling
CREATE TABLE public.scheduled_syncs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES public.zoom_connections(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to zoom_sync_logs
ALTER TABLE public.zoom_sync_logs 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS webinars_synced INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_id ON public.zoom_participants(webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_participants_email ON public.zoom_participants(participant_email);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_id ON public.rate_limit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_connection_id ON public.rate_limit_tracking(connection_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_syncs_connection_id ON public.scheduled_syncs(connection_id);

-- Enable RLS
ALTER TABLE public.zoom_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_syncs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for zoom_participants
CREATE POLICY "Users can view participants from their webinars" ON public.zoom_participants
    FOR SELECT USING (
        webinar_id IN (
            SELECT zw.id FROM public.zoom_webinars zw
            JOIN public.zoom_connections zc ON zw.connection_id = zc.id
            WHERE zc.user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage participants" ON public.zoom_participants
    FOR ALL USING (true) WITH CHECK (true);

-- Create RLS policies for rate_limit_tracking
CREATE POLICY "Users can view their own rate limit tracking" ON public.rate_limit_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limit tracking" ON public.rate_limit_tracking
    FOR ALL USING (true) WITH CHECK (true);

-- Create RLS policies for scheduled_syncs
CREATE POLICY "Users can view scheduled syncs for their connections" ON public.scheduled_syncs
    FOR SELECT USING (
        connection_id IN (
            SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage scheduled syncs" ON public.scheduled_syncs
    FOR ALL USING (true) WITH CHECK (true);

-- Add triggers for updated_at
CREATE TRIGGER update_zoom_participants_updated_at
    BEFORE UPDATE ON public.zoom_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_rate_limit_tracking_updated_at
    BEFORE UPDATE ON public.rate_limit_tracking
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_scheduled_syncs_updated_at
    BEFORE UPDATE ON public.scheduled_syncs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();