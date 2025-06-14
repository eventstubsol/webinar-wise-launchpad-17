
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_source ON webhook_events(webhook_source);

-- Enable RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage webhook events
CREATE POLICY "Service can manage webhook events" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');
