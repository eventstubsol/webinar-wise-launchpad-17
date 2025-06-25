
-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users,
  name text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'email',
  subject_template text NOT NULL,
  content_template text,
  audience_segment jsonb DEFAULT '{}',
  schedule_config jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- Create campaign performance summaries table
CREATE TABLE IF NOT EXISTS public.campaign_performance_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  total_sent integer NOT NULL DEFAULT 0,
  total_delivered integer NOT NULL DEFAULT 0,
  total_opened integer NOT NULL DEFAULT 0,
  total_clicked integer NOT NULL DEFAULT 0,
  total_bounced integer NOT NULL DEFAULT 0,
  total_unsubscribed integer NOT NULL DEFAULT 0,
  open_rate decimal(5,2) DEFAULT 0,
  click_rate decimal(5,2) DEFAULT 0,
  bounce_rate decimal(5,2) DEFAULT 0,
  conversion_rate decimal(5,2) DEFAULT 0,
  revenue_generated decimal(10,2) DEFAULT 0,
  cost_per_click decimal(10,2) DEFAULT 0,
  roi decimal(10,2) DEFAULT 0,
  engagement_score decimal(5,2) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create export queue table
CREATE TABLE IF NOT EXISTS public.export_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users,
  export_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  progress_percentage integer NOT NULL DEFAULT 0,
  file_url text,
  file_size integer,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  error_message text,
  export_config jsonb NOT NULL DEFAULT '{}',
  performance_metrics jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create dead letter queue table for failed exports
CREATE TABLE IF NOT EXISTS public.export_dead_letter_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users,
  original_job_id uuid NOT NULL REFERENCES public.export_queue(id),
  export_type text NOT NULL,
  failure_reason text NOT NULL,
  retry_history jsonb NOT NULL DEFAULT '[]',
  export_config jsonb NOT NULL DEFAULT '{}',
  moved_to_dlq_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own campaigns" ON public.campaigns
  FOR ALL USING (auth.uid() = user_id);

-- Add RLS policies for campaign performance summaries
ALTER TABLE public.campaign_performance_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their campaign performance" ON public.campaign_performance_summaries
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = auth.uid()
    )
  );

-- Add RLS policies for export queue
ALTER TABLE public.export_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their export jobs" ON public.export_queue
  FOR ALL USING (auth.uid() = user_id);

-- Add RLS policies for dead letter queue
ALTER TABLE public.export_dead_letter_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their dead letter jobs" ON public.export_dead_letter_queue
  FOR SELECT USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON public.campaigns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign ON public.campaign_performance_summaries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_export_queue_user_status ON public.export_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_export_dlq_user ON public.export_dead_letter_queue(user_id);

-- Add updated_at triggers
CREATE OR REPLACE TRIGGER handle_updated_at_campaigns
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE TRIGGER handle_updated_at_campaign_performance
  BEFORE UPDATE ON public.campaign_performance_summaries
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE TRIGGER handle_updated_at_export_queue
  BEFORE UPDATE ON public.export_queue
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
