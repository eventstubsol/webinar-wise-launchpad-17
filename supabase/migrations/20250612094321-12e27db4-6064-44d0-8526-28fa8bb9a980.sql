
-- =====================================================
-- Zoom Integration Database Schema for Webinar Wise (FIXED)
-- =====================================================
-- This migration creates all tables needed for Zoom integration
-- including OAuth tokens, webinar data, and analytics

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. ZOOM CONNECTIONS TABLE
-- =====================================================
-- Stores OAuth tokens and Zoom account information
CREATE TABLE zoom_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Zoom account information
    zoom_user_id TEXT NOT NULL,
    zoom_email TEXT NOT NULL,
    zoom_account_id TEXT NOT NULL,
    zoom_account_type TEXT, -- 'basic', 'pro', 'business', 'enterprise'
    
    -- OAuth tokens (encrypted)
    access_token TEXT NOT NULL, -- Will be encrypted
    refresh_token TEXT NOT NULL, -- Will be encrypted
    token_expires_at TIMESTAMPTZ NOT NULL,
    
    -- Connection metadata
    scopes TEXT[], -- Array of granted scopes
    connection_status TEXT NOT NULL DEFAULT 'active' CHECK (connection_status IN ('active', 'expired', 'revoked', 'error')),
    is_primary BOOLEAN DEFAULT false,
    
    -- Sync settings
    auto_sync_enabled BOOLEAN DEFAULT true,
    sync_frequency_hours INTEGER DEFAULT 24,
    last_sync_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique Zoom account per user
    CONSTRAINT unique_zoom_account_per_user UNIQUE (user_id, zoom_account_id)
);

-- Create partial unique index for primary connection constraint
CREATE UNIQUE INDEX unique_primary_per_user_idx ON zoom_connections (user_id) WHERE is_primary = true;

-- Index for faster lookups
CREATE INDEX idx_zoom_connections_user_id ON zoom_connections(user_id);
CREATE INDEX idx_zoom_connections_status ON zoom_connections(connection_status);
CREATE INDEX idx_zoom_connections_next_sync ON zoom_connections(next_sync_at) WHERE auto_sync_enabled = true;

-- =====================================================
-- 2. ZOOM WEBINARS TABLE
-- =====================================================
-- Stores webinar metadata and settings
CREATE TABLE zoom_webinars (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES zoom_connections(id) ON DELETE CASCADE,
    
    -- Zoom webinar identifiers
    webinar_id TEXT NOT NULL,
    webinar_uuid TEXT NOT NULL,
    occurrence_id TEXT,
    
    -- Webinar details
    topic TEXT NOT NULL,
    type INTEGER NOT NULL, -- 5: Webinar, 6: Recurring webinar with no fixed time, 9: Recurring webinar with fixed time
    start_time TIMESTAMPTZ,
    duration INTEGER, -- Duration in minutes
    timezone TEXT,
    agenda TEXT,
    
    -- Webinar settings
    host_id TEXT NOT NULL,
    host_email TEXT,
    alternative_hosts TEXT[],
    
    -- Status
    status TEXT CHECK (status IN ('scheduled', 'started', 'finished', 'cancelled')),
    
    -- Registration settings
    registration_required BOOLEAN DEFAULT false,
    registration_type INTEGER, -- 1: Attendees register once, 2: Attendees register for each occurrence
    approval_type INTEGER, -- 0: Automatically approve, 1: Manually approve, 2: No registration required
    
    -- Capacity
    max_registrants INTEGER,
    max_attendees INTEGER,
    
    -- URLs
    join_url TEXT,
    registration_url TEXT,
    
    -- Analytics summary (denormalized for performance)
    total_registrants INTEGER DEFAULT 0,
    total_attendees INTEGER DEFAULT 0,
    total_minutes INTEGER DEFAULT 0,
    avg_attendance_duration INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT unique_webinar_per_connection UNIQUE (connection_id, webinar_id)
);

-- Indexes for performance
CREATE INDEX idx_zoom_webinars_connection_id ON zoom_webinars(connection_id);
CREATE INDEX idx_zoom_webinars_start_time ON zoom_webinars(start_time);
CREATE INDEX idx_zoom_webinars_status ON zoom_webinars(status);
CREATE INDEX idx_zoom_webinars_webinar_id ON zoom_webinars(webinar_id);

