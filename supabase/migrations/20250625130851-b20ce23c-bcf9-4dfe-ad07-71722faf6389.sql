
-- Add missing fields to zoom_webinars table based on Zoom API documentation
ALTER TABLE zoom_webinars 
-- Core identification fields
ADD COLUMN IF NOT EXISTS uuid TEXT,
ADD COLUMN IF NOT EXISTS occurrence_id TEXT,

-- Creation and timing fields  
ADD COLUMN IF NOT EXISTS webinar_created_at TIMESTAMP WITH TIME ZONE,

-- Access and security fields
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS encrypted_passcode TEXT,
ADD COLUMN IF NOT EXISTS h323_passcode TEXT,
ADD COLUMN IF NOT EXISTS start_url TEXT,

-- Registration and approval fields
ADD COLUMN IF NOT EXISTS approval_type INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS registration_type INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS registrants_restrict_number INTEGER DEFAULT 0,

-- Simulive and special features
ADD COLUMN IF NOT EXISTS is_simulive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS record_file_id TEXT,
ADD COLUMN IF NOT EXISTS transition_to_live BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS creation_source TEXT,

-- JSONB fields for complex objects
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS recurrence JSONB,
ADD COLUMN IF NOT EXISTS occurrences JSONB,
ADD COLUMN IF NOT EXISTS tracking_fields JSONB DEFAULT '[]'::jsonb,

-- Computed analytics fields (will be calculated from registrants/participants)
ADD COLUMN IF NOT EXISTS total_registrants INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_attendees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_absentees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_attendance_duration INTEGER DEFAULT 0,

-- Additional tracking fields
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS attendees_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS registrants_count INTEGER DEFAULT 0;

-- Create indexes for performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_uuid ON zoom_webinars(uuid);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_occurrence_id ON zoom_webinars(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_creation_source ON zoom_webinars(creation_source);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_is_simulive ON zoom_webinars(is_simulive);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_webinar_created_at ON zoom_webinars(webinar_created_at);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_last_synced_at ON zoom_webinars(last_synced_at);

-- Create indexes on JSONB fields for better query performance
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_settings_gin ON zoom_webinars USING GIN (settings);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_tracking_fields_gin ON zoom_webinars USING GIN (tracking_fields);

-- Update existing webinars to have default values for new boolean fields
UPDATE zoom_webinars 
SET 
  is_simulive = COALESCE(is_simulive, FALSE),
  transition_to_live = COALESCE(transition_to_live, FALSE),
  settings = COALESCE(settings, '{}'::jsonb),
  tracking_fields = COALESCE(tracking_fields, '[]'::jsonb),
  total_registrants = COALESCE(total_registrants, 0),
  total_attendees = COALESCE(total_attendees, 0),
  total_absentees = COALESCE(total_absentees, 0),
  total_minutes = COALESCE(total_minutes, 0),
  avg_attendance_duration = COALESCE(avg_attendance_duration, 0),
  attendees_count = COALESCE(attendees_count, 0),
  registrants_count = COALESCE(registrants_count, 0),
  last_synced_at = COALESCE(last_synced_at, now())
WHERE 
  is_simulive IS NULL OR 
  transition_to_live IS NULL OR 
  settings IS NULL OR 
  tracking_fields IS NULL OR
  total_registrants IS NULL OR
  total_attendees IS NULL OR
  total_absentees IS NULL OR
  total_minutes IS NULL OR
  avg_attendance_duration IS NULL OR
  attendees_count IS NULL OR
  registrants_count IS NULL OR
  last_synced_at IS NULL;
