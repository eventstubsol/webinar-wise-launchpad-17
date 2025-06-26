
-- Phase 1: Identify and manually clean the specific problematic duplicates
-- First, let's see what we're dealing with for this specific case
WITH problem_records AS (
  SELECT 
    id,
    webinar_id,
    participant_email,
    join_time,
    leave_time,
    duration,
    created_at,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY webinar_id, participant_email, join_time 
      ORDER BY created_at ASC
    ) as row_num
  FROM zoom_participants 
  WHERE webinar_id = 'b8596193-2973-4703-ba4a-dedccee64898'::uuid
    AND participant_email = 'administrator@southcoastpa.com'
    AND join_time = '2025-05-21 18:31:50+00'::timestamp with time zone
)
DELETE FROM zoom_participants 
WHERE id IN (
  SELECT id FROM problem_records WHERE row_num > 1
);

-- Phase 2: Now do a comprehensive cleanup of ALL remaining duplicates
WITH all_duplicates AS (
  SELECT 
    id,
    webinar_id,
    participant_email,
    join_time,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY 
        COALESCE(webinar_id::text, 'null'),
        COALESCE(participant_email, 'null'), 
        COALESCE(join_time::text, 'null')
      ORDER BY created_at ASC NULLS LAST
    ) as row_num
  FROM zoom_participants 
  WHERE participant_email IS NOT NULL 
    AND join_time IS NOT NULL
)
DELETE FROM zoom_participants 
WHERE id IN (
  SELECT id FROM all_duplicates WHERE row_num > 1
);

-- Phase 3: Add new columns to support multiple sessions per participant
ALTER TABLE zoom_participants 
ADD COLUMN IF NOT EXISTS session_sequence INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_rejoin_session BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS participant_session_id TEXT;

-- Phase 4: Now add the unique constraint after thorough cleanup
ALTER TABLE zoom_participants 
DROP CONSTRAINT IF EXISTS unique_webinar_participant_session;

ALTER TABLE zoom_participants 
ADD CONSTRAINT unique_webinar_participant_session 
UNIQUE (webinar_id, participant_email, join_time);

-- Phase 5: Create performance indexes for session analysis
CREATE INDEX IF NOT EXISTS idx_zoom_participants_session_grouping 
ON zoom_participants(webinar_id, participant_email, session_sequence);

CREATE INDEX IF NOT EXISTS idx_zoom_participants_rejoin_analysis 
ON zoom_participants(webinar_id, is_rejoin_session, join_time);

CREATE INDEX IF NOT EXISTS idx_zoom_participants_session_id 
ON zoom_participants(participant_session_id);

-- Phase 6: Populate participant_session_id for existing records
UPDATE zoom_participants 
SET participant_session_id = CASE 
  WHEN participant_email IS NOT NULL AND join_time IS NOT NULL 
  THEN participant_email || '_' || EXTRACT(EPOCH FROM join_time)::TEXT
  WHEN participant_id IS NOT NULL AND join_time IS NOT NULL
  THEN participant_id || '_' || EXTRACT(EPOCH FROM join_time)::TEXT
  ELSE id::TEXT
END
WHERE participant_session_id IS NULL;

-- Phase 7: Identify and mark rejoin sessions based on timing
WITH participant_sessions AS (
  SELECT 
    id,
    webinar_id,
    participant_email,
    join_time,
    ROW_NUMBER() OVER (
      PARTITION BY webinar_id, participant_email 
      ORDER BY join_time ASC, created_at ASC
    ) as session_seq
  FROM zoom_participants 
  WHERE participant_email IS NOT NULL 
    AND join_time IS NOT NULL
),
rejoin_updates AS (
  SELECT 
    id,
    session_seq,
    CASE WHEN session_seq > 1 THEN TRUE ELSE FALSE END as is_rejoin
  FROM participant_sessions
)
UPDATE zoom_participants 
SET 
  session_sequence = rejoin_updates.session_seq,
  is_rejoin_session = rejoin_updates.is_rejoin,
  updated_at = NOW()
FROM rejoin_updates 
WHERE zoom_participants.id = rejoin_updates.id;

-- Add helpful comments for future reference
COMMENT ON COLUMN zoom_participants.session_sequence IS 'Sequential number for participant sessions in same webinar (1, 2, 3, etc.)';
COMMENT ON COLUMN zoom_participants.is_rejoin_session IS 'TRUE if this is a rejoin session (session_sequence > 1)';
COMMENT ON COLUMN zoom_participants.participant_session_id IS 'Unique identifier for each participant session';
