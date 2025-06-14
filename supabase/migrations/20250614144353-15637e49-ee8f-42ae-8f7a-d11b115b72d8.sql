
-- Add tables for dynamic content personalization
CREATE TABLE public.content_personalization_rules (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rule_name text NOT NULL,
    rule_type text NOT NULL, -- 'subject_line', 'content_block', 'send_time'
    conditions jsonb NOT NULL DEFAULT '{}',
    content_variations jsonb NOT NULL DEFAULT '[]',
    performance_metrics jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add tables for user behavior profiles
CREATE TABLE public.user_behavior_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_address text NOT NULL,
    engagement_score numeric DEFAULT 0,
    last_engagement_at timestamp with time zone,
    preferred_send_hour integer,
    preferred_day_of_week integer,
    content_preferences jsonb DEFAULT '{}',
    interaction_history jsonb DEFAULT '[]',
    lifecycle_stage text DEFAULT 'new',
    churn_risk_score numeric DEFAULT 0,
    predicted_ltv numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, email_address)
);

-- Add tables for behavioral events tracking
CREATE TABLE public.behavioral_events (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_address text NOT NULL,
    campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
    event_type text NOT NULL, -- 'open', 'click', 'bounce', 'unsubscribe', 'forward', 'reply'
    event_data jsonb DEFAULT '{}',
    device_type text,
    location_data jsonb,
    timestamp timestamp with time zone DEFAULT now(),
    session_id text,
    user_agent text
);

