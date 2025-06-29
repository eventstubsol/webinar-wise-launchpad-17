-- Migration to fix participant sessions handling
-- This allows storing multiple join/leave sessions per participant

-- First, remove the problematic unique constraint
DROP INDEX IF EXISTS zoom_participants_unique_constraint;

-- Add a session_id to track individual join/leave sessions
ALTER TABLE zoom_participants 
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS is_primary_session BOOLEAN DEFAULT false;

-- Create a computed unique session ID for existing records
UPDATE zoom_participants 
SET session_id = CONCAT(
  COALESCE(participant_uuid, ''), 
  '_', 
  COALESCE(join_time::text, ''),
  '_',
  COALESCE(duration::text, '0')
)
WHERE session_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_zoom_participants_session 
ON zoom_participants(webinar_id, participant_uuid, join_time);

-- Create a view that aggregates participant sessions
CREATE OR REPLACE VIEW zoom_participant_aggregated AS
WITH participant_sessions AS (
  SELECT 
    p.webinar_id,
    w.topic as webinar_topic,
    w.start_time as webinar_start_time,
    COALESCE(p.participant_email, p.email) as email,
    COALESCE(p.participant_name, p.name) as name,
    p.participant_uuid,
    COUNT(*) as session_count,
    SUM(p.duration) as total_duration_seconds,
    MIN(p.join_time) as first_join_time,
    MAX(p.leave_time) as last_leave_time,
    AVG(p.duration) as avg_session_duration,
    MAX(p.duration) as longest_session_duration,
    ARRAY_AGG(
      json_build_object(
        'session_id', p.session_id,
        'join_time', p.join_time,
        'leave_time', p.leave_time,
        'duration', p.duration,
        'device', p.device,
        'location', p.location
      ) ORDER BY p.join_time
    ) as all_sessions
  FROM zoom_participants p
  JOIN zoom_webinars w ON p.webinar_id = w.id
  GROUP BY 
    p.webinar_id, 
    w.topic, 
    w.start_time,
    p.participant_uuid,
    COALESCE(p.participant_email, p.email),
    COALESCE(p.participant_name, p.name)
)
SELECT 
  *,
  ROUND(total_duration_seconds / 60.0, 2) as total_duration_minutes,
  ROUND(total_duration_seconds / 3600.0, 2) as total_duration_hours,
  CASE 
    WHEN total_duration_seconds > 0 AND webinar_start_time IS NOT NULL THEN
      ROUND((total_duration_seconds::NUMERIC / EXTRACT(EPOCH FROM (webinar_start_time + INTERVAL '90 minutes' - webinar_start_time))) * 100, 2)
    ELSE 0
  END as attendance_percentage
FROM participant_sessions;

-- Create a function to properly sync participant sessions
CREATE OR REPLACE FUNCTION sync_participant_sessions(
  p_webinar_id UUID,
  p_participants JSONB
) RETURNS void AS $$
DECLARE
  v_participant JSONB;
  v_session_id TEXT;
BEGIN
  -- Clear existing participants for this webinar
  DELETE FROM zoom_participants WHERE webinar_id = p_webinar_id;
  
  -- Insert all participant sessions
  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    -- Generate unique session ID
    v_session_id := CONCAT(
      COALESCE(v_participant->>'user_id', v_participant->>'id', gen_random_uuid()::text),
      '_',
      COALESCE(v_participant->>'join_time', NOW()::text),
      '_',
      COALESCE(v_participant->>'duration', '0')
    );
    
    INSERT INTO zoom_participants (
      webinar_id,
      session_id,
      participant_uuid,
      participant_id,
      participant_email,
      participant_name,
      participant_user_id,
      name,
      email,
      user_id,
      registrant_id,
      join_time,
      leave_time,
      duration,
      attentiveness_score,
      customer_key,
      location,
      city,
      country,
      network_type,
      device,
      ip_address,
      posted_chat,
      raised_hand,
      answered_polling,
      asked_question,
      camera_on_duration,
      share_application_duration,
      share_desktop_duration,
      share_whiteboard_duration,
      status,
      participant_status,
      failover,
      created_at,
      updated_at
    ) VALUES (
      p_webinar_id,
      v_session_id,
      COALESCE(
        v_participant->>'participant_user_id',
        v_participant->>'user_id',
        v_participant->>'id',
        v_session_id
      ),
      COALESCE(v_participant->>'id', v_participant->>'participant_id'),
      COALESCE(v_participant->>'email', v_participant->>'user_email'),
      COALESCE(v_participant->>'name', v_participant->>'display_name'),
      v_participant->>'user_id',
      COALESCE(v_participant->>'name', v_participant->>'display_name'),
      COALESCE(v_participant->>'email', v_participant->>'user_email'),
      v_participant->>'user_id',
      v_participant->>'registrant_id',
      (v_participant->>'join_time')::timestamptz,
      (v_participant->>'leave_time')::timestamptz,
      COALESCE((v_participant->>'duration')::integer, 0),
      (v_participant->>'attentiveness_score')::integer,
      v_participant->>'customer_key',
      COALESCE(v_participant->>'location', v_participant->>'city'),
      v_participant->>'city',
      v_participant->>'country',
      v_participant->>'network_type',
      v_participant->>'device',
      v_participant->>'ip_address',
      COALESCE((v_participant->>'posted_chat')::boolean, false),
      COALESCE((v_participant->>'raised_hand')::boolean, false),
      COALESCE((v_participant->>'answered_polling')::boolean, false),
      COALESCE((v_participant->>'asked_question')::boolean, false),
      COALESCE((v_participant->>'camera_on_duration')::integer, 0),
      COALESCE((v_participant->>'share_application_duration')::integer, 0),
      COALESCE((v_participant->>'share_desktop_duration')::integer, 0),
      COALESCE((v_participant->>'share_whiteboard_duration')::integer, 0),
      COALESCE(v_participant->>'status', 'joined'),
      'in_meeting',
      COALESCE((v_participant->>'failover')::boolean, false),
      NOW(),
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update comments
COMMENT ON TABLE zoom_participants IS 'Stores all participant sessions from Zoom webinars. Each row represents a single join/leave session. Participants who rejoin will have multiple rows.';
COMMENT ON COLUMN zoom_participants.session_id IS 'Unique identifier for each join/leave session';
COMMENT ON VIEW zoom_participant_aggregated IS 'Aggregated view of participants showing total time attended across all sessions';