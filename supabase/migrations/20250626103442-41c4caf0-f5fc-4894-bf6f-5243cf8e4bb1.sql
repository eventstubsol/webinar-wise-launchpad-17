
-- Fix RLS policies to work properly with Service Role access

-- First, let's check and fix the zoom_connections policies
DROP POLICY IF EXISTS "Users can insert their own zoom connections" ON public.zoom_connections;
DROP POLICY IF EXISTS "Users can view their own zoom connections" ON public.zoom_connections;
DROP POLICY IF EXISTS "Users can update their own zoom connections" ON public.zoom_connections;
DROP POLICY IF EXISTS "Users can delete their own zoom connections" ON public.zoom_connections;

-- Create new policies that work with both authenticated users and service role
CREATE POLICY "Users can view their own zoom connections" 
    ON public.zoom_connections 
    FOR SELECT 
    USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Users can insert their own zoom connections" 
    ON public.zoom_connections 
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Users can update their own zoom connections" 
    ON public.zoom_connections 
    FOR UPDATE 
    USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Users can delete their own zoom connections" 
    ON public.zoom_connections 
    FOR DELETE 
    USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Fix zoom_credentials policies
DROP POLICY IF EXISTS "Users can view their own zoom credentials" ON public.zoom_credentials;
DROP POLICY IF EXISTS "Users can create their own zoom credentials" ON public.zoom_credentials;  
DROP POLICY IF EXISTS "Users can update their own zoom credentials" ON public.zoom_credentials;
DROP POLICY IF EXISTS "Users can delete their own zoom credentials" ON public.zoom_credentials;

CREATE POLICY "Users can view their own zoom credentials" 
    ON public.zoom_credentials 
    FOR SELECT 
    USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Users can create their own zoom credentials" 
    ON public.zoom_credentials 
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Users can update their own zoom credentials" 
    ON public.zoom_credentials 
    FOR UPDATE 
    USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Users can delete their own zoom credentials" 
    ON public.zoom_credentials 
    FOR DELETE 
    USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Fix zoom_sync_logs policies to allow service role access
DROP POLICY IF EXISTS "Users can view their own sync logs" ON public.zoom_sync_logs;
DROP POLICY IF EXISTS "Users can create sync logs" ON public.zoom_sync_logs;
DROP POLICY IF EXISTS "Users can update sync logs" ON public.zoom_sync_logs;

CREATE POLICY "Service role and users can manage sync logs" 
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

-- Ensure the zoom_webinars table also allows service role access
ALTER TABLE public.zoom_webinars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage webinars" ON public.zoom_webinars;

CREATE POLICY "Service role can manage webinars" 
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
