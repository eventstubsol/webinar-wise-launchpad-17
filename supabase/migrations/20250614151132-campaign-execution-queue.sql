
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaign_execution_queue_scheduled_for ON campaign_execution_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_campaign_execution_queue_status ON campaign_execution_queue(status);
CREATE INDEX IF NOT EXISTS idx_campaign_execution_queue_priority ON campaign_execution_queue(priority);

-- Enable RLS
ALTER TABLE campaign_execution_queue ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can manage their campaigns execution" ON campaign_execution_queue
    FOR ALL USING (
        campaign_id IN (
            SELECT id FROM email_campaigns WHERE user_id = auth.uid()
        ) OR 
        workflow_id IN (
            SELECT id FROM campaign_automation_workflows WHERE user_id = auth.uid()
        )
    );

-- Updated_at trigger
CREATE TRIGGER update_campaign_execution_queue_updated_at 
    BEFORE UPDATE ON campaign_execution_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
