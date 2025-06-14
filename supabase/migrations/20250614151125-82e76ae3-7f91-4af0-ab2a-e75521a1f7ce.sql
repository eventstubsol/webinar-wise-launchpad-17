
-- Enhanced email tracking and campaign management tables

-- Email tracking events for detailed analytics
CREATE TABLE IF NOT EXISTS email_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_send_id UUID REFERENCES email_sends(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'
    event_data JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign automation workflows
CREATE TABLE IF NOT EXISTS campaign_automation_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    workflow_name TEXT NOT NULL,
    workflow_type TEXT NOT NULL, -- 'drip', 'trigger', 'sequence', 'webinar_follow_up'
    trigger_conditions JSONB DEFAULT '{}',
    workflow_steps JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    total_subscribers INTEGER DEFAULT 0,
    completed_subscribers INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual subscriber progress through workflows
CREATE TABLE IF NOT EXISTS workflow_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES campaign_automation_workflows(id) ON DELETE CASCADE,
    subscriber_email TEXT NOT NULL,
    subscriber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    next_action_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Zoom-based segmentation rules
CREATE TABLE IF NOT EXISTS zoom_segmentation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    webinar_criteria JSONB NOT NULL DEFAULT '{}', -- attendance, registration, engagement criteria
    segment_criteria JSONB NOT NULL DEFAULT '{}', -- resulting segment definition
    auto_apply BOOLEAN DEFAULT true,
    last_applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email performance analytics aggregated data
CREATE TABLE IF NOT EXISTS email_performance_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    date_period DATE NOT NULL,
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    metrics JSONB NOT NULL DEFAULT '{}', -- aggregated metrics
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, campaign_id, date_period, period_type)
);

-- Template library with categories and ratings
CREATE TABLE IF NOT EXISTS template_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'webinar_registration', 'follow_up', 'nurture', 'thank_you', 'reengagement'
    description TEXT,
    template_content JSONB NOT NULL, -- email template data
    is_system_template BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    preview_image_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign execution queue for scheduling
CREATE TABLE IF NOT EXISTS campaign_execution_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES campaign_automation_workflows(id) ON DELETE CASCADE,
    execution_type TEXT NOT NULL, -- 'immediate', 'scheduled', 'triggered'
    scheduled_for TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
    execution_config JSONB DEFAULT '{}',
    progress_data JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook event log for external service events
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_source TEXT NOT NULL, -- 'resend', 'sendgrid', 'mailgun', etc.
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processing_error TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_email_send_id ON email_tracking_events(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_event_type ON email_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_timestamp ON email_tracking_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_workflow_subscriptions_workflow_id ON workflow_subscriptions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_subscriptions_subscriber_email ON workflow_subscriptions(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_workflow_subscriptions_next_action_at ON workflow_subscriptions(next_action_at);
CREATE INDEX IF NOT EXISTS idx_workflow_subscriptions_status ON workflow_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_campaign_execution_queue_scheduled_for ON campaign_execution_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_campaign_execution_queue_status ON campaign_execution_queue(status);
CREATE INDEX IF NOT EXISTS idx_campaign_execution_queue_priority ON campaign_execution_queue(priority);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_source ON webhook_events(webhook_source);

CREATE INDEX IF NOT EXISTS idx_zoom_segmentation_rules_user_id ON zoom_segmentation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_template_library_category ON template_library(category);
CREATE INDEX IF NOT EXISTS idx_template_library_is_featured ON template_library(is_featured);

-- Add RLS policies
ALTER TABLE email_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_segmentation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_execution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for user data isolation
CREATE POLICY "Users can view their own tracking events" ON email_tracking_events
    FOR SELECT USING (
        email_send_id IN (
            SELECT es.id FROM email_sends es 
            JOIN email_campaigns ec ON es.campaign_id = ec.id 
            WHERE ec.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own workflows" ON campaign_automation_workflows
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their workflow subscriptions" ON workflow_subscriptions
    FOR ALL USING (
        workflow_id IN (
            SELECT id FROM campaign_automation_workflows WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their segmentation rules" ON zoom_segmentation_rules
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their analytics" ON email_performance_analytics
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view all templates" ON template_library
    FOR SELECT USING (true);

CREATE POLICY "Users can create templates" ON template_library
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can manage their campaigns execution" ON campaign_execution_queue
    FOR ALL USING (
        campaign_id IN (
            SELECT id FROM email_campaigns WHERE user_id = auth.uid()
        ) OR 
        workflow_id IN (
            SELECT id FROM campaign_automation_workflows WHERE user_id = auth.uid()
        )
    );

-- Allow service role to manage webhook events
CREATE POLICY "Service can manage webhook events" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaign_automation_workflows_updated_at 
    BEFORE UPDATE ON campaign_automation_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_subscriptions_updated_at 
    BEFORE UPDATE ON workflow_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoom_segmentation_rules_updated_at 
    BEFORE UPDATE ON zoom_segmentation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_library_updated_at 
    BEFORE UPDATE ON template_library 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_execution_queue_updated_at 
    BEFORE UPDATE ON campaign_execution_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
