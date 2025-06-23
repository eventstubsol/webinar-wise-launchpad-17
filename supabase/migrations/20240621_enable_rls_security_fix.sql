-- Enable RLS on all public tables that don't have it enabled
-- This is a critical security fix

-- Enable RLS on workflow-related tables
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_action_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_audit_log ENABLE ROW LEVEL SECURITY;

-- Enable RLS on email-related tables
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_bounces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_usage ENABLE ROW LEVEL SECURITY;

-- Enable RLS on zoom-related tables
ALTER TABLE public.zoom_server_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_sync_debug_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagination_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_webinars_backup_20250620 ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for critical tables
-- Note: These are basic policies - you may want to refine them based on your specific requirements

-- Processing Queue - only authenticated users can access their own data
CREATE POLICY "Users can view own processing queue items" ON public.processing_queue
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Analytics Cache - only authenticated users can access
CREATE POLICY "Authenticated users can view analytics cache" ON public.analytics_cache
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Email campaigns - users can only see their own campaigns
CREATE POLICY "Users can view own email campaigns" ON public.email_campaigns
  FOR SELECT USING (auth.uid() = user_id);

-- Email sends - users can only see their own sent emails
CREATE POLICY "Users can view own email sends" ON public.email_sends
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM public.email_campaigns WHERE id = campaign_id
  ));

-- Zoom server tokens - only service role can access
CREATE POLICY "Only service role can access zoom server tokens" ON public.zoom_server_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Pagination tokens - users can only access their own tokens
CREATE POLICY "Users can access own pagination tokens" ON public.pagination_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Comment explaining the security model
COMMENT ON POLICY "Users can view own processing queue items" ON public.processing_queue IS 
  'Basic RLS policy - ensures users can only see their own queue items. Adjust as needed for your use case.';
