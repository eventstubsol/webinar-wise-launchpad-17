
-- Zoom-based segmentation rules
CREATE TABLE IF NOT EXISTS zoom_segmentation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    webinar_criteria JSONB NOT NULL DEFAULT '{}', -- attendance, registration, engagement criteria
    segment_criteria JSONB NOT NULL DEFAULT '{}', -- resulting segment definition
    auto_apply BOOLEAN DEFAULT true,
    last_applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_zoom_segmentation_rules_user_id ON zoom_segmentation_rules(user_id);

-- Enable RLS
ALTER TABLE zoom_segmentation_rules ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can manage their segmentation rules" ON zoom_segmentation_rules
    FOR ALL USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_zoom_segmentation_rules_updated_at 
    BEFORE UPDATE ON zoom_segmentation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
