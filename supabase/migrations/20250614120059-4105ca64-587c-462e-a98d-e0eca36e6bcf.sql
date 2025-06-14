
-- Create CSV imports tracking table
CREATE TABLE csv_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Import metadata
    import_type VARCHAR(50) NOT NULL, -- participants, webinars, polls, qa
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
    
    -- Results
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    duplicate_rows INTEGER DEFAULT 0,
    
    -- Configuration
    field_mapping JSONB DEFAULT '{}', -- Column to field mapping
    import_options JSONB DEFAULT '{}', -- Import settings and preferences
    
    -- Error tracking
    validation_errors JSONB DEFAULT '[]', -- Array of validation errors
    processing_errors JSONB DEFAULT '[]', -- Array of processing errors
    
    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0,
    current_operation TEXT,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create CSV import rows table for detailed error tracking
CREATE TABLE csv_import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES csv_imports(id) ON DELETE CASCADE,
    
    -- Row information
    row_number INTEGER NOT NULL,
    raw_data JSONB NOT NULL, -- Original CSV row data
    mapped_data JSONB, -- Data after field mapping
    
    -- Processing status
    status VARCHAR(50) NOT NULL, -- success, failed, skipped, duplicate
    error_message TEXT,
    created_entity_id UUID, -- ID of created entity (participant, webinar, etc.)
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_csv_imports_user_id ON csv_imports(user_id);
CREATE INDEX idx_csv_imports_status ON csv_imports(status);
CREATE INDEX idx_csv_imports_import_type ON csv_imports(import_type);
CREATE INDEX idx_csv_imports_created_at ON csv_imports(created_at);

CREATE INDEX idx_csv_import_rows_import_id ON csv_import_rows(import_id);
CREATE INDEX idx_csv_import_rows_status ON csv_import_rows(status);
CREATE INDEX idx_csv_import_rows_row_number ON csv_import_rows(row_number);

-- Enable RLS
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_import_rows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for csv_imports
CREATE POLICY "Users can view their own CSV imports" 
  ON csv_imports 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CSV imports" 
  ON csv_imports 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CSV imports" 
  ON csv_imports 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CSV imports" 
  ON csv_imports 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for csv_import_rows
CREATE POLICY "Users can view their own CSV import rows" 
  ON csv_import_rows 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM csv_imports 
    WHERE csv_imports.id = csv_import_rows.import_id 
    AND csv_imports.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own CSV import rows" 
  ON csv_import_rows 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM csv_imports 
    WHERE csv_imports.id = csv_import_rows.import_id 
    AND csv_imports.user_id = auth.uid()
  ));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_csv_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_csv_imports_updated_at
    BEFORE UPDATE ON csv_imports
    FOR EACH ROW
    EXECUTE FUNCTION update_csv_imports_updated_at();
