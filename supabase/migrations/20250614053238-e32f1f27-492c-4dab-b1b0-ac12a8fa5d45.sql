
-- AI Analytics Module - Database Schema Migration
-- Module 3: AI-Powered Analytics for Webinar Wise

-- Create enum types for better data consistency
CREATE TYPE ai_insight_type AS ENUM ('engagement', 'content', 'predictive', 'custom', 'performance');
CREATE TYPE ai_insight_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE prediction_type AS ENUM ('dropout_risk', 'engagement_score', 'interaction_likelihood', 'attention_score');
CREATE TYPE content_type AS ENUM ('transcript', 'slides', 'chat', 'audio', 'video');
CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying');
CREATE TYPE metric_data_type AS ENUM ('number', 'percentage', 'duration', 'count', 'ratio');
CREATE TYPE template_category AS ENUM ('performance', 'engagement', 'content', 'custom', 'predictive');
CREATE TYPE sharing_permission AS ENUM ('private', 'team', 'public');

-- 1. AI Insights Table - Store AI-generated insights for webinars
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webinar_id UUID NOT NULL REFERENCES zoom_webinars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Insight metadata
    insight_type ai_insight_type NOT NULL,
    insight_title TEXT NOT NULL,
    insight_summary TEXT,
    
    -- AI model information
    ai_model_name TEXT NOT NULL,
    ai_model_version TEXT,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Insight data (flexible JSON for different AI outputs)
    insight_data JSONB NOT NULL DEFAULT '{}',
    supporting_data JSONB DEFAULT '{}',
    
    -- Status and versioning
    status ai_insight_status NOT NULL DEFAULT 'pending',
    version INTEGER NOT NULL DEFAULT 1,
    parent_insight_id UUID REFERENCES ai_insights(id) ON DELETE SET NULL,
    
    -- Processing metadata
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    processing_duration_ms INTEGER,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_confidence CHECK (
        confidence_score IS NULL OR 
        (confidence_score >= 0 AND confidence_score <= 1)
    ),
    CONSTRAINT valid_processing_duration CHECK (
        processing_duration_ms IS NULL OR processing_duration_ms >= 0
    )
);

-- 2. Engagement Predictions Table - Predictive analytics for attendee behavior
CREATE TABLE engagement_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webinar_id UUID NOT NULL REFERENCES zoom_webinars(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES zoom_participants(id) ON DELETE CASCADE,
    
    -- Prediction metadata
    prediction_type prediction_type NOT NULL,
    predicted_value DECIMAL(5,4) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Model information
    model_name TEXT NOT NULL,
    model_version TEXT,
    feature_vector JSONB,
    
    -- Prediction context
    prediction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    webinar_elapsed_minutes INTEGER,
    participant_session_duration INTEGER,
    
    -- Validation and accuracy tracking
    actual_value DECIMAL(5,4),
    prediction_accuracy DECIMAL(3,2),
    validated_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional context
    contributing_factors JSONB DEFAULT '[]',
    prediction_explanation TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_predicted_value CHECK (predicted_value >= 0 AND predicted_value <= 1),
    CONSTRAINT valid_actual_value CHECK (
        actual_value IS NULL OR 
        (actual_value >= 0 AND actual_value <= 1)
    ),
    CONSTRAINT valid_accuracy CHECK (
        prediction_accuracy IS NULL OR 
        (prediction_accuracy >= 0 AND prediction_accuracy <= 1)
    )
);

-- 3. Content Analysis Table - AI analysis of webinar content
CREATE TABLE content_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webinar_id UUID NOT NULL REFERENCES zoom_webinars(id) ON DELETE CASCADE,
    recording_id UUID REFERENCES zoom_recordings(id) ON DELETE SET NULL,
    
    -- Content metadata
    content_type content_type NOT NULL,
    content_source TEXT, -- URL, file path, or identifier
    content_hash TEXT, -- For deduplication and change detection
    
    -- Analysis configuration
    analysis_model TEXT NOT NULL,
    analysis_version TEXT,
    analysis_parameters JSONB DEFAULT '{}',
    
    -- Analysis results
    analysis_results JSONB NOT NULL DEFAULT '{}',
    extracted_text TEXT,
    key_topics JSONB DEFAULT '[]',
    sentiment_scores JSONB DEFAULT '{}',
    keywords JSONB DEFAULT '[]',
    summary TEXT,
    
    -- Quality metrics
    analysis_quality_score DECIMAL(3,2),
    processing_confidence DECIMAL(3,2),
    
    -- Status tracking
    status analysis_status NOT NULL DEFAULT 'pending',
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    processing_duration_ms INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_quality_score CHECK (
        analysis_quality_score IS NULL OR 
        (analysis_quality_score >= 0 AND analysis_quality_score <= 1)
    ),
    CONSTRAINT valid_processing_confidence CHECK (
        processing_confidence IS NULL OR 
        (processing_confidence >= 0 AND processing_confidence <= 1)
    ),
    CONSTRAINT valid_retry_count CHECK (retry_count >= 0)
);

