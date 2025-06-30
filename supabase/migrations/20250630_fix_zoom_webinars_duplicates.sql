-- Fix duplicate columns in zoom_webinars table
-- This migration consolidates duplicate columns and ensures proper data mapping

-- First, let's update data from duplicate columns before dropping them
UPDATE zoom_webinars
SET 
  -- Consolidate webinar ID columns (use zoom_webinar_id as primary)
  zoom_webinar_id = COALESCE(zoom_webinar_id, webinar_id),
  
  -- Consolidate UUID columns (use uuid as primary)
  uuid = COALESCE(uuid, webinar_uuid, zoom_uuid),
  
  -- Consolidate type columns (use type as primary)
  type = COALESCE(type, webinar_type),
  
  -- Consolidate password columns (use password as primary)
  password = COALESCE(password, webinar_passcode),
  
  -- Consolidate simulive columns (use is_simulive as primary)
  is_simulive = COALESCE(is_simulive, simulive)
WHERE 
  zoom_webinar_id IS NULL OR
  uuid IS NULL OR 
  type IS NULL OR
  password IS NULL OR
  is_simulive IS NULL;

-- Drop duplicate columns
ALTER TABLE zoom_webinars 
DROP COLUMN IF EXISTS webinar_id,
DROP COLUMN IF EXISTS webinar_uuid,
DROP COLUMN IF EXISTS zoom_uuid,
DROP COLUMN IF EXISTS webinar_type,
DROP COLUMN IF EXISTS webinar_passcode,
DROP COLUMN IF EXISTS simulive,
DROP COLUMN IF EXISTS h323_passcode,
DROP COLUMN IF EXISTS h323_password,
DROP COLUMN IF EXISTS pstn_password,
DROP COLUMN IF EXISTS encrypted_password,
DROP COLUMN IF EXISTS encrypted_passcode;

-- Add missing columns that should exist according to Zoom API
ALTER TABLE zoom_webinars
ADD COLUMN IF NOT EXISTS h323_password TEXT,
ADD COLUMN IF NOT EXISTS pstn_password TEXT,
ADD COLUMN IF NOT EXISTS encrypted_password TEXT,
ADD COLUMN IF NOT EXISTS allow_multiple_devices BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS alternative_hosts_email_notification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_share_button BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_multiple_view_on_same_device BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_notification BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS host_save_video_order BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_dedicated_pin_for_all_panelists BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sign_language_interpretation JSONB,
ADD COLUMN IF NOT EXISTS global_dial_in_countries TEXT[],
ADD COLUMN IF NOT EXISTS global_dial_in_numbers JSONB,
ADD COLUMN IF NOT EXISTS registrants_restrict_by_domain TEXT,
ADD COLUMN IF NOT EXISTS meeting_authentication BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS add_watermark BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS add_audio_watermark BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS audio_conferencing JSONB,
ADD COLUMN IF NOT EXISTS cloud_recording JSONB,
ADD COLUMN IF NOT EXISTS language_interpretation JSONB;

-- Update status for past webinars where start_time is in the past
UPDATE zoom_webinars
SET status = 'ended'
WHERE start_time < NOW() 
AND status NOT IN ('ended', 'finished');

-- Add check constraint for status
ALTER TABLE zoom_webinars
DROP CONSTRAINT IF EXISTS valid_webinar_status;

ALTER TABLE zoom_webinars
ADD CONSTRAINT valid_webinar_status 
CHECK (status IN ('waiting', 'started', 'ended', 'scheduled', 'upcoming'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_status ON zoom_webinars(status);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_start_time ON zoom_webinars(start_time);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_uuid ON zoom_webinars(uuid);

-- Update the unique constraint to ensure no duplicates
ALTER TABLE zoom_webinars DROP CONSTRAINT IF EXISTS zoom_webinars_connection_id_zoom_webinar_id_key;
ALTER TABLE zoom_webinars ADD CONSTRAINT zoom_webinars_connection_id_zoom_webinar_id_key UNIQUE(connection_id, zoom_webinar_id);

-- Add a trigger to update the status based on start_time
CREATE OR REPLACE FUNCTION update_webinar_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If start_time is in the past and status is not 'ended', update it
  IF NEW.start_time < NOW() AND NEW.status NOT IN ('ended', 'finished') THEN
    NEW.status := 'ended';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_webinar_status_trigger ON zoom_webinars;
CREATE TRIGGER update_webinar_status_trigger
BEFORE INSERT OR UPDATE ON zoom_webinars
FOR EACH ROW
EXECUTE FUNCTION update_webinar_status();

-- Update updated_at timestamp
UPDATE zoom_webinars SET updated_at = NOW();
