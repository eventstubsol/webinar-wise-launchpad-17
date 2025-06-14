
-- Create report templates table for custom branded templates
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN ('pdf', 'excel', 'powerpoint')),
    template_description TEXT,
    branding_config JSONB DEFAULT '{}'::jsonb,
    layout_config JSONB DEFAULT '{}'::jsonb,
    content_sections JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scheduled reports table for automation
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_name TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('pdf', 'excel', 'powerpoint', 'multi')),
    template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
    schedule_frequency TEXT NOT NULL CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly', 'custom')),
    schedule_config JSONB DEFAULT '{}'::jsonb,
    recipient_list JSONB DEFAULT '[]'::jsonb,
    filter_config JSONB DEFAULT '{}'::jsonb,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    next_send_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create export queue table for background processing
CREATE TABLE export_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'excel', 'powerpoint', 'csv')),
    export_format TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0,
    file_url TEXT,
    file_size BIGINT,
    export_config JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create report history table for audit trails
CREATE TABLE report_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    export_queue_id UUID REFERENCES export_queue(id) ON DELETE SET NULL,
    scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL,
    report_title TEXT NOT NULL,
    recipient_count INTEGER DEFAULT 0,
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'partial')),
    delivery_details JSONB DEFAULT '{}'::jsonb,
    file_url TEXT,
    file_size BIGINT,
    generation_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email templates table for SendGrid integration
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN ('scheduled_report', 'export_ready', 'report_failed')),
    subject_template TEXT NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_report_templates_user_id ON report_templates(user_id);
CREATE INDEX idx_report_templates_type ON report_templates(template_type);
CREATE INDEX idx_scheduled_reports_user_id ON scheduled_reports(user_id);
CREATE INDEX idx_scheduled_reports_next_send ON scheduled_reports(next_send_at) WHERE is_active = true;
CREATE INDEX idx_export_queue_user_id ON export_queue(user_id);
CREATE INDEX idx_export_queue_status ON export_queue(status);
CREATE INDEX idx_export_queue_created_at ON export_queue(created_at);
CREATE INDEX idx_report_history_user_id ON report_history(user_id);
CREATE INDEX idx_report_history_created_at ON report_history(created_at);
CREATE INDEX idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX idx_email_templates_type ON email_templates(template_type);

-- Add updated_at triggers
CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_scheduled_reports_updated_at
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_export_queue_updated_at
    BEFORE UPDATE ON export_queue
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Enable RLS on all tables
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own report templates" ON report_templates
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own scheduled reports" ON scheduled_reports
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own export queue" ON export_queue
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own report history" ON report_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own email templates" ON email_templates
    FOR ALL USING (auth.uid() = user_id);
