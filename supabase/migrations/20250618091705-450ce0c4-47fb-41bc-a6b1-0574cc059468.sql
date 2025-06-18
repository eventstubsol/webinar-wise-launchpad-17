
-- Phase 1: Fix Database Schema for Participant Sync Issues

-- Make participant_id nullable to handle cases where Zoom API doesn't provide it
ALTER TABLE zoom_participants ALTER COLUMN participant_id DROP NOT NULL;

-- Add a generated participant_id for cases where Zoom doesn't provide one
ALTER TABLE zoom_participants ADD COLUMN generated_participant_id text;

-- Create a function to generate a fallback participant ID
CREATE OR REPLACE FUNCTION generate_fallback_participant_id(
  p_webinar_id uuid,
  p_email text,
  p_name text,
  p_join_time timestamp with time zone
) RETURNS text AS $$
BEGIN
  -- Generate a consistent ID based on available data
  IF p_email IS NOT NULL THEN
    RETURN 'email_' || encode(digest(p_email || COALESCE(p_webinar_id::text, ''), 'sha256'), 'hex')::text;
  ELSIF p_name IS NOT NULL THEN
    RETURN 'name_' || encode(digest(p_name || COALESCE(p_webinar_id::text, '') || COALESCE(p_join_time::text, ''), 'sha256'), 'hex')::text;
  ELSE
    RETURN 'anon_' || encode(digest(COALESCE(p_webinar_id::text, '') || COALESCE(p_join_time::text, '') || random()::text, 'sha256'), 'hex')::text;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the unique constraint to use either participant_id or generated_participant_id
ALTER TABLE zoom_participants DROP CONSTRAINT IF EXISTS unique_webinar_participant;

-- Create a new unique constraint that handles both scenarios
CREATE UNIQUE INDEX unique_webinar_participant_comprehensive 
ON zoom_participants (webinar_id, COALESCE(participant_id, generated_participant_id));

-- Add a trigger to automatically generate fallback IDs
CREATE OR REPLACE FUNCTION ensure_participant_id() RETURNS TRIGGER AS $$
BEGIN
  -- If participant_id is null, generate a fallback ID
  IF NEW.participant_id IS NULL THEN
    NEW.generated_participant_id = generate_fallback_participant_id(
      NEW.webinar_id,
      NEW.participant_email,
      NEW.participant_name,
      NEW.join_time
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_participant_id
  BEFORE INSERT OR UPDATE ON zoom_participants
  FOR EACH ROW
  EXECUTE FUNCTION ensure_participant_id();

-- Add validation logging table for debugging
CREATE TABLE IF NOT EXISTS participant_sync_debug_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id text NOT NULL,
  raw_participant_data jsonb NOT NULL,
  processing_errors text[],
  field_issues jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_participant_sync_debug_webinar 
ON participant_sync_debug_log(webinar_id, created_at);