-- =====================================================
-- 3. ZOOM REGISTRANTS TABLE
-- =====================================================
-- Stores registration data for webinars
CREATE TABLE zoom_registrants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    webinar_id UUID NOT NULL REFERENCES zoom_webinars(id) ON DELETE CASCADE,
    
    -- Registrant identifiers
    registrant_id TEXT NOT NULL,
    registrant_email TEXT NOT NULL,
    
    -- Registrant information
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    zip TEXT,
    state TEXT,
    comments TEXT,
    
    -- Custom questions (JSONB for flexibility)
    custom_questions JSONB DEFAULT '{}',
    
    -- Registration details
    registration_time TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('approved', 'pending', 'denied', 'cancelled')),
    
    -- Source tracking
    source_id TEXT,
    tracking_source TEXT,
    
    -- Attendance tracking
    attended BOOLEAN DEFAULT false,
    join_time TIMESTAMPTZ,
    leave_time TIMESTAMPTZ,
    duration INTEGER, -- Duration in seconds
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT unique_registrant_per_webinar UNIQUE (webinar_id, registrant_id)
);

-- Indexes
CREATE INDEX idx_zoom_registrants_webinar_id ON zoom_registrants(webinar_id);
CREATE INDEX idx_zoom_registrants_email ON zoom_registrants(registrant_email);
CREATE INDEX idx_zoom_registrants_status ON zoom_registrants(status);
CREATE INDEX idx_zoom_registrants_attended ON zoom_registrants(attended);

-- =====================================================
-- 4. ZOOM PARTICIPANTS TABLE
-- =====================================================
-- Stores actual attendee data and engagement metrics
CREATE TABLE zoom_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    webinar_id UUID NOT NULL REFERENCES zoom_webinars(id) ON DELETE CASCADE,
    registrant_id UUID REFERENCES zoom_registrants(id) ON DELETE SET NULL,
    
    -- Participant identifiers
    participant_id TEXT NOT NULL,
    participant_user_id TEXT,
    participant_email TEXT,
    participant_name TEXT NOT NULL,
    
    -- Session information
    join_time TIMESTAMPTZ NOT NULL,
    leave_time TIMESTAMPTZ,
    duration INTEGER, -- Duration in seconds
    
    -- Connection details
    ip_address INET,
    location TEXT,
    network_type TEXT,
    device TEXT,
    version TEXT,
    
    -- Engagement metrics
    attentiveness_score INTEGER, -- Percentage 0-100
    camera_on_duration INTEGER, -- Seconds
    share_desktop_duration INTEGER, -- Seconds
    share_application_duration INTEGER, -- Seconds
    
    -- Participation flags
    raised_hand BOOLEAN DEFAULT false,
    posted_chat BOOLEAN DEFAULT false,
    answered_polling BOOLEAN DEFAULT false,
    asked_question BOOLEAN DEFAULT false,
    
    -- Customer data
    customer_key TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for each join session
    CONSTRAINT unique_participant_session UNIQUE (webinar_id, participant_id, join_time)
);

-- Indexes
CREATE INDEX idx_zoom_participants_webinar_id ON zoom_participants(webinar_id);
CREATE INDEX idx_zoom_participants_registrant_id ON zoom_participants(registrant_id);
CREATE INDEX idx_zoom_participants_email ON zoom_participants(participant_email);
CREATE INDEX idx_zoom_participants_join_time ON zoom_participants(join_time);

-- =====================================================
-- 5. ZOOM POLLS TABLE
-- =====================================================
-- Stores poll questions and results
CREATE TABLE zoom_polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    webinar_id UUID NOT NULL REFERENCES zoom_webinars(id) ON DELETE CASCADE,
    
    -- Poll identifiers
    poll_id TEXT NOT NULL,
    poll_title TEXT NOT NULL,
    
    -- Poll configuration
    poll_type TEXT CHECK (poll_type IN ('single', 'multiple', 'quiz')),
    anonymous BOOLEAN DEFAULT false,
    status TEXT CHECK (status IN ('notstart', 'started', 'ended', 'sharing')),
    
    -- Poll questions (JSONB array)
    questions JSONB NOT NULL DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT unique_poll_per_webinar UNIQUE (webinar_id, poll_id)
);

-- Index
CREATE INDEX idx_zoom_polls_webinar_id ON zoom_polls(webinar_id);

