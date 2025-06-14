
-- Create CRM integration database schema

-- CRM connections table to store OAuth tokens and connection details
CREATE TABLE crm_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    crm_type TEXT NOT NULL, -- salesforce, hubspot, pipedrive, custom
    connection_name TEXT NOT NULL,
    
    -- OAuth and API credentials (encrypted)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    api_key TEXT, -- for custom APIs
    instance_url TEXT, -- for Salesforce
    
    -- Connection configuration
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    
    -- Sync settings
    sync_enabled BOOLEAN DEFAULT true,
    sync_direction TEXT DEFAULT 'bidirectional', -- incoming, outgoing, bidirectional
    sync_frequency_hours INTEGER DEFAULT 24,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    next_sync_at TIMESTAMP WITH TIME ZONE,
    
    -- Connection status
    status TEXT DEFAULT 'active', -- active, error, expired, disconnected
    error_message TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Field mappings for synchronizing data between webinar fields and CRM fields
CREATE TABLE crm_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
    
    -- Field mapping configuration
    webinar_field TEXT NOT NULL, -- participant.email, participant.first_name, etc.
    crm_field TEXT NOT NULL, -- Email, FirstName, etc.
    crm_object_type TEXT NOT NULL, -- Contact, Lead, Opportunity
    
    -- Mapping settings
    sync_direction TEXT DEFAULT 'bidirectional', -- incoming, outgoing, bidirectional
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    transformation_rules JSONB DEFAULT '{}',
    
    -- Conflict resolution
    conflict_resolution TEXT DEFAULT 'last_write_wins', -- last_write_wins, manual_review, crm_wins, webinar_wins
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(connection_id, webinar_field, crm_field)
);

-- Sync operation logs for tracking sync activities and conflicts
CREATE TABLE crm_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
    
    -- Sync operation details
    sync_type TEXT NOT NULL, -- full_sync, incremental_sync, real_time_update
    operation_type TEXT NOT NULL, -- create, update, delete
    direction TEXT NOT NULL, -- incoming, outgoing
    
    -- Entity information
    webinar_id UUID REFERENCES zoom_webinars(id),
    participant_id UUID REFERENCES zoom_participants(id),
    crm_object_type TEXT, -- Contact, Lead, Opportunity
    crm_object_id TEXT,
    
    -- Sync status and results
    status TEXT NOT NULL, -- pending, success, failed, conflict
    records_processed INTEGER DEFAULT 0,
    records_success INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    records_conflicts INTEGER DEFAULT 0,
    
    -- Error and conflict details
    error_message TEXT,
    conflict_details JSONB,
    resolution_action TEXT, -- auto_resolved, manual_review_required
    
    -- Data changes
    data_before JSONB,
    data_after JSONB,
    field_changes JSONB,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook configurations for real-time CRM updates
CREATE TABLE crm_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
    
    -- Webhook configuration
    webhook_url TEXT NOT NULL,
    webhook_secret TEXT,
    event_types TEXT[] DEFAULT ARRAY[]::TEXT[], -- contact.created, contact.updated, etc.
    
    -- Status and validation
    is_active BOOLEAN DEFAULT true,
    last_ping_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active', -- active, failed, disabled
    
    -- Security
    signature_header TEXT, -- X-Hub-Signature, X-Salesforce-Signature, etc.
    verification_method TEXT DEFAULT 'hmac_sha256',
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM sync conflicts for manual resolution
CREATE TABLE crm_sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_log_id UUID NOT NULL REFERENCES crm_sync_logs(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
    
    -- Conflict details
    conflict_type TEXT NOT NULL, -- field_mismatch, duplicate_record, missing_reference
    field_name TEXT,
    
    -- Conflicting values
    webinar_value JSONB,
    crm_value JSONB,
    
    -- Resolution
    status TEXT DEFAULT 'pending', -- pending, resolved, ignored
    resolution_method TEXT, -- manual, auto
    resolved_value JSONB,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_crm_connections_user_id ON crm_connections(user_id);
CREATE INDEX idx_crm_connections_status ON crm_connections(status);
CREATE INDEX idx_crm_connections_next_sync ON crm_connections(next_sync_at) WHERE sync_enabled = true;

CREATE INDEX idx_crm_field_mappings_connection_id ON crm_field_mappings(connection_id);
CREATE INDEX idx_crm_field_mappings_webinar_field ON crm_field_mappings(webinar_field);

CREATE INDEX idx_crm_sync_logs_connection_id ON crm_sync_logs(connection_id);
CREATE INDEX idx_crm_sync_logs_status ON crm_sync_logs(status);
CREATE INDEX idx_crm_sync_logs_created_at ON crm_sync_logs(created_at);
CREATE INDEX idx_crm_sync_logs_webinar_id ON crm_sync_logs(webinar_id);
CREATE INDEX idx_crm_sync_logs_participant_id ON crm_sync_logs(participant_id);

CREATE INDEX idx_crm_webhooks_connection_id ON crm_webhooks(connection_id);
CREATE INDEX idx_crm_webhooks_active ON crm_webhooks(is_active);

CREATE INDEX idx_crm_sync_conflicts_status ON crm_sync_conflicts(status);
CREATE INDEX idx_crm_sync_conflicts_connection_id ON crm_sync_conflicts(connection_id);

-- Add RLS policies
ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_conflicts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own CRM connections
CREATE POLICY "Users can manage their own CRM connections" 
    ON crm_connections FOR ALL 
    USING (auth.uid() = user_id);

-- Field mappings are accessible based on connection ownership
CREATE POLICY "Users can manage field mappings for their connections" 
    ON crm_field_mappings FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM crm_connections 
        WHERE crm_connections.id = crm_field_mappings.connection_id 
        AND crm_connections.user_id = auth.uid()
    ));

-- Sync logs are accessible based on connection ownership
CREATE POLICY "Users can view sync logs for their connections" 
    ON crm_sync_logs FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM crm_connections 
        WHERE crm_connections.id = crm_sync_logs.connection_id 
        AND crm_connections.user_id = auth.uid()
    ));

-- Webhooks are accessible based on connection ownership
CREATE POLICY "Users can manage webhooks for their connections" 
    ON crm_webhooks FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM crm_connections 
        WHERE crm_connections.id = crm_webhooks.connection_id 
        AND crm_connections.user_id = auth.uid()
    ));

-- Sync conflicts are accessible based on connection ownership
CREATE POLICY "Users can manage sync conflicts for their connections" 
    ON crm_sync_conflicts FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM crm_connections 
        WHERE crm_connections.id = crm_sync_conflicts.connection_id 
        AND crm_connections.user_id = auth.uid()
    ));

-- Add updated_at triggers
CREATE TRIGGER update_crm_connections_updated_at 
    BEFORE UPDATE ON crm_connections 
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_crm_field_mappings_updated_at 
    BEFORE UPDATE ON crm_field_mappings 
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_crm_webhooks_updated_at 
    BEFORE UPDATE ON crm_webhooks 
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
