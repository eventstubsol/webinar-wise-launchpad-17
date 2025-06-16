
-- Update zoom_connections table to properly handle Server-to-Server OAuth
ALTER TABLE zoom_connections 
ADD COLUMN IF NOT EXISTS connection_type TEXT DEFAULT 'oauth',
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS client_secret TEXT,
ADD COLUMN IF NOT EXISTS account_id TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_zoom_connections_connection_type ON zoom_connections(connection_type);

-- Create table for Server-to-Server token cache
CREATE TABLE IF NOT EXISTS zoom_server_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES zoom_connections(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for token cache table
CREATE INDEX IF NOT EXISTS idx_zoom_server_tokens_connection_id ON zoom_server_tokens(connection_id);
CREATE INDEX IF NOT EXISTS idx_zoom_server_tokens_expires_at ON zoom_server_tokens(expires_at);

-- Update existing Server-to-Server connections
UPDATE zoom_connections 
SET connection_type = 'server_to_server'
WHERE access_token LIKE '%SERVER_TO_SERVER_%' OR zoom_account_type = 'Server-to-Server';

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_zoom_server_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_update_zoom_server_tokens_updated_at ON zoom_server_tokens;
CREATE TRIGGER trigger_update_zoom_server_tokens_updated_at
    BEFORE UPDATE ON zoom_server_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_zoom_server_tokens_updated_at();
