
-- Add template versioning support
CREATE TABLE IF NOT EXISTS email_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  template_name text NOT NULL,
  design_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  html_template text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  change_summary text,
  is_published boolean DEFAULT false
);

-- Add template tags
CREATE TABLE IF NOT EXISTS email_template_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(template_id, tag_name)
);

-- Add template collections
CREATE TABLE IF NOT EXISTS email_template_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collection_name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Link templates to collections
CREATE TABLE IF NOT EXISTS email_template_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES email_template_collections(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, template_id)
);

-- Add template usage analytics
CREATE TABLE IF NOT EXISTS email_template_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  used_by uuid REFERENCES profiles(id),
  used_in_campaign uuid REFERENCES email_campaigns(id),
  used_at timestamptz DEFAULT now()
);

-- Add new columns to email_templates for enhanced features
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preview_image_url text,
ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_system_template boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON email_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_version_number ON email_template_versions(template_id, version_number);
CREATE INDEX IF NOT EXISTS idx_template_tags_template_id ON email_template_tags(template_id);
CREATE INDEX IF NOT EXISTS idx_template_tags_name ON email_template_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_template_collections_user_id ON email_template_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON email_template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_system ON email_templates(is_system_template);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON email_templates USING gin(tags);

-- Function to create a new template version
CREATE OR REPLACE FUNCTION create_template_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if this is an update, not insert
  IF TG_OP = 'UPDATE' AND (
    OLD.design_json IS DISTINCT FROM NEW.design_json OR 
    OLD.html_template IS DISTINCT FROM NEW.html_template OR
    OLD.template_name IS DISTINCT FROM NEW.template_name
  ) THEN
    INSERT INTO email_template_versions (
      template_id, 
      version_number, 
      template_name, 
      design_json, 
      html_template, 
      variables,
      created_by,
      change_summary
    ) VALUES (
      OLD.id,
      OLD.version_number,
      OLD.template_name,
      OLD.design_json,
      OLD.html_template,
      OLD.variables,
      NEW.user_id,
      'Auto-saved version'
    );
    
    -- Increment version number
    NEW.version_number = COALESCE(OLD.version_number, 1) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-versioning
DROP TRIGGER IF EXISTS trigger_template_versioning ON email_templates;
CREATE TRIGGER trigger_template_versioning
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION create_template_version();
