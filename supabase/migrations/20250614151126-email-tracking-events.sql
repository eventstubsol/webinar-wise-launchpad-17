
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_email_send_id ON email_tracking_events(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_event_type ON email_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_timestamp ON email_tracking_events(timestamp);

-- Enable RLS
ALTER TABLE email_tracking_events ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can view their own tracking events" ON email_tracking_events
    FOR SELECT USING (
        email_send_id IN (
            SELECT es.id FROM email_sends es 
            JOIN email_campaigns ec ON es.campaign_id = ec.id 
            WHERE ec.user_id = auth.uid()
        )
    );
