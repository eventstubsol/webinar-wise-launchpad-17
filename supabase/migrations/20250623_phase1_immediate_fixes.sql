-- Phase 1: Immediate Fixes for Zoom Sync
-- This migration handles stuck sync logs and adds missing columns

-- 1. Clean up stuck sync logs
UPDATE zoom_sync_logs 
SET 
  status = 'failed',
  ended_at = NOW(),
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{error}',
    '"Sync was stuck in started status and has been marked as failed"'
  )
WHERE status IN ('started', 'running') 
  AND started_at < NOW() - INTERVAL '1 hour';

-- 2. Add missing columns to zoom_webinars table
-- First, let's add the missing columns that the Edge Function expects

-- Add webinar_uuid column if it doesn't exist
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS webinar_uuid TEXT;

-- Add alternative_hosts column
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS alternative_hosts TEXT[];

-- Add registration and approval columns
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS registration_required BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS approval_type INTEGER;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS max_registrants INTEGER;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS max_attendees INTEGER;

-- Add meeting settings columns
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS audio TEXT;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS auto_recording TEXT;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS enforce_login BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS hd_video BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS hd_video_for_attendees BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS send_1080p_video_to_attendees BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS host_video BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS on_demand BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS panelists_video BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS practice_session BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS question_answer BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS registrants_confirmation_email BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS registrants_email_notification BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS registrants_restrict_number INTEGER DEFAULT 0;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS notify_registrants BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS post_webinar_survey BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS survey_url TEXT;

-- Add authentication columns
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS authentication_option TEXT;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS authentication_domains TEXT;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS authentication_name TEXT;

-- Add email settings columns
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS email_language TEXT;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS panelists_invitation_email_notification BOOLEAN DEFAULT false;

-- Add contact information columns
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add Q&A and notification settings
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS attendees_and_panelists_reminder_email_notification JSONB;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS follow_up_attendees_email_notification JSONB;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS follow_up_absentees_email_notification JSONB;

-- Add password columns (rename existing ones to match Edge Function)
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS h323_password TEXT;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS encrypted_password TEXT;

-- Add simulive columns
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS simulive BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS record_file_id TEXT;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS transition_to_live BOOLEAN DEFAULT false;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS creation_source TEXT;

-- Add additional data column for storing raw responses
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS additional_data JSONB DEFAULT '{}'::jsonb;

-- Add sync status columns
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';

-- Add webinar_created_at column
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS webinar_created_at TIMESTAMPTZ;

-- Update column name from created_at to created_at_db if not already done
ALTER TABLE zoom_webinars 
RENAME COLUMN created_at TO created_at_db;

-- Add created_at and updated_at columns that Edge Function expects
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 3. Create or update the sync queue tables needed by the Edge Function
CREATE TABLE IF NOT EXISTS webinar_sync_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_id UUID REFERENCES zoom_sync_logs(id) ON DELETE CASCADE,
  webinar_id TEXT NOT NULL,
  webinar_type TEXT CHECK (webinar_type IN ('past', 'upcoming')) NOT NULL,
  priority INTEGER DEFAULT 5,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_webinar_sync_queue_status 
ON webinar_sync_queue(sync_id, processing_status, priority DESC, scheduled_at);

-- 4. Create sync_state table for resume functionality
CREATE TABLE IF NOT EXISTS sync_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  state_type TEXT NOT NULL,
  state_data JSONB DEFAULT '{}'::jsonb,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  last_processed_item TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sync_id, state_type)
);

-- 5. Create sync_progress_updates table for real-time progress tracking
CREATE TABLE IF NOT EXISTS sync_progress_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_id UUID NOT NULL,
  update_type TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  progress_percentage INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient progress queries
CREATE INDEX IF NOT EXISTS idx_sync_progress_updates_sync_id 
ON sync_progress_updates(sync_id, created_at DESC);

-- 6. Update the unique constraint on zoom_webinars to match what Edge Function expects
-- First drop the existing constraint if it exists
ALTER TABLE zoom_webinars 
DROP CONSTRAINT IF EXISTS zoom_webinars_webinar_id_connection_id_key;

-- Add the new constraint
ALTER TABLE zoom_webinars 
ADD CONSTRAINT zoom_webinars_webinar_id_connection_id_key 
UNIQUE (webinar_id, connection_id);

-- 7. Clean up any duplicate webinar entries
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY webinar_id, connection_id 
      ORDER BY updated_at_db DESC, created_at_db DESC
    ) as rn
  FROM zoom_webinars
)
DELETE FROM zoom_webinars 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 8. Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_at_db = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for the tables
DROP TRIGGER IF EXISTS update_zoom_webinars_updated_at ON zoom_webinars;
CREATE TRIGGER update_zoom_webinars_updated_at 
BEFORE UPDATE ON zoom_webinars 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_webinar_sync_queue_updated_at ON webinar_sync_queue;
CREATE TRIGGER update_webinar_sync_queue_updated_at 
BEFORE UPDATE ON webinar_sync_queue 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_state_updated_at ON sync_state;
CREATE TRIGGER update_sync_state_updated_at 
BEFORE UPDATE ON sync_state 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Add RLS policies for the new tables
ALTER TABLE webinar_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_progress_updates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can manage sync queue" ON webinar_sync_queue
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage sync state" ON sync_state
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage sync progress" ON sync_progress_updates
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 10. Grant permissions to authenticated users to read sync progress
CREATE POLICY "Authenticated users can read sync progress" ON sync_progress_updates
FOR SELECT USING (auth.role() = 'authenticated');

-- Add comment to track this migration
COMMENT ON TABLE zoom_webinars IS 'Phase 1 fixes applied - added all missing columns expected by Edge Function';
