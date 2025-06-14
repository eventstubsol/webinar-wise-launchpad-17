
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

-- Enable RLS
ALTER TABLE campaign_automation_workflows ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can manage their own workflows" ON campaign_automation_workflows
    FOR ALL USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_campaign_automation_workflows_updated_at 
    BEFORE UPDATE ON campaign_automation_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
