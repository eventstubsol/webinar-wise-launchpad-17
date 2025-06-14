
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_subscriptions_workflow_id ON workflow_subscriptions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_subscriptions_subscriber_email ON workflow_subscriptions(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_workflow_subscriptions_next_action_at ON workflow_subscriptions(next_action_at);
CREATE INDEX IF NOT EXISTS idx_workflow_subscriptions_status ON workflow_subscriptions(status);

-- Enable RLS
ALTER TABLE workflow_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can manage their workflow subscriptions" ON workflow_subscriptions
    FOR ALL USING (
        workflow_id IN (
            SELECT id FROM campaign_automation_workflows WHERE user_id = auth.uid()
        )
    );

-- Updated_at trigger
CREATE TRIGGER update_workflow_subscriptions_updated_at 
    BEFORE UPDATE ON workflow_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