-- Add tables for engagement scoring models
CREATE TABLE public.engagement_scoring_models (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    model_name text NOT NULL,
    model_type text NOT NULL, -- 'engagement', 'churn', 'ltv', 'send_time'
    model_config jsonb NOT NULL DEFAULT '{}',
    feature_weights jsonb DEFAULT '{}',
    performance_metrics jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    last_trained_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add tables for optimization experiments
CREATE TABLE public.optimization_experiments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    experiment_name text NOT NULL,
    experiment_type text NOT NULL, -- 'send_time', 'subject_line', 'content', 'frequency'
    hypothesis text,
    status text DEFAULT 'draft', -- 'draft', 'running', 'completed', 'paused'
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    control_group_size integer DEFAULT 20,
    test_configurations jsonb NOT NULL DEFAULT '[]',
    success_metrics jsonb DEFAULT '[]',
    results jsonb DEFAULT '{}',
    statistical_significance numeric,
    winner_variant text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add tables for predictive models
CREATE TABLE public.predictive_models (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    model_name text NOT NULL,
    model_type text NOT NULL, -- 'churn_prediction', 'ltv_prediction', 'engagement_forecast'
    algorithm text NOT NULL, -- 'random_forest', 'logistic_regression', 'neural_network'
    model_parameters jsonb DEFAULT '{}',
    feature_columns jsonb DEFAULT '[]',
    target_column text,
    accuracy_score numeric,
    precision_score numeric,
    recall_score numeric,
    f1_score numeric,
    training_data_size integer,
    last_trained_at timestamp with time zone,
    model_file_path text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add tables for dynamic segment membership
CREATE TABLE public.dynamic_segment_membership (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    segment_id uuid NOT NULL REFERENCES public.audience_segments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_address text NOT NULL,
    membership_score numeric DEFAULT 1.0,
    added_at timestamp with time zone DEFAULT now(),
    last_updated_at timestamp with time zone DEFAULT now(),
    membership_reason jsonb DEFAULT '{}',
    UNIQUE(segment_id, user_id, email_address)
);

-- Add RLS policies
ALTER TABLE public.content_personalization_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own personalization rules" ON public.content_personalization_rules FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.user_behavior_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own behavior profiles" ON public.user_behavior_profiles FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.behavioral_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own behavioral events" ON public.behavioral_events FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.engagement_scoring_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scoring models" ON public.engagement_scoring_models FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.optimization_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own experiments" ON public.optimization_experiments FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.predictive_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own predictive models" ON public.predictive_models FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.dynamic_segment_membership ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view segment membership for their segments" ON public.dynamic_segment_membership FOR SELECT USING (
    segment_id IN (SELECT id FROM public.audience_segments WHERE user_id = auth.uid())
);

-- Add indexes for performance
CREATE INDEX idx_content_personalization_rules_user_id ON public.content_personalization_rules(user_id);
CREATE INDEX idx_content_personalization_rules_type ON public.content_personalization_rules(rule_type);
CREATE INDEX idx_user_behavior_profiles_email ON public.user_behavior_profiles(email_address);
CREATE INDEX idx_user_behavior_profiles_engagement_score ON public.user_behavior_profiles(engagement_score);
CREATE INDEX idx_behavioral_events_user_id ON public.behavioral_events(user_id);
CREATE INDEX idx_behavioral_events_email ON public.behavioral_events(email_address);
CREATE INDEX idx_behavioral_events_timestamp ON public.behavioral_events(timestamp);
CREATE INDEX idx_behavioral_events_type ON public.behavioral_events(event_type);
CREATE INDEX idx_engagement_scoring_models_user_id ON public.engagement_scoring_models(user_id);
CREATE INDEX idx_optimization_experiments_user_id ON public.optimization_experiments(user_id);
CREATE INDEX idx_optimization_experiments_status ON public.optimization_experiments(status);
CREATE INDEX idx_predictive_models_user_id ON public.predictive_models(user_id);
CREATE INDEX idx_predictive_models_type ON public.predictive_models(model_type);
CREATE INDEX idx_dynamic_segment_membership_segment_id ON public.dynamic_segment_membership(segment_id);
CREATE INDEX idx_dynamic_segment_membership_user_id ON public.dynamic_segment_membership(user_id);

-- Add functions for behavior scoring
CREATE OR REPLACE FUNCTION public.calculate_engagement_score(p_user_id uuid, p_email text)
RETURNS numeric
LANGUAGE plpgsql
AS $function$
DECLARE
    recent_opens integer;
    recent_clicks integer;
    recent_campaigns integer;
    days_since_last_engagement integer;
    engagement_score numeric;
BEGIN
    -- Count recent opens (last 30 days)
    SELECT COUNT(*) INTO recent_opens
    FROM behavioral_events 
    WHERE email_address = p_email 
    AND event_type = 'open' 
    AND timestamp > now() - interval '30 days';
    
    -- Count recent clicks (last 30 days)
    SELECT COUNT(*) INTO recent_clicks
    FROM behavioral_events 
    WHERE email_address = p_email 
    AND event_type = 'click' 
    AND timestamp > now() - interval '30 days';
    
    -- Count recent campaigns sent (last 30 days)
    SELECT COUNT(DISTINCT campaign_id) INTO recent_campaigns
    FROM behavioral_events 
    WHERE email_address = p_email 
    AND timestamp > now() - interval '30 days';
    
    -- Days since last engagement
    SELECT COALESCE(EXTRACT(DAYS FROM (now() - MAX(timestamp))), 999) INTO days_since_last_engagement
    FROM behavioral_events 
    WHERE email_address = p_email 
    AND event_type IN ('open', 'click');
    
    -- Calculate engagement score (0-100)
    engagement_score := LEAST(100, GREATEST(0, 
        (recent_opens * 10) + 
        (recent_clicks * 20) + 
        (recent_campaigns * 5) - 
        (days_since_last_engagement * 0.5)
    ));
    
    RETURN engagement_score;
END;
$function$;

-- Add function to update behavior profiles
CREATE OR REPLACE FUNCTION public.update_behavior_profile(p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    new_engagement_score numeric;
    last_event_time timestamp with time zone;
    preferred_hour integer;
    preferred_day integer;
BEGIN
    -- Calculate new engagement score
    new_engagement_score := calculate_engagement_score(p_user_id, p_email);
    
    -- Get last engagement time
    SELECT MAX(timestamp) INTO last_event_time
    FROM behavioral_events 
    WHERE email_address = p_email 
    AND event_type IN ('open', 'click');
    
    -- Calculate preferred send time (hour with most opens)
    SELECT EXTRACT(HOUR FROM timestamp) INTO preferred_hour
    FROM behavioral_events 
    WHERE email_address = p_email 
    AND event_type = 'open'
    GROUP BY EXTRACT(HOUR FROM timestamp)
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Calculate preferred send day (day of week with most opens)
    SELECT EXTRACT(DOW FROM timestamp) INTO preferred_day
    FROM behavioral_events 
    WHERE email_address = p_email 
    AND event_type = 'open'
    GROUP BY EXTRACT(DOW FROM timestamp)
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Update or insert behavior profile
    INSERT INTO user_behavior_profiles (
        user_id, 
        email_address, 
        engagement_score, 
        last_engagement_at,
        preferred_send_hour,
        preferred_day_of_week,
        updated_at
    ) VALUES (
        p_user_id, 
        p_email, 
        new_engagement_score, 
        last_event_time,
        preferred_hour,
        preferred_day,
        now()
    )
    ON CONFLICT (user_id, email_address) 
    DO UPDATE SET
        engagement_score = new_engagement_score,
        last_engagement_at = last_event_time,
        preferred_send_hour = preferred_hour,
        preferred_day_of_week = preferred_day,
        updated_at = now();
END;
$function$;
