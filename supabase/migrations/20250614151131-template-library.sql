
-- Template library with categories and ratings
CREATE TABLE IF NOT EXISTS template_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'webinar_registration', 'follow_up', 'nurture', 'thank_you', 'reengagement'
    description TEXT,
    template_content JSONB NOT NULL, -- email template data
    is_system_template BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    preview_image_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_template_library_category ON template_library(category);
CREATE INDEX IF NOT EXISTS idx_template_library_is_featured ON template_library(is_featured);

-- Enable RLS
ALTER TABLE template_library ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all templates" ON template_library
    FOR SELECT USING (true);

CREATE POLICY "Users can create templates" ON template_library
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_template_library_updated_at 
    BEFORE UPDATE ON template_library 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