-- =====================================================
-- 6. ZOOM POLL RESPONSES TABLE
-- =====================================================
-- Stores individual poll responses
CREATE TABLE zoom_poll_responses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES zoom_polls(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES zoom_participants(id) ON DELETE SET NULL,
    
    -- Response data
    participant_email TEXT,
    participant_name TEXT,
    
    -- Responses (JSONB)
    responses JSONB NOT NULL DEFAULT '[]',
    
    -- Timestamps
    submitted_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_zoom_poll_responses_poll_id ON zoom_poll_responses(poll_id);
CREATE INDEX idx_zoom_poll_responses_participant_id ON zoom_poll_responses(participant_id);

-- =====================================================
-- 7. ZOOM Q&A TABLE
-- =====================================================
-- Stores Q&A session data
CREATE TABLE zoom_qna (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    webinar_id UUID NOT NULL REFERENCES zoom_webinars(id) ON DELETE CASCADE,
    
    -- Question details
    question_id TEXT NOT NULL,
    question TEXT NOT NULL,
    
    -- Asker information
    asker_name TEXT NOT NULL,
    asker_email TEXT,
    anonymous BOOLEAN DEFAULT false,
    
    -- Answer details
    answer TEXT,
    answered_by TEXT,
    answered_at TIMESTAMPTZ,
    
    -- Status
    status TEXT CHECK (status IN ('open', 'answered', 'dismissed')),
    upvote_count INTEGER DEFAULT 0,
    
    -- Timestamps
    asked_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT unique_question_per_webinar UNIQUE (webinar_id, question_id)
);

-- Indexes
CREATE INDEX idx_zoom_qna_webinar_id ON zoom_qna(webinar_id);
CREATE INDEX idx_zoom_qna_status ON zoom_qna(status);
CREATE INDEX idx_zoom_qna_asked_at ON zoom_qna(asked_at);

-- =====================================================
-- 8. ZOOM RECORDINGS TABLE
-- =====================================================
-- Stores recording metadata
CREATE TABLE zoom_recordings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    webinar_id UUID NOT NULL REFERENCES zoom_webinars(id) ON DELETE CASCADE,
    
    -- Recording identifiers
    recording_id TEXT NOT NULL,
    recording_uuid TEXT NOT NULL,
    
    -- Recording details
    recording_type TEXT CHECK (recording_type IN ('shared_screen_with_speaker_view', 'shared_screen_with_gallery_view', 'speaker_view', 'gallery_view', 'audio_only', 'chat_file', 'transcript')),
    recording_start TIMESTAMPTZ NOT NULL,
    recording_end TIMESTAMPTZ NOT NULL,
    file_size BIGINT, -- Size in bytes
    file_type TEXT,
    
    -- URLs and access
    download_url TEXT,
    play_url TEXT,
    password TEXT,
    
    -- Status
    status TEXT CHECK (status IN ('processing', 'completed', 'failed')),
    
    -- Analytics
    total_views INTEGER DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Unique constraint
    CONSTRAINT unique_recording UNIQUE (webinar_id, recording_id)
);

-- Indexes
CREATE INDEX idx_zoom_recordings_webinar_id ON zoom_recordings(webinar_id);
CREATE INDEX idx_zoom_recordings_type ON zoom_recordings(recording_type);
CREATE INDEX idx_zoom_recordings_status ON zoom_recordings(status);

-- =====================================================
-- 9. ZOOM SYNC LOGS TABLE
-- =====================================================
-- Tracks sync operations and errors
CREATE TABLE zoom_sync_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES zoom_connections(id) ON DELETE CASCADE,
    
    -- Sync operation details
    sync_type TEXT NOT NULL CHECK (sync_type IN ('initial', 'incremental', 'manual', 'webhook')),
    sync_status TEXT NOT NULL CHECK (sync_status IN ('started', 'in_progress', 'completed', 'failed', 'cancelled')),
    
    -- Scope
    resource_type TEXT CHECK (resource_type IN ('all', 'webinars', 'participants', 'registrants', 'polls', 'qna', 'recordings')),
    resource_id TEXT, -- Specific webinar_id if syncing single item
    
    -- Progress tracking
    total_items INTEGER,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    -- API usage
    api_calls_made INTEGER DEFAULT 0,
    rate_limit_hits INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_zoom_sync_logs_connection_id ON zoom_sync_logs(connection_id);
CREATE INDEX idx_zoom_sync_logs_status ON zoom_sync_logs(sync_status);
CREATE INDEX idx_zoom_sync_logs_started_at ON zoom_sync_logs(started_at DESC);

