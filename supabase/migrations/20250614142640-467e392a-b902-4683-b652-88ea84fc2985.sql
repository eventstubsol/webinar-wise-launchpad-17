
-- Table for storing general deliverability metrics like sender score and IP reputation
CREATE TABLE public.deliverability_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    metric_type text NOT NULL,
    metric_value numeric NOT NULL,
    provider text,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);
-- RLS for deliverability_metrics
ALTER TABLE public.deliverability_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own deliverability metrics" ON public.deliverability_metrics FOR ALL USING (auth.uid() = user_id);

-- Table for deliverability alerts like high bounce rates or spam complaints
CREATE TABLE public.deliverability_alerts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
    alert_type text NOT NULL,
    alert_level text NOT NULL DEFAULT 'warning',
    details jsonb,
    status text NOT NULL DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone
);
-- RLS for deliverability_alerts
ALTER TABLE public.deliverability_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own deliverability alerts" ON public.deliverability_alerts FOR ALL USING (auth.uid() = user_id);

-- Table for historical reputation tracking over time
CREATE TABLE public.email_reputation_history (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recorded_date date NOT NULL,
    sender_score integer,
    ip_reputation numeric,
    domain_reputation numeric,
    provider text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, recorded_date, provider)
);
-- RLS for email_reputation_history
ALTER TABLE public.email_reputation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own reputation history" ON public.email_reputation_history FOR ALL USING (auth.uid() = user_id);

-- Table for storing generated weekly/monthly deliverability reports
CREATE TABLE public.deliverability_reports (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_type text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    summary_data jsonb,
    file_url text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);
-- RLS for deliverability_reports
ALTER TABLE public.deliverability_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own deliverability reports" ON public.deliverability_reports FOR ALL USING (auth.uid() = user_id);