-- 4. Custom Metrics Table - User-defined KPIs and metrics
CREATE TABLE custom_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES zoom_connections(id) ON DELETE SET NULL,
    
    -- Metric definition
    metric_name TEXT NOT NULL,
    metric_description TEXT,
    metric_category TEXT,
    data_type metric_data_type NOT NULL,
    
    -- Calculation configuration
    calculation_formula TEXT NOT NULL,
    calculation_parameters JSONB DEFAULT '{}',
    aggregation_method TEXT DEFAULT 'sum', -- sum, avg, max, min, count
    time_period_days INTEGER DEFAULT 30,
    
    -- Target and thresholds
    target_value DECIMAL(15,4),
    warning_threshold DECIMAL(15,4),
    critical_threshold DECIMAL(15,4),
    
    -- Display configuration
    display_format TEXT DEFAULT '{{value}}',
    chart_type TEXT DEFAULT 'line',
    color_scheme TEXT DEFAULT 'blue',
    
    -- Status and permissions
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_public BOOLEAN NOT NULL DEFAULT false,
    dashboard_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_metric_per_user UNIQUE (user_id, metric_name),
    CONSTRAINT valid_time_period CHECK (time_period_days > 0)
);

-- 5. Insight Templates Table - Reusable insight generation templates
CREATE TABLE insight_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Template metadata
    template_name TEXT NOT NULL,
    template_description TEXT,
    category template_category NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Template configuration
    ai_model_requirements JSONB DEFAULT '{}',
    input_parameters JSONB NOT NULL DEFAULT '{}',
    output_schema JSONB NOT NULL DEFAULT '{}',
    prompt_template TEXT NOT NULL,
    
    -- Processing configuration
    processing_config JSONB DEFAULT '{}',
    validation_rules JSONB DEFAULT '[]',
    retry_policy JSONB DEFAULT '{}',
    
    -- Sharing and permissions
    sharing_permission sharing_permission NOT NULL DEFAULT 'private',
    allowed_users JSONB DEFAULT '[]',
    allowed_teams JSONB DEFAULT '[]',
    
    -- Usage statistics
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2),
    avg_processing_time_ms INTEGER,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_template_name_per_user UNIQUE (created_by, template_name, version),
    CONSTRAINT valid_success_rate CHECK (
        success_rate IS NULL OR 
        (success_rate >= 0 AND success_rate <= 1)
    ),
    CONSTRAINT valid_usage_count CHECK (usage_count >= 0)
);

-- Create indexes for performance optimization
-- AI Insights indexes
CREATE INDEX idx_ai_insights_webinar_type ON ai_insights(webinar_id, insight_type);
CREATE INDEX idx_ai_insights_user_status ON ai_insights(user_id, status);
CREATE INDEX idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX idx_ai_insights_confidence ON ai_insights(confidence_score DESC) WHERE confidence_score IS NOT NULL;
CREATE INDEX idx_ai_insights_model ON ai_insights(ai_model_name, ai_model_version);

-- Engagement Predictions indexes
CREATE INDEX idx_engagement_predictions_webinar_participant ON engagement_predictions(webinar_id, participant_id);
CREATE INDEX idx_engagement_predictions_type_timestamp ON engagement_predictions(prediction_type, prediction_timestamp DESC);
CREATE INDEX idx_engagement_predictions_accuracy ON engagement_predictions(prediction_accuracy DESC) WHERE prediction_accuracy IS NOT NULL;
CREATE INDEX idx_engagement_predictions_model ON engagement_predictions(model_name, model_version);

