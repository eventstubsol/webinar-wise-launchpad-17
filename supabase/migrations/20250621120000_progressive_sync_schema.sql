-- Add progress field to zoom_sync_logs if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'zoom_sync_logs' 
        AND column_name = 'progress'
    ) THEN
        ALTER TABLE zoom_sync_logs ADD COLUMN progress jsonb;
    END IF;
END $$;

-- Create index on progress field for real-time updates
CREATE INDEX IF NOT EXISTS idx_zoom_sync_logs_progress ON zoom_sync_logs USING gin(progress);

-- Enable RLS on zoom_sync_logs if not already enabled
ALTER TABLE zoom_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read their own sync logs
CREATE POLICY IF NOT EXISTS "Users can read their own sync logs"
ON zoom_sync_logs
FOR SELECT
TO authenticated
USING (
    connection_id IN (
        SELECT id FROM zoom_connections 
        WHERE user_id = auth.uid()
    )
);

-- Create policy for authenticated users to insert sync logs for their connections
CREATE POLICY IF NOT EXISTS "Users can create sync logs for their connections"
ON zoom_sync_logs
FOR INSERT
TO authenticated
WITH CHECK (
    connection_id IN (
        SELECT id FROM zoom_connections 
        WHERE user_id = auth.uid()
    )
);

-- Create policy for authenticated users to update their own sync logs
CREATE POLICY IF NOT EXISTS "Users can update their own sync logs"
ON zoom_sync_logs
FOR UPDATE
TO authenticated
USING (
    connection_id IN (
        SELECT id FROM zoom_connections 
        WHERE user_id = auth.uid()
    )
);

-- Ensure zoom_webinars has all necessary columns for progressive sync
ALTER TABLE zoom_webinars 
    ALTER COLUMN webinar_id SET NOT NULL,
    ALTER COLUMN webinar_uuid SET NOT NULL,
    ALTER COLUMN topic SET NOT NULL,
    ALTER COLUMN type SET NOT NULL,
    ALTER COLUMN host_id SET NOT NULL,
    ALTER COLUMN connection_id SET NOT NULL;

-- Create a composite unique constraint for webinar_id and connection_id
ALTER TABLE zoom_webinars 
DROP CONSTRAINT IF EXISTS zoom_webinars_webinar_id_connection_id_key;

ALTER TABLE zoom_webinars 
ADD CONSTRAINT zoom_webinars_webinar_id_connection_id_key 
UNIQUE (webinar_id, connection_id);

-- Add index for faster sync queries
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_synced 
ON zoom_webinars(connection_id, synced_at);

-- Add index for status-based queries
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_status_start_time 
ON zoom_webinars(status, start_time) 
WHERE status IN ('scheduled', 'started', 'ended');