-- =====================================================
-- 10. ZOOM TOKEN REFRESH LOG TABLE
-- =====================================================
-- Audit trail for token refresh operations
CREATE TABLE zoom_token_refresh_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES zoom_connections(id) ON DELETE CASCADE,
    
    -- Operation details
    refresh_type TEXT CHECK (refresh_type IN ('automatic', 'manual', 'api_call')),
    refresh_status TEXT CHECK (refresh_status IN ('success', 'failed')),
    
    -- Token info (never store actual tokens here)
    old_token_expires_at TIMESTAMPTZ,
    new_token_expires_at TIMESTAMPTZ,
    
    -- Error info
    error_code TEXT,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_zoom_token_refresh_log_connection_id ON zoom_token_refresh_log(connection_id);
CREATE INDEX idx_zoom_token_refresh_log_created_at ON zoom_token_refresh_log(created_at DESC);

-- =====================================================
-- FUNCTIONS FOR TOKEN ENCRYPTION
-- =====================================================

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
    -- In production, use a secure key from vault.secrets
    -- This is a placeholder - replace with actual implementation
    RETURN encode(encrypt(token::bytea, current_setting('app.encryption_key')::bytea, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token TEXT)
RETURNS TEXT AS $$
BEGIN
    -- In production, use a secure key from vault.secrets
    -- This is a placeholder - replace with actual implementation
    RETURN convert_from(decrypt(decode(encrypted_token, 'base64'), current_setting('app.encryption_key')::bytea, 'aes'), 'UTF8');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_zoom_connections_updated_at BEFORE UPDATE ON zoom_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoom_webinars_updated_at BEFORE UPDATE ON zoom_webinars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoom_registrants_updated_at BEFORE UPDATE ON zoom_registrants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoom_participants_updated_at BEFORE UPDATE ON zoom_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoom_polls_updated_at BEFORE UPDATE ON zoom_polls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoom_qna_updated_at BEFORE UPDATE ON zoom_qna
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoom_recordings_updated_at BEFORE UPDATE ON zoom_recordings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoom_sync_logs_updated_at BEFORE UPDATE ON zoom_sync_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE zoom_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_registrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_qna ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_token_refresh_log ENABLE ROW LEVEL SECURITY;

-- Zoom Connections policies
CREATE POLICY "Users can view their own Zoom connections"
    ON zoom_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Zoom connections"
    ON zoom_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Zoom connections"
    ON zoom_connections FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Zoom connections"
    ON zoom_connections FOR DELETE
    USING (auth.uid() = user_id);

-- Zoom Webinars policies
CREATE POLICY "Users can view webinars from their connections"
    ON zoom_webinars FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM zoom_connections
        WHERE zoom_connections.id = zoom_webinars.connection_id
        AND zoom_connections.user_id = auth.uid()
    ));

CREATE POLICY "Service role can manage all webinars"
    ON zoom_webinars FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Zoom Registrants policies
CREATE POLICY "Users can view registrants from their webinars"
    ON zoom_registrants FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM zoom_webinars
        JOIN zoom_connections ON zoom_connections.id = zoom_webinars.connection_id
        WHERE zoom_webinars.id = zoom_registrants.webinar_id
        AND zoom_connections.user_id = auth.uid()
    ));

CREATE POLICY "Service role can manage all registrants"
    ON zoom_registrants FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Zoom Participants policies
CREATE POLICY "Users can view participants from their webinars"
    ON zoom_participants FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM zoom_webinars
        JOIN zoom_connections ON zoom_connections.id = zoom_webinars.connection_id
        WHERE zoom_webinars.id = zoom_participants.webinar_id
        AND zoom_connections.user_id = auth.uid()
    ));

CREATE POLICY "Service role can manage all participants"
    ON zoom_participants FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Zoom Polls policies
CREATE POLICY "Users can view polls from their webinars"
    ON zoom_polls FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM zoom_webinars
        JOIN zoom_connections ON zoom_connections.id = zoom_webinars.connection_id
        WHERE zoom_webinars.id = zoom_polls.webinar_id
        AND zoom_connections.user_id = auth.uid()
    ));

CREATE POLICY "Service role can manage all polls"
    ON zoom_polls FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Zoom Poll Responses policies
CREATE POLICY "Users can view poll responses from their polls"
    ON zoom_poll_responses FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM zoom_polls
        JOIN zoom_webinars ON zoom_webinars.id = zoom_polls.webinar_id
        JOIN zoom_connections ON zoom_connections.id = zoom_webinars.connection_id
        WHERE zoom_polls.id = zoom_poll_responses.poll_id
        AND zoom_connections.user_id = auth.uid()
    ));

