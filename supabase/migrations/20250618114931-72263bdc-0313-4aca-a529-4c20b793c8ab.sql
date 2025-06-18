
-- Create pagination tokens table for secure token management
CREATE TABLE pagination_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    data_hash TEXT NOT NULL,
    webinar_id UUID REFERENCES zoom_webinars(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query_params JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimal performance
CREATE INDEX idx_pagination_tokens_token ON pagination_tokens(token);
CREATE INDEX idx_pagination_tokens_expires_at ON pagination_tokens(expires_at);
CREATE INDEX idx_pagination_tokens_user_webinar ON pagination_tokens(user_id, webinar_id);
CREATE INDEX idx_pagination_tokens_data_hash ON pagination_tokens(data_hash);

-- Add comments for documentation
COMMENT ON TABLE pagination_tokens IS 'Stores pagination tokens for Zoom API requests with 15-minute expiration';
COMMENT ON COLUMN pagination_tokens.token IS 'Secure token for pagination state management';
COMMENT ON COLUMN pagination_tokens.data_hash IS 'Hash of query parameters for validation';
COMMENT ON COLUMN pagination_tokens.query_params IS 'Stored query parameters for pagination continuation';
COMMENT ON COLUMN pagination_tokens.expires_at IS 'Token expiration time (15 minutes from creation)';

-- Function to cleanup expired tokens (called by cron job or trigger)
CREATE OR REPLACE FUNCTION cleanup_expired_pagination_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM pagination_tokens 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
