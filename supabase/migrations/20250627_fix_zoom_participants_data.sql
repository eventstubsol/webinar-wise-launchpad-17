-- Migration to fix zoom participants data issues and optimize queries
-- This migration addresses NULL/empty data issues identified in the zoom_participants table

-- Add unique constraint to prevent duplicate participants
ALTER TABLE zoom_participants 
DROP CONSTRAINT IF EXISTS zoom_participants_unique_constraint;

ALTER TABLE zoom_participants 
ADD CONSTRAINT zoom_participants_unique_constraint 
UNIQUE (webinar_id, participant_uuid);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_id 
ON zoom_participants(webinar_id);

CREATE INDEX IF NOT EXISTS idx_zoom_participants_email 
ON zoom_participants(participant_email) 
WHERE participant_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_zoom_participants_created_at 
ON zoom_participants(created_at DESC);

-- Add function to merge participant data from different sources
CREATE OR REPLACE FUNCTION merge_participant_data(
  p_webinar_id UUID,
  p_participant_uuid TEXT,
  p_data JSONB
) RETURNS void AS $$
BEGIN
  INSERT INTO zoom_participants (
    webinar_id,
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
    session_sequence,
    is_rejoin_session,
    participant_session_id,
    created_at,
    updated_at
  ) VALUES (
    p_webinar_id,
    p_participant_uuid,
    COALESCE(p_data->>'participant_id', p_data->>'id', p_data->>'registrant_id'),
    COALESCE(p_data->>'participant_email', p_data->>'email', p_data->>'user_email'),
    COALESCE(p_data->>'participant_name', p_data->>'name', p_data->>'display_name', p_data->>'user_name'),
    p_data->>'participant_user_id',
    -- Legacy columns
    COALESCE(p_data->>'name', p_data->>'display_name', p_data->>'user_name'),
    COALESCE(p_data->>'email', p_data->>'user_email'),
    p_data->>'user_id',
    p_data->>'registrant_id',
    -- Time fields
    (p_data->>'join_time')::timestamptz,
    (p_data->>'leave_time')::timestamptz,
    COALESCE((p_data->>'duration')::integer, 0),
    -- Advanced metrics
    (p_data->>'attentiveness_score')::integer,
    p_data->>'customer_key',
    COALESCE(p_data->>'location', p_data->>'city'),
    p_data->>'city',
    p_data->>'country',
    p_data->>'network_type',
    p_data->>'device',
    p_data->>'ip_address',
    -- Engagement metrics
    COALESCE((p_data->>'posted_chat')::boolean, false),
    COALESCE((p_data->>'raised_hand')::boolean, false),
    COALESCE((p_data->>'answered_polling')::boolean, false),
    COALESCE((p_data->>'asked_question')::boolean, false),
    COALESCE((p_data->>'camera_on_duration')::integer, 0),
    COALESCE((p_data->>'share_application_duration')::integer, 0),
    COALESCE((p_data->>'share_desktop_duration')::integer, 0),
    COALESCE((p_data->>'share_whiteboard_duration')::integer, 0),
    -- Status
    COALESCE(p_data->>'status', 'joined'),
    COALESCE(p_data->>'participant_status', 'in_meeting'),
    COALESCE((p_data->>'failover')::boolean, false),
    -- Session info
    COALESCE((p_data->>'session_sequence')::integer, 1),
    COALESCE((p_data->>'is_rejoin_session')::boolean, false),
    p_data->>'participant_session_id',
    NOW(),
    NOW()
  )
  ON CONFLICT (webinar_id, participant_uuid) 
  DO UPDATE SET
    participant_email = COALESCE(EXCLUDED.participant_email, zoom_participants.participant_email),
    participant_name = COALESCE(EXCLUDED.participant_name, zoom_participants.participant_name),
    email = COALESCE(EXCLUDED.email, zoom_participants.email),
    name = COALESCE(EXCLUDED.name, zoom_participants.name),
    duration = GREATEST(EXCLUDED.duration, zoom_participants.duration),
    attentiveness_score = COALESCE(EXCLUDED.attentiveness_score, zoom_participants.attentiveness_score),
    location = COALESCE(EXCLUDED.location, zoom_participants.location),
    city = COALESCE(EXCLUDED.city, zoom_participants.city),
    country = COALESCE(EXCLUDED.country, zoom_participants.country),
    device = COALESCE(EXCLUDED.device, zoom_participants.device),
    ip_address = COALESCE(EXCLUDED.ip_address, zoom_participants.ip_address),
    network_type = COALESCE(EXCLUDED.network_type, zoom_participants.network_type),
    posted_chat = EXCLUDED.posted_chat OR zoom_participants.posted_chat,
    raised_hand = EXCLUDED.raised_hand OR zoom_participants.raised_hand,
    answered_polling = EXCLUDED.answered_polling OR zoom_participants.answered_polling,
    asked_question = EXCLUDED.asked_question OR zoom_participants.asked_question,
    camera_on_duration = GREATEST(EXCLUDED.camera_on_duration, zoom_participants.camera_on_duration),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create view for cleaned participant data
CREATE OR REPLACE VIEW zoom_participants_clean AS
SELECT 
  p.id,
  p.webinar_id,
  w.topic as webinar_topic,
  w.start_time as webinar_start_time,
  p.participant_uuid,
  COALESCE(p.participant_email, p.email) as email,
  COALESCE(p.participant_name, p.name) as name,
  p.join_time,
  p.leave_time,
  p.duration,
  p.attentiveness_score,
  p.location,
  p.city,
  p.country,
  p.device,
  p.posted_chat,
  p.raised_hand,
  p.answered_polling,
  p.asked_question,
  p.camera_on_duration,
  p.status,
  p.created_at,
  p.updated_at
FROM zoom_participants p
JOIN zoom_webinars w ON p.webinar_id = w.id;

-- Add comment explaining the data limitations
COMMENT ON TABLE zoom_participants IS 'Stores webinar participant data from Zoom API. Note: Many fields like email, device info, and engagement metrics may be NULL due to Zoom API limitations and privacy settings.';

COMMENT ON COLUMN zoom_participants.participant_email IS 'Participant email - often NULL due to Zoom privacy settings unless participant is registered';
COMMENT ON COLUMN zoom_participants.attentiveness_score IS 'Engagement score - only available with certain Zoom licenses and API endpoints';
COMMENT ON COLUMN zoom_participants.device IS 'Device information - only available from detailed report endpoints';
COMMENT ON COLUMN zoom_participants.ip_address IS 'IP address - only available from detailed report endpoints and may be hidden for privacy';