CREATE POLICY "Service role can manage all poll responses"
    ON zoom_poll_responses FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Zoom Q&A policies
CREATE POLICY "Users can view Q&A from their webinars"
    ON zoom_qna FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM zoom_webinars
        JOIN zoom_connections ON zoom_connections.id = zoom_webinars.connection_id
        WHERE zoom_webinars.id = zoom_qna.webinar_id
        AND zoom_connections.user_id = auth.uid()
    ));

CREATE POLICY "Service role can manage all Q&A"
    ON zoom_qna FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Zoom Recordings policies
CREATE POLICY "Users can view recordings from their webinars"
    ON zoom_recordings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM zoom_webinars
        JOIN zoom_connections ON zoom_connections.id = zoom_webinars.connection_id
        WHERE zoom_webinars.id = zoom_recordings.webinar_id
        AND zoom_connections.user_id = auth.uid()
    ));

CREATE POLICY "Service role can manage all recordings"
    ON zoom_recordings FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Zoom Sync Logs policies
CREATE POLICY "Users can view sync logs for their connections"
    ON zoom_sync_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM zoom_connections
        WHERE zoom_connections.id = zoom_sync_logs.connection_id
        AND zoom_connections.user_id = auth.uid()
    ));

CREATE POLICY "Service role can manage all sync logs"
    ON zoom_sync_logs FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Zoom Token Refresh Log policies
CREATE POLICY "Users can view token refresh logs for their connections"
    ON zoom_token_refresh_log FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM zoom_connections
        WHERE zoom_connections.id = zoom_token_refresh_log.connection_id
        AND zoom_connections.user_id = auth.uid()
    ));

CREATE POLICY "Service role can manage all token refresh logs"
    ON zoom_token_refresh_log FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- USEFUL VIEWS
-- =====================================================

-- View for webinar analytics summary
CREATE OR REPLACE VIEW webinar_analytics_summary AS
SELECT 
    w.id,
    w.topic,
    w.start_time,
    w.duration,
    w.total_registrants,
    w.total_attendees,
    CASE 
        WHEN w.total_registrants > 0 
        THEN ROUND((w.total_attendees::numeric / w.total_registrants) * 100, 2)
        ELSE 0 
    END as attendance_rate,
    w.avg_attendance_duration,
    COUNT(DISTINCT p.id) as unique_participants,
    COUNT(DISTINCT po.id) as total_polls,
    COUNT(DISTINCT q.id) as total_questions,
    COUNT(DISTINCT r.id) as total_recordings,
    zc.user_id
FROM zoom_webinars w
JOIN zoom_connections zc ON zc.id = w.connection_id
LEFT JOIN zoom_participants p ON p.webinar_id = w.id
LEFT JOIN zoom_polls po ON po.webinar_id = w.id
LEFT JOIN zoom_qna q ON q.webinar_id = w.id
LEFT JOIN zoom_recordings r ON r.webinar_id = w.id
GROUP BY w.id, w.topic, w.start_time, w.duration, w.total_registrants, 
         w.total_attendees, w.avg_attendance_duration, zc.user_id;

-- Grant access to the view
GRANT SELECT ON webinar_analytics_summary TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE zoom_connections IS 'Stores Zoom OAuth connections and account information for each user';
COMMENT ON TABLE zoom_webinars IS 'Stores webinar metadata synchronized from Zoom';
COMMENT ON TABLE zoom_registrants IS 'Stores registration data for webinar attendees';
COMMENT ON TABLE zoom_participants IS 'Stores actual attendance and engagement data';
COMMENT ON TABLE zoom_polls IS 'Stores poll questions configured for webinars';
COMMENT ON TABLE zoom_poll_responses IS 'Stores individual responses to polls';
COMMENT ON TABLE zoom_qna IS 'Stores Q&A session questions and answers';
COMMENT ON TABLE zoom_recordings IS 'Stores metadata about webinar recordings';
COMMENT ON TABLE zoom_sync_logs IS 'Audit trail for data synchronization operations';
COMMENT ON TABLE zoom_token_refresh_log IS 'Audit trail for OAuth token refresh operations';

COMMENT ON COLUMN zoom_connections.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN zoom_connections.refresh_token IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN zoom_participants.attentiveness_score IS 'Zoom-calculated attention score (0-100)';
COMMENT ON COLUMN zoom_webinars.type IS '5: Webinar, 6: Recurring webinar with no fixed time, 9: Recurring webinar with fixed time';
