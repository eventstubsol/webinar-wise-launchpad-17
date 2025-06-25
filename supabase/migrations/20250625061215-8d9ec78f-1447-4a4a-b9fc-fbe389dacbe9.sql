
-- First, let's fix the zoom_credentials table to match what the code expects
ALTER TABLE zoom_credentials 
ADD COLUMN IF NOT EXISTS app_name text,
ADD COLUMN IF NOT EXISTS description text;

-- Update the zoom_credentials table to have proper defaults
ALTER TABLE zoom_credentials 
ALTER COLUMN app_name SET DEFAULT 'Zoom Server-to-Server OAuth App';

-- Make sure we have proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_zoom_credentials_user_active ON zoom_credentials(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_zoom_connections_user_primary ON zoom_connections(user_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_zoom_sync_logs_connection ON zoom_sync_logs(connection_id, created_at);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection ON zoom_webinars(connection_id, start_time);

-- Add RLS policies for zoom_credentials if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'zoom_credentials' 
    AND policyname = 'Users can manage their own credentials'
  ) THEN
    ALTER TABLE zoom_credentials ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own credentials" ON zoom_credentials
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add RLS policies for zoom_connections if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'zoom_connections' 
    AND policyname = 'Users can manage their own connections'
  ) THEN
    ALTER TABLE zoom_connections ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own connections" ON zoom_connections
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add RLS policies for zoom_webinars if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'zoom_webinars' 
    AND policyname = 'Users can view webinars from their connections'
  ) THEN
    ALTER TABLE zoom_webinars ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view webinars from their connections" ON zoom_webinars
      FOR SELECT USING (
        connection_id IN (
          SELECT id FROM zoom_connections WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add RLS policies for zoom_sync_logs if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'zoom_sync_logs' 
    AND policyname = 'Users can view sync logs from their connections'
  ) THEN
    ALTER TABLE zoom_sync_logs ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view sync logs from their connections" ON zoom_sync_logs
      FOR SELECT USING (
        connection_id IN (
          SELECT id FROM zoom_connections WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
