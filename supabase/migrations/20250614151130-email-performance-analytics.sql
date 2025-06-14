
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

-- Enable RLS
ALTER TABLE email_performance_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can view their analytics" ON email_performance_analytics
    FOR ALL USING (user_id = auth.uid());
