
-- Create zoom_credentials table to store user's Zoom OAuth app credentials
CREATE TABLE public.zoom_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    app_name TEXT DEFAULT 'Zoom Server-to-Server OAuth App',
    app_type TEXT NOT NULL DEFAULT 'server_to_server',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create zoom_connections table to store active Zoom OAuth connections
CREATE TABLE public.zoom_connections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    zoom_user_id TEXT NOT NULL,
    zoom_account_id TEXT NOT NULL,
    zoom_email TEXT NOT NULL,
    zoom_account_type TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scopes TEXT[],
    connection_status TEXT NOT NULL DEFAULT 'active',
    connection_type TEXT DEFAULT 'server_to_server',
    client_id TEXT,
    client_secret TEXT,
    account_id TEXT,
    is_primary BOOLEAN DEFAULT true,
    auto_sync_enabled BOOLEAN DEFAULT true,
    sync_frequency_hours INTEGER DEFAULT 24,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    next_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create zoom_token_refresh_log table for audit trail
CREATE TABLE public.zoom_token_refresh_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES public.zoom_connections(id) ON DELETE CASCADE,
    refresh_type TEXT,
    refresh_status TEXT,
    old_token_expires_at TIMESTAMP WITH TIME ZONE,
    new_token_expires_at TIMESTAMP WITH TIME ZONE,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create zoom_sync_logs table for sync operation tracking
CREATE TABLE public.zoom_sync_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES public.zoom_connections(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processed_items INTEGER DEFAULT 0,
    total_items INTEGER,
    error_message TEXT,
    error_details JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create zoom_webinars table for storing webinar data
CREATE TABLE public.zoom_webinars (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES public.zoom_connections(id) ON DELETE CASCADE,
    zoom_webinar_id TEXT NOT NULL,
    webinar_id TEXT,
    uuid TEXT,
    host_id TEXT,
    topic TEXT NOT NULL,
    type INTEGER,
    start_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    timezone TEXT,
    agenda TEXT,
    created_at_zoom TIMESTAMP WITH TIME ZONE,
    start_url TEXT,
    join_url TEXT,
    password TEXT,
    h323_password TEXT,
    pstn_password TEXT,
    encrypted_password TEXT,
    settings JSONB DEFAULT '{}',
    tracking_fields JSONB DEFAULT '{}',
    occurrences JSONB DEFAULT '[]',
    status TEXT DEFAULT 'scheduled',
    total_registrants INTEGER DEFAULT 0,
    total_attendees INTEGER DEFAULT 0,
    total_absentees INTEGER DEFAULT 0,
    actual_participant_count INTEGER DEFAULT 0,
    unique_participant_count INTEGER DEFAULT 0,
    total_participant_minutes INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    participant_sync_status TEXT DEFAULT 'not_applicable',
    participant_sync_attempted_at TIMESTAMP WITH TIME ZONE,
    participant_sync_completed_at TIMESTAMP WITH TIME ZONE,
    participant_sync_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zoom_credentials_user_active ON public.zoom_credentials(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_zoom_connections_user_primary ON public.zoom_connections(user_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_zoom_sync_logs_connection ON public.zoom_sync_logs(connection_id, created_at);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection ON public.zoom_webinars(connection_id, start_time);

-- Enable RLS on all tables
ALTER TABLE public.zoom_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_token_refresh_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_webinars ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for zoom_credentials
CREATE POLICY "Users can manage their own zoom credentials" ON public.zoom_credentials
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for zoom_connections
CREATE POLICY "Users can manage their own zoom connections" ON public.zoom_connections
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for zoom_token_refresh_log
CREATE POLICY "Users can view their own token refresh logs" ON public.zoom_token_refresh_log
    FOR SELECT USING (
        connection_id IN (
            SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage token refresh logs" ON public.zoom_token_refresh_log
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update token refresh logs" ON public.zoom_token_refresh_log
    FOR UPDATE USING (true);

-- Create RLS policies for zoom_sync_logs
CREATE POLICY "Users can view their own sync logs" ON public.zoom_sync_logs
    FOR SELECT USING (
        connection_id IN (
            SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create sync logs for their connections" ON public.zoom_sync_logs
    FOR INSERT WITH CHECK (
        connection_id IN (
            SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage sync logs" ON public.zoom_sync_logs
    FOR ALL USING (true);

-- Create RLS policies for zoom_webinars
CREATE POLICY "Users can view webinars from their connections" ON public.zoom_webinars
    FOR SELECT USING (
        connection_id IN (
            SELECT id FROM public.zoom_connections WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage webinars" ON public.zoom_webinars
    FOR ALL USING (true);

-- Add trigger for updated_at columns
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at
CREATE TRIGGER update_zoom_credentials_updated_at
    BEFORE UPDATE ON public.zoom_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_zoom_connections_updated_at
    BEFORE UPDATE ON public.zoom_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_zoom_sync_logs_updated_at
    BEFORE UPDATE ON public.zoom_sync_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_zoom_webinars_updated_at
    BEFORE UPDATE ON public.zoom_webinars
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add profiles table updates for Zoom-related fields if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_zoom_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_zoom_admin BOOLEAN DEFAULT false;
    END IF;
END $$;
