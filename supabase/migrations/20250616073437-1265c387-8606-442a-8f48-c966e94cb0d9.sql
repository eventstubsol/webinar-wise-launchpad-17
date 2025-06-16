
-- Add missing columns to zoom_webinars table based on Zoom API schema
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS start_url TEXT,
ADD COLUMN IF NOT EXISTS encrypted_passcode TEXT,
ADD COLUMN IF NOT EXISTS creation_source TEXT,
ADD COLUMN IF NOT EXISTS is_simulive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS record_file_id TEXT,
ADD COLUMN IF NOT EXISTS transition_to_live BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS webinar_created_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_creation_source ON zoom_webinars(creation_source);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_is_simulive ON zoom_webinars(is_simulive);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_webinar_created_at ON zoom_webinars(webinar_created_at);

-- Update any existing webinars to have default values for new boolean fields
UPDATE zoom_webinars 
SET is_simulive = COALESCE(is_simulive, FALSE),
    transition_to_live = COALESCE(transition_to_live, FALSE)
WHERE is_simulive IS NULL OR transition_to_live IS NULL;
