-- Security Enhancement Phase 2: Monitoring and Logging

-- Create security logs table for monitoring
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security_logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for security logs
CREATE POLICY "Service role can manage security logs" ON public.security_logs
  FOR ALL USING (true);

-- Admins can view security logs (when user roles system is implemented)
CREATE POLICY "Admins can view security logs" ON public.security_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own security events
CREATE POLICY "Users can view their own security logs" ON public.security_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for security logs
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX idx_security_logs_created_at ON public.security_logs(created_at);
CREATE INDEX idx_security_logs_ip_address ON public.security_logs(ip_address);
CREATE INDEX idx_security_logs_severity ON public.security_logs(severity);

-- Create a function to clean up old security logs
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Delete logs older than 90 days
  DELETE FROM public.security_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$function$;

-- Create audit log enhancements for tracking security-related changes
CREATE OR REPLACE FUNCTION public.log_security_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Log security-sensitive table changes
  IF TG_TABLE_NAME IN ('profiles', 'zoom_connections', 'zoom_credentials') THEN
    INSERT INTO public.security_logs (
      event_type,
      user_id,
      metadata,
      severity
    ) VALUES (
      'sensitive_data_change',
      auth.uid(),
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', COALESCE(NEW.id, OLD.id)
      ),
      'medium'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Apply security change triggers to sensitive tables
CREATE TRIGGER security_log_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_security_change();

CREATE TRIGGER security_log_zoom_connections
  AFTER INSERT OR UPDATE OR DELETE ON public.zoom_connections
  FOR EACH ROW EXECUTE FUNCTION public.log_security_change();

CREATE TRIGGER security_log_zoom_credentials
  AFTER INSERT OR UPDATE OR DELETE ON public.zoom_credentials
  FOR EACH ROW EXECUTE FUNCTION public.log_security_change();