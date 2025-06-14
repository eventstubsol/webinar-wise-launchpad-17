
-- Create email campaigns table (extending the existing email automation schema)
CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  workflow_id uuid references workflows(id),
  template_id uuid references email_templates(id),
  campaign_type text not null, -- registration, reminder, follow-up, etc
  subject_template text not null,
  audience_segment jsonb not null default '{}'::jsonb, -- segmentation rules
  send_schedule jsonb,             -- timing logic
  status text not null default 'draft', -- draft, scheduled, running, paused, completed
  last_run_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at);

-- Create email sends table
CREATE TABLE IF NOT EXISTS email_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references email_campaigns(id),
  recipient_email text not null,
  recipient_id uuid references profiles(id),
  subject text,
  body_html text,
  status text not null default 'pending', -- pending, sent, delivered, bounced, complained, opened, clicked, unsubscribed
  send_time timestamptz,
  open_time timestamptz,
  click_time timestamptz,
  bounce_time timestamptz,
  complaint_time timestamptz,
  unsubscribe_time timestamptz,
  error_message text,
  error_type text,
  metadata jsonb,
  ab_variant text,
  created_at timestamptz default now()
);

-- Create email preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  unsubscribed boolean default false,
  preferences jsonb,
  unsubscribed_at timestamptz,
  updated_at timestamptz default now()
);

-- Create email bounces table
CREATE TABLE IF NOT EXISTS email_bounces (
  id uuid primary key default gen_random_uuid(),
  email_send_id uuid references email_sends(id),
  recipient_email text not null,
  event_type text not null, -- bounced, complained
  event_data jsonb,
  received_at timestamptz default now()
);

-- Create email template blocks table
CREATE TABLE IF NOT EXISTS email_template_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  block_type text not null,
  block_content jsonb not null,
  block_html text,
  is_system boolean not null default false,
  created_at timestamptz default now()
);

-- Add indexes for email sends and preferences
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_id ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_recipient_email ON email_sends(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_bounces_recipient_email ON email_bounces(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_template_blocks_user_id ON email_template_blocks(user_id);

-- Update email_templates to ensure it has the right structure
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS category text not null default 'custom',
ADD COLUMN IF NOT EXISTS design_json jsonb not null default '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_public boolean default false,
ADD COLUMN IF NOT EXISTS is_active boolean default true;
