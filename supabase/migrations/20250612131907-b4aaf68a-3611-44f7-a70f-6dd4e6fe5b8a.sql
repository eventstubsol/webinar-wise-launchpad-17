
-- Create table to store user-specific Zoom OAuth credentials
CREATE TABLE public.zoom_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL, -- This will be encrypted
    app_name TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create partial unique index to ensure one active credential set per user
CREATE UNIQUE INDEX idx_zoom_credentials_user_active 
ON public.zoom_credentials(user_id) 
WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.zoom_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for user access only
CREATE POLICY "Users can view their own zoom credentials" 
    ON public.zoom_credentials 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own zoom credentials" 
    ON public.zoom_credentials 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own zoom credentials" 
    ON public.zoom_credentials 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own zoom credentials" 
    ON public.zoom_credentials 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_zoom_credentials_updated_at
    BEFORE UPDATE ON public.zoom_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
