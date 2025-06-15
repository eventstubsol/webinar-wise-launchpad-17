
-- Create sync_progress table for real-time progress tracking
CREATE TABLE public.sync_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_id UUID NOT NULL REFERENCES zoom_sync_logs(id) ON DELETE CASCADE,
  total_webinars INTEGER NOT NULL DEFAULT 0,
  completed_webinars INTEGER NOT NULL DEFAULT 0,
  current_webinar_name TEXT,
  current_webinar_index INTEGER DEFAULT 0,
  current_stage TEXT,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sync_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sync_progress
CREATE POLICY "Users can view their own sync progress" 
  ON public.sync_progress 
  FOR SELECT 
  USING (
    sync_id IN (
      SELECT id FROM zoom_sync_logs 
      WHERE connection_id IN (
        SELECT id FROM zoom_connections WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage sync progress" 
  ON public.sync_progress 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_sync_progress_sync_id ON sync_progress(sync_id);
CREATE INDEX idx_sync_progress_updated_at ON sync_progress(updated_at);

-- Enable real-time replication
ALTER TABLE sync_progress REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_progress;

-- Create trigger to update updated_at
CREATE TRIGGER update_sync_progress_updated_at
  BEFORE UPDATE ON sync_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
