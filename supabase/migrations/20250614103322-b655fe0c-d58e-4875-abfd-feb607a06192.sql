
-- Enhanced Campaign Management Schema for Phase 3

-- Audience segments table for reusable audience definitions
CREATE TABLE audience_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    segment_name TEXT NOT NULL,
    description TEXT,
    filter_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    is_dynamic BOOLEAN DEFAULT true,
    estimated_size INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B test variants for campaign testing
CREATE TABLE campaign_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    variant_type TEXT NOT NULL CHECK (variant_type IN ('subject', 'content', 'send_time', 'template')),
    template_id UUID REFERENCES email_templates(id),
    subject_line TEXT,
    content_changes JSONB DEFAULT '{}'::jsonb,
    send_time_offset INTEGER DEFAULT 0, -- minutes offset from base send time
    split_percentage NUMERIC(5,2) DEFAULT 50.00,
    recipient_count INTEGER DEFAULT 0,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    is_control BOOLEAN DEFAULT false,
    is_winner BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign analytics for detailed performance tracking
CREATE TABLE campaign_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES campaign_variants(id),
    metric_type TEXT NOT NULL CHECK (metric_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'complained', 'converted')),
    metric_value NUMERIC DEFAULT 0,
    recipient_email TEXT,
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Send time optimization data
CREATE TABLE send_time_optimization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    optimal_hour INTEGER CHECK (optimal_hour >= 0 AND optimal_hour <= 23),
    optimal_day_of_week INTEGER CHECK (optimal_day_of_week >= 0 AND optimal_day_of_week <= 6),
    timezone TEXT DEFAULT 'UTC',
    engagement_score NUMERIC(5,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confidence_level NUMERIC(5,2) DEFAULT 0,
    sample_size INTEGER DEFAULT 0,
    UNIQUE(user_id, recipient_email)
);

-- Enhanced campaign scheduling
CREATE TABLE campaign_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring', 'trigger_based')),
    send_at TIMESTAMP WITH TIME ZONE,
    timezone TEXT DEFAULT 'UTC',
    recurrence_pattern JSONB, -- for recurring campaigns
    trigger_conditions JSONB, -- for trigger-based campaigns
    frequency_cap JSONB DEFAULT '{}'::jsonb, -- frequency limiting rules
    is_active BOOLEAN DEFAULT true,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    next_execution_at TIMESTAMP WITH TIME ZONE,
    execution_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign performance summaries (materialized view data)
CREATE TABLE campaign_performance_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    total_complained INTEGER DEFAULT 0,
    total_converted INTEGER DEFAULT 0,
    open_rate NUMERIC(5,2) DEFAULT 0,
    click_rate NUMERIC(5,2) DEFAULT 0,
    bounce_rate NUMERIC(5,2) DEFAULT 0,
    unsubscribe_rate NUMERIC(5,2) DEFAULT 0,
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    revenue_generated NUMERIC(10,2) DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Send queue for managing email delivery
CREATE TABLE email_send_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES campaign_variants(id),
    recipient_email TEXT NOT NULL,
    recipient_id UUID REFERENCES profiles(id),
    personalization_data JSONB DEFAULT '{}'::jsonb,
    scheduled_send_time TIMESTAMP WITH TIME ZONE NOT NULL,
    priority INTEGER DEFAULT 5,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign templates for reusable campaign workflows
CREATE TABLE campaign_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('welcome_series', 'product_launch', 're_engagement', 'newsletter', 'promotional', 'educational', 'custom')),
    workflow_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_settings JSONB DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_audience_segments_user_id ON audience_segments(user_id);
CREATE INDEX idx_campaign_variants_campaign_id ON campaign_variants(campaign_id);
CREATE INDEX idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_analytics_metric_type ON campaign_analytics(metric_type);
CREATE INDEX idx_campaign_analytics_event_timestamp ON campaign_analytics(event_timestamp);
CREATE INDEX idx_send_time_optimization_user_email ON send_time_optimization(user_id, recipient_email);
CREATE INDEX idx_campaign_schedules_campaign_id ON campaign_schedules(campaign_id);
CREATE INDEX idx_campaign_schedules_next_execution ON campaign_schedules(next_execution_at) WHERE is_active = true;
CREATE INDEX idx_campaign_performance_campaign_id ON campaign_performance_summaries(campaign_id);
CREATE INDEX idx_email_send_queue_status_scheduled ON email_send_queue(status, scheduled_send_time);
CREATE INDEX idx_email_send_queue_campaign_id ON email_send_queue(campaign_id);
CREATE INDEX idx_campaign_templates_user_id ON campaign_templates(user_id);
CREATE INDEX idx_campaign_templates_category ON campaign_templates(category);

