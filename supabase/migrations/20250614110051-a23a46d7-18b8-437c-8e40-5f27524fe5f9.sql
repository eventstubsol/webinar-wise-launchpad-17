
-- Add missing columns to email_sends for tracking
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS tracking_pixel_url TEXT;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS click_tracking_enabled BOOLEAN DEFAULT true;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS unsubscribe_url TEXT;

-- Create email tracking events table
CREATE TABLE IF NOT EXISTS email_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id UUID NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'
  event_data JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create campaign automation workflows table
CREATE TABLE IF NOT EXISTS campaign_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  workflow_type TEXT NOT NULL, -- 'drip', 'trigger', 'welcome_series'
  workflow_config JSONB NOT NULL DEFAULT '{}',
  trigger_conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create workflow steps table
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES campaign_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL, -- 'email', 'delay', 'condition', 'split_test'
  step_config JSONB NOT NULL DEFAULT '{}',
  delay_hours INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create send time optimization data table
CREATE TABLE IF NOT EXISTS send_time_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  send_hour INTEGER NOT NULL,
  send_day_of_week INTEGER NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  open_rate NUMERIC DEFAULT 0,
  click_rate NUMERIC DEFAULT 0,
  engagement_score NUMERIC DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  last_calculated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create A/B test results table
CREATE TABLE IF NOT EXISTS ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  variant_a_id UUID NOT NULL REFERENCES campaign_variants(id) ON DELETE CASCADE,
  variant_b_id UUID NOT NULL REFERENCES campaign_variants(id) ON DELETE CASCADE,
  test_start_date TIMESTAMPTZ NOT NULL,
  test_end_date TIMESTAMPTZ,
  winner_variant_id UUID,
  confidence_level NUMERIC DEFAULT 95,
  statistical_significance NUMERIC,
  test_status TEXT DEFAULT 'running', -- 'running', 'completed', 'inconclusive'
  sample_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create personalization rules table
CREATE TABLE IF NOT EXISTS personalization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'content', 'subject', 'send_time'
  conditions JSONB NOT NULL DEFAULT '{}',
  replacements JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_email_send_id ON email_tracking_events(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_type_timestamp ON email_tracking_events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_send_time_analytics_user_email ON send_time_analytics(user_id, recipient_email);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_campaign_id ON ab_test_results(campaign_id);
CREATE INDEX IF NOT EXISTS idx_personalization_rules_user_id ON personalization_rules(user_id);

-- Add RLS policies
ALTER TABLE email_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_time_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_rules ENABLE ROW LEVEL SECURITY;

-- Email tracking events policies
CREATE POLICY "Users can view their own email tracking events" ON email_tracking_events
  FOR SELECT USING (
    email_send_id IN (
      SELECT id FROM email_sends 
      WHERE campaign_id IN (
        SELECT id FROM email_campaigns WHERE user_id = auth.uid()
      )
    )
  );

-- Campaign workflows policies
CREATE POLICY "Users can manage their own workflows" ON campaign_workflows
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own workflow steps" ON workflow_steps
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM campaign_workflows WHERE user_id = auth.uid()
    )
  );

-- Send time analytics policies
CREATE POLICY "Users can manage their own send time data" ON send_time_analytics
  FOR ALL USING (auth.uid() = user_id);

-- A/B test results policies
CREATE POLICY "Users can view their own A/B test results" ON ab_test_results
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM email_campaigns WHERE user_id = auth.uid()
    )
  );

-- Personalization rules policies
CREATE POLICY "Users can manage their own personalization rules" ON personalization_rules
  FOR ALL USING (auth.uid() = user_id);
