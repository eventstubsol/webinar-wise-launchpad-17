
-- Add missing columns to csv_imports table
ALTER TABLE public.csv_imports 
ADD COLUMN IF NOT EXISTS validation_errors jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS duplicate_rows integer DEFAULT 0;

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  browser_notifications_enabled boolean DEFAULT false,
  toast_notifications_enabled boolean DEFAULT true,
  email_notifications_enabled boolean DEFAULT false,
  notification_types jsonb DEFAULT '["sync_complete", "sync_failed", "rate_limit_warning"]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Add unique constraint to ensure one preference record per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Add updated_at trigger for notification_preferences
CREATE TRIGGER handle_updated_at_notification_preferences
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