-- Add updated_at triggers
CREATE TRIGGER update_audience_segments_updated_at
    BEFORE UPDATE ON audience_segments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_campaign_schedules_updated_at
    BEFORE UPDATE ON campaign_schedules
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_email_send_queue_updated_at
    BEFORE UPDATE ON email_send_queue
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_campaign_templates_updated_at
    BEFORE UPDATE ON campaign_templates
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Enable RLS on all new tables
ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_time_optimization ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_performance_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own audience segments" ON audience_segments
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view campaign variants for their campaigns" ON campaign_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM email_campaigns 
            WHERE email_campaigns.id = campaign_variants.campaign_id 
            AND email_campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view analytics for their campaigns" ON campaign_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM email_campaigns 
            WHERE email_campaigns.id = campaign_analytics.campaign_id 
            AND email_campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own send time optimization" ON send_time_optimization
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage schedules for their campaigns" ON campaign_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM email_campaigns 
            WHERE email_campaigns.id = campaign_schedules.campaign_id 
            AND email_campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view performance for their campaigns" ON campaign_performance_summaries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM email_campaigns 
            WHERE email_campaigns.id = campaign_performance_summaries.campaign_id 
            AND email_campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage send queue for their campaigns" ON email_send_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM email_campaigns 
            WHERE email_campaigns.id = email_send_queue.campaign_id 
            AND email_campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own campaign templates" ON campaign_templates
    FOR ALL USING (auth.uid() = user_id OR is_public = true);

-- Function to calculate campaign performance metrics
CREATE OR REPLACE FUNCTION calculate_campaign_performance(p_campaign_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO campaign_performance_summaries (
        campaign_id,
        total_sent,
        total_delivered,
        total_opened,
        total_clicked,
        total_bounced,
        total_unsubscribed,
        total_complained,
        total_converted
    )
    SELECT 
        p_campaign_id,
        COALESCE(SUM(CASE WHEN metric_type = 'sent' THEN metric_value END), 0),
        COALESCE(SUM(CASE WHEN metric_type = 'delivered' THEN metric_value END), 0),
        COALESCE(SUM(CASE WHEN metric_type = 'opened' THEN metric_value END), 0),
        COALESCE(SUM(CASE WHEN metric_type = 'clicked' THEN metric_value END), 0),
        COALESCE(SUM(CASE WHEN metric_type = 'bounced' THEN metric_value END), 0),
        COALESCE(SUM(CASE WHEN metric_type = 'unsubscribed' THEN metric_value END), 0),
        COALESCE(SUM(CASE WHEN metric_type = 'complained' THEN metric_value END), 0),
        COALESCE(SUM(CASE WHEN metric_type = 'converted' THEN metric_value END), 0)
    FROM campaign_analytics 
    WHERE campaign_id = p_campaign_id
    ON CONFLICT (campaign_id) DO UPDATE SET
        total_sent = EXCLUDED.total_sent,
        total_delivered = EXCLUDED.total_delivered,
        total_opened = EXCLUDED.total_opened,
        total_clicked = EXCLUDED.total_clicked,
        total_bounced = EXCLUDED.total_bounced,
        total_unsubscribed = EXCLUDED.total_unsubscribed,
        total_complained = EXCLUDED.total_complained,
        total_converted = EXCLUDED.total_converted,
        open_rate = CASE WHEN EXCLUDED.total_delivered > 0 
                   THEN (EXCLUDED.total_opened::numeric / EXCLUDED.total_delivered) * 100 
                   ELSE 0 END,
        click_rate = CASE WHEN EXCLUDED.total_delivered > 0 
                    THEN (EXCLUDED.total_clicked::numeric / EXCLUDED.total_delivered) * 100 
                    ELSE 0 END,
        bounce_rate = CASE WHEN EXCLUDED.total_sent > 0 
                     THEN (EXCLUDED.total_bounced::numeric / EXCLUDED.total_sent) * 100 
                     ELSE 0 END,
        unsubscribe_rate = CASE WHEN EXCLUDED.total_delivered > 0 
                          THEN (EXCLUDED.total_unsubscribed::numeric / EXCLUDED.total_delivered) * 100 
                          ELSE 0 END,
        conversion_rate = CASE WHEN EXCLUDED.total_delivered > 0 
                         THEN (EXCLUDED.total_converted::numeric / EXCLUDED.total_delivered) * 100 
                         ELSE 0 END,
        calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update segment estimated size
CREATE OR REPLACE FUNCTION update_segment_size(p_segment_id UUID)
RETURNS void AS $$
DECLARE
    segment_filters JSONB;
    estimated_count INTEGER;
BEGIN
    SELECT filter_criteria INTO segment_filters 
    FROM audience_segments 
    WHERE id = p_segment_id;
    
    -- This is a simplified count - in practice, you'd implement 
    -- more complex filtering logic based on the filter_criteria
    SELECT COUNT(*) INTO estimated_count
    FROM profiles 
    WHERE email IS NOT NULL;
    
    UPDATE audience_segments 
    SET estimated_size = estimated_count,
        last_calculated_at = NOW()
    WHERE id = p_segment_id;
END;
$$ LANGUAGE plpgsql;
