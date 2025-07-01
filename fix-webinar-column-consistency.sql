-- Fix webinar data consistency issues
-- This migration ensures all webinars have proper zoom_webinar_id values

-- First, check if there are any webinars with webinar_id but missing zoom_webinar_id
UPDATE zoom_webinars 
SET zoom_webinar_id = webinar_id 
WHERE zoom_webinar_id IS NULL 
  AND webinar_id IS NOT NULL;

-- Ensure zoom_webinar_id is always populated for new records
UPDATE zoom_webinars 
SET zoom_webinar_id = COALESCE(zoom_webinar_id, webinar_id, uuid::text)
WHERE zoom_webinar_id IS NULL;

-- Add NOT NULL constraint to zoom_webinar_id if not already present
ALTER TABLE zoom_webinars 
ALTER COLUMN zoom_webinar_id SET NOT NULL;

-- Create unique index if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_zoom_webinars_connection_zoom_id 
ON zoom_webinars(connection_id, zoom_webinar_id);

-- Drop the old unique constraint if it exists on webinar_id
ALTER TABLE zoom_webinars 
DROP CONSTRAINT IF EXISTS zoom_webinars_connection_id_webinar_id_key;

-- Verify the fix
SELECT 
  COUNT(*) as total_webinars,
  COUNT(zoom_webinar_id) as with_zoom_id,
  COUNT(webinar_id) as with_webinar_id,
  COUNT(CASE WHEN zoom_webinar_id IS NULL THEN 1 END) as missing_zoom_id
FROM zoom_webinars;
