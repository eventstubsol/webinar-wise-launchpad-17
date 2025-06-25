
-- Create audit_log table for tracking database changes
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_log
CREATE POLICY "Users can view audit logs for their own data" 
  ON public.audit_log 
  FOR SELECT 
  USING (changed_by = auth.uid());

-- Create function to get record history
CREATE OR REPLACE FUNCTION public.get_record_history(
  p_table_name TEXT,
  p_record_id TEXT
)
RETURNS TABLE (
  audit_id UUID,
  action TEXT,
  changes JSONB,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id as audit_id,
    al.action,
    CASE 
      WHEN al.action = 'DELETE' THEN al.old_data
      WHEN al.action = 'INSERT' THEN al.new_data
      ELSE jsonb_build_object('before', al.old_data, 'after', al.new_data)
    END as changes,
    al.changed_by,
    al.changed_at
  FROM public.audit_log al
  WHERE al.table_name = p_table_name 
    AND al.record_id = p_record_id
  ORDER BY al.changed_at DESC;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON public.audit_log(changed_by);
