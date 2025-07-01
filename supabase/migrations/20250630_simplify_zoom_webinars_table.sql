-- Migration to simplify zoom_webinars table to match Zoom API exactly
-- This creates a clean structure that maps 1:1 with Zoom API responses

-- First, backup existing data
CREATE TABLE IF NOT EXISTS zoom_webinars_backup AS SELECT * FROM zoom_webinars;

-- Drop existing table (after backup)
DROP TABLE IF EXISTS zoom_webinars CASCADE;

-- Create simplified table matching Zoom API structure
CREATE TABLE zoom_webinars (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relationship to connection
  connection_id UUID NOT NULL REFERENCES zoom_connections(id) ON DELETE CASCADE,
  
  -- Core Zoom fields (from API)
  zoom_webinar_id TEXT NOT NULL, -- Zoom's webinar ID
  uuid TEXT, -- Zoom's UUID for the webinar instance
  host_id TEXT NOT NULL,
  host_email TEXT NOT NULL,
  topic TEXT NOT NULL,
  type INTEGER DEFAULT 5, -- 5=webinar, 6=recurring no fixed time, 9=recurring fixed time
  start_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  timezone TEXT NOT NULL,
  agenda TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- URLs
  start_url TEXT,
  join_url TEXT NOT NULL,
  registration_url TEXT,
  
  -- Authentication
  password TEXT,
  h323_password TEXT,
  pstn_password TEXT,
  encrypted_password TEXT,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('waiting', 'started', 'ended', 'scheduled', 'upcoming', 'finished')),
  
  -- JSON fields for complex data
  settings JSONB DEFAULT '{}',
  recurrence JSONB,
  occurrences JSONB,
  tracking_fields JSONB DEFAULT '[]',
  
  -- Metrics (from API or calculated)
  registrants_count INTEGER DEFAULT 0,
  
  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(connection_id, zoom_webinar_id)
);

-- Create indexes for performance
CREATE INDEX idx_zoom_webinars_connection_id ON zoom_webinars(connection_id);
CREATE INDEX idx_zoom_webinars_zoom_webinar_id ON zoom_webinars(zoom_webinar_id);
CREATE INDEX idx_zoom_webinars_start_time ON zoom_webinars(start_time);
CREATE INDEX idx_zoom_webinars_status ON zoom_webinars(status);

-- Enable RLS
ALTER TABLE zoom_webinars ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view webinars from their connections" ON zoom_webinars
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM zoom_connections WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_zoom_webinars_updated_at
  BEFORE UPDATE ON zoom_webinars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate data from backup (only essential fields)
INSERT INTO zoom_webinars (
  id,
  connection_id,
  zoom_webinar_id,
  uuid,
  host_id,
  host_email,
  topic,
  type,
  start_time,
  duration,
  timezone,
  agenda,
  created_at,
  start_url,
  join_url,
  registration_url,
  password,
  h323_password,
  pstn_password,
  encrypted_password,
  status,
  settings,
  recurrence,
  occurrences,
  tracking_fields,
  registrants_count,
  synced_at,
  updated_at
)
SELECT 
  id,
  connection_id,
  zoom_webinar_id,
  uuid,
  host_id,
  host_email,
  topic,
  COALESCE(type, 5),
  start_time,
  duration,
  timezone,
  agenda,
  COALESCE(webinar_created_at, created_at),
  start_url,
  join_url,
  registration_url,
  password,
  h323_password,
  pstn_password,
  encrypted_password,
  status,
  COALESCE(settings, '{}'),
  recurrence,
  occurrences,
  COALESCE(tracking_fields, '[]'),
  COALESCE(total_registrants, 0),
  COALESCE(last_synced_at, synced_at),
  updated_at
FROM zoom_webinars_backup
ON CONFLICT (connection_id, zoom_webinar_id) DO NOTHING;

-- Create a separate table for webinar metrics (calculated data)
CREATE TABLE webinar_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID NOT NULL REFERENCES zoom_webinars(id) ON DELETE CASCADE,
  
  -- Participant counts
  total_attendees INTEGER DEFAULT 0,
  unique_attendees INTEGER DEFAULT 0,
  total_absentees INTEGER DEFAULT 0,
  actual_participant_count INTEGER DEFAULT 0,
  
  -- Time metrics
  total_minutes INTEGER DEFAULT 0,
  avg_attendance_duration INTEGER DEFAULT 0,
  
  -- Sync status
  participant_sync_status TEXT DEFAULT 'pending',
  participant_sync_attempted_at TIMESTAMPTZ,
  participant_sync_completed_at TIMESTAMPTZ,
  participant_sync_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(webinar_id)
);

-- Enable RLS on metrics table
ALTER TABLE webinar_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for metrics
CREATE POLICY "Users can view metrics for their webinars" ON webinar_metrics
  FOR ALL USING (
    webinar_id IN (
      SELECT w.id FROM zoom_webinars w
      JOIN zoom_connections c ON w.connection_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Create trigger for metrics updated_at
CREATE TRIGGER update_webinar_metrics_updated_at
  BEFORE UPDATE ON webinar_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate metrics data from backup
INSERT INTO webinar_metrics (
  webinar_id,
  total_attendees,
  unique_attendees,
  total_absentees,
  actual_participant_count,
  total_minutes,
  avg_attendance_duration,
  participant_sync_status,
  participant_sync_attempted_at,
  participant_sync_completed_at,
  participant_sync_error
)
SELECT 
  id,
  COALESCE(total_attendees, 0),
  COALESCE(unique_participant_count, total_attendees, 0),
  COALESCE(total_absentees, 0),
  COALESCE(actual_participant_count, 0),
  COALESCE(total_minutes, 0),
  COALESCE(avg_attendance_duration, 0),
  COALESCE(participant_sync_status, 'pending'),
  participant_sync_attempted_at,
  participant_sync_completed_at,
  participant_sync_error
FROM zoom_webinars_backup
ON CONFLICT (webinar_id) DO NOTHING;

-- Update zoom_participants foreign key to use new table
ALTER TABLE zoom_participants 
  DROP CONSTRAINT IF EXISTS zoom_participants_webinar_id_fkey;

ALTER TABLE zoom_participants 
  ADD CONSTRAINT zoom_participants_webinar_id_fkey 
  FOREIGN KEY (webinar_id) 
  REFERENCES zoom_webinars(id) 
  ON DELETE CASCADE;

-- Add comment to table
COMMENT ON TABLE zoom_webinars IS 'Simplified Zoom webinar data matching API structure exactly';
COMMENT ON TABLE webinar_metrics IS 'Calculated metrics and sync status for webinars';