-- Content Analysis indexes
CREATE INDEX idx_content_analysis_webinar_type ON content_analysis(webinar_id, content_type);
CREATE INDEX idx_content_analysis_status ON content_analysis(status);
CREATE INDEX idx_content_analysis_hash ON content_analysis(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX idx_content_analysis_quality ON content_analysis(analysis_quality_score DESC) WHERE analysis_quality_score IS NOT NULL;

-- Custom Metrics indexes
CREATE INDEX idx_custom_metrics_user_active ON custom_metrics(user_id, is_active);
CREATE INDEX idx_custom_metrics_category ON custom_metrics(metric_category);
CREATE INDEX idx_custom_metrics_public ON custom_metrics(is_public) WHERE is_public = true;
CREATE INDEX idx_custom_metrics_dashboard_order ON custom_metrics(dashboard_order) WHERE is_active = true;

-- Insight Templates indexes
CREATE INDEX idx_insight_templates_category_sharing ON insight_templates(category, sharing_permission);
CREATE INDEX idx_insight_templates_created_by ON insight_templates(created_by, is_active);
CREATE INDEX idx_insight_templates_featured ON insight_templates(is_featured) WHERE is_featured = true;
CREATE INDEX idx_insight_templates_usage ON insight_templates(usage_count DESC);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON ai_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_engagement_predictions_updated_at BEFORE UPDATE ON engagement_predictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_analysis_updated_at BEFORE UPDATE ON content_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_metrics_updated_at BEFORE UPDATE ON custom_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insight_templates_updated_at BEFORE UPDATE ON insight_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_insights
CREATE POLICY "Users can view insights for their webinars" ON ai_insights
    FOR SELECT USING (
        webinar_id IN (
            SELECT zw.id FROM zoom_webinars zw 
            JOIN zoom_connections zc ON zw.connection_id = zc.id 
            WHERE zc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create insights for their webinars" ON ai_insights
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        webinar_id IN (
            SELECT zw.id FROM zoom_webinars zw 
            JOIN zoom_connections zc ON zw.connection_id = zc.id 
            WHERE zc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own insights" ON ai_insights
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own insights" ON ai_insights
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for engagement_predictions
CREATE POLICY "Users can view predictions for their webinars" ON engagement_predictions
    FOR SELECT USING (
        webinar_id IN (
            SELECT zw.id FROM zoom_webinars zw 
            JOIN zoom_connections zc ON zw.connection_id = zc.id 
            WHERE zc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create predictions for their webinars" ON engagement_predictions
    FOR INSERT WITH CHECK (
        webinar_id IN (
            SELECT zw.id FROM zoom_webinars zw 
            JOIN zoom_connections zc ON zw.connection_id = zc.id 
            WHERE zc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update predictions for their webinars" ON engagement_predictions
    FOR UPDATE USING (
        webinar_id IN (
            SELECT zw.id FROM zoom_webinars zw 
            JOIN zoom_connections zc ON zw.connection_id = zc.id 
            WHERE zc.user_id = auth.uid()
        )
    );

-- RLS Policies for content_analysis
CREATE POLICY "Users can view content analysis for their webinars" ON content_analysis
    FOR SELECT USING (
        webinar_id IN (
            SELECT zw.id FROM zoom_webinars zw 
            JOIN zoom_connections zc ON zw.connection_id = zc.id 
            WHERE zc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create content analysis for their webinars" ON content_analysis
    FOR INSERT WITH CHECK (
        webinar_id IN (
            SELECT zw.id FROM zoom_webinars zw 
            JOIN zoom_connections zc ON zw.connection_id = zc.id 
            WHERE zc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update content analysis for their webinars" ON content_analysis
    FOR UPDATE USING (
        webinar_id IN (
            SELECT zw.id FROM zoom_webinars zw 
            JOIN zoom_connections zc ON zw.connection_id = zc.id 
            WHERE zc.user_id = auth.uid()
        )
    );

-- RLS Policies for custom_metrics
CREATE POLICY "Users can view their own metrics and public metrics" ON custom_metrics
    FOR SELECT USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create their own metrics" ON custom_metrics
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own metrics" ON custom_metrics
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own metrics" ON custom_metrics
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for insight_templates
CREATE POLICY "Users can view templates based on sharing permissions" ON insight_templates
    FOR SELECT USING (
        created_by = auth.uid() OR
        sharing_permission = 'public' OR
        (sharing_permission = 'team' AND auth.uid()::text = ANY(
            SELECT jsonb_array_elements_text(allowed_users)
        ))
    );

CREATE POLICY "Users can create their own templates" ON insight_templates
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates" ON insight_templates
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates" ON insight_templates
    FOR DELETE USING (created_by = auth.uid());
