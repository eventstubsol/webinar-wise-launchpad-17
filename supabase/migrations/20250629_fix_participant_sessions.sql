-- Migration to properly handle Zoom participants with multiple sessions
-- This addresses the issue of missing participants and multiple rejoin tracking

-- First, create a table to track individual participant sessions
CREATE TABLE IF NOT EXISTS zoom_participant_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES zoom_participants(id) ON DELETE CASCADE,
  webinar_id UUID REFERENCES zoom_webinars(id) ON DELETE CASCADE,
  session_id TEXT, -- Zoom's session identifier
  join_time TIMESTAMPTZ,
  leave_time TIMESTAMPTZ,
  duration INTEGER DEFAULT 0, -- Duration in seconds for this session
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, session_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_participant_sessions_participant_id ON zoom_participant_sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_sessions_webinar_id ON zoom_participant_sessions(webinar_id);
CREATE INDEX IF NOT EXISTS idx_participant_sessions_join_time ON zoom_participant_sessions(join_time);

-- Add columns to zoom_participants for aggregated data
ALTER TABLE zoom_participants 
ADD COLUMN IF NOT EXISTS total_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS first_join_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_leave_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_aggregated BOOLEAN DEFAULT FALSE;

-- Function to aggregate participant session data
CREATE OR REPLACE FUNCTION aggregate_participant_sessions(p_participant_id UUID)
RETURNS void AS $$
DECLARE
  v_total_duration INTEGER;
  v_session_count INTEGER;
  v_first_join TIMESTAMPTZ;
  v_last_leave TIMESTAMPTZ;
BEGIN
  SELECT 
    COALESCE(SUM(duration), 0),
    COUNT(*),
    MIN(join_time),
    MAX(leave_time)
  INTO v_total_duration, v_session_count, v_first_join, v_last_leave
  FROM zoom_participant_sessions
  WHERE participant_id = p_participant_id;
  
  UPDATE zoom_participants
  SET 
    total_duration = v_total_duration,
    session_count = v_session_count,
    first_join_time = v_first_join,
    last_leave_time = v_last_leave,
    duration = v_total_duration, -- Update legacy duration field
    join_time = v_first_join,     -- Update legacy join_time
    leave_time = v_last_leave,    -- Update legacy leave_time
    is_aggregated = TRUE,
    updated_at = NOW()
  WHERE id = p_participant_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-aggregate when sessions are inserted/updated
CREATE OR REPLACE FUNCTION trigger_aggregate_sessions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM aggregate_participant_sessions(NEW.participant_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS aggregate_sessions_trigger ON zoom_participant_sessions;
CREATE TRIGGER aggregate_sessions_trigger
AFTER INSERT OR UPDATE ON zoom_participant_sessions
FOR EACH ROW
EXECUTE FUNCTION trigger_aggregate_sessions();

-- Remove the problematic unique constraint that was causing issues
DROP INDEX IF EXISTS zoom_participants_unique_constraint;

-- Create a better constraint that handles empty UUIDs
CREATE UNIQUE INDEX IF NOT EXISTS zoom_participants_unique_constraint_v2
ON zoom_participants(webinar_id, participant_uuid, participant_email, participant_name)
WHERE participant_uuid IS NOT NULL OR participant_email IS NOT NULL;

-- Add detailed tracking columns for better debugging
ALTER TABLE zoom_webinars
ADD COLUMN IF NOT EXISTS actual_participant_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_participant_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_participant_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sync_method TEXT,
ADD COLUMN IF NOT EXISTS last_successful_sync TIMESTAMPTZ;

-- Function to calculate webinar statistics
CREATE OR REPLACE FUNCTION calculate_webinar_stats(p_webinar_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE zoom_webinars
  SET 
    actual_participant_count = (
      SELECT COUNT(DISTINCT p.id) 
      FROM zoom_participants p 
      WHERE p.webinar_id = p_webinar_id
    ),
    unique_participant_count = (
      SELECT COUNT(DISTINCT COALESCE(p.participant_email, p.participant_name, p.participant_uuid))
      FROM zoom_participants p 
      WHERE p.webinar_id = p_webinar_id
    ),
    total_participant_minutes = (
      SELECT COALESCE(SUM(p.total_duration), 0) / 60
      FROM zoom_participants p 
      WHERE p.webinar_id = p_webinar_id
    ),
    updated_at = NOW()
  WHERE id = p_webinar_id;
END;
$$ LANGUAGE plpgsql;

-- Create a view for webinar attendance analytics
CREATE OR REPLACE VIEW webinar_attendance_analytics AS
SELECT 
  w.id,
  w.topic,
  w.start_time,
  w.duration as scheduled_duration,
  w.total_registrants,
  w.total_attendees as api_reported_attendees,
  w.actual_participant_count,
  w.unique_participant_count,
  w.total_participant_minutes,
  CASE 
    WHEN w.total_registrants > 0 
    THEN ROUND((w.actual_participant_count::NUMERIC / w.total_registrants) * 100, 2)
    ELSE 0 
  END as attendance_rate,
  CASE 
    WHEN w.actual_participant_count > 0 
    THEN ROUND((w.total_participant_minutes::NUMERIC / w.actual_participant_count) / 60, 2)
    ELSE 0 
  END as avg_attendance_hours,
  w.participant_sync_status,
  w.last_successful_sync
FROM zoom_webinars w
WHERE w.status IN ('ended', 'completed');

-- Add comments
COMMENT ON TABLE zoom_participant_sessions IS 'Tracks individual join/leave sessions for participants who may rejoin multiple times during a webinar';
COMMENT ON COLUMN zoom_participant_sessions.session_id IS 'Unique session identifier from Zoom, helps track multiple rejoins';
COMMENT ON COLUMN zoom_participants.total_duration IS 'Total time spent across all sessions (in seconds)';
COMMENT ON COLUMN zoom_participants.session_count IS 'Number of times participant joined/rejoined the webinar';
