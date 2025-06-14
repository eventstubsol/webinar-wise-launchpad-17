
-- Email Automation DB schema for Webinar Wise

-- Campaigns
create table email_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  workflow_id uuid references workflows(id),
  template_id uuid references email_templates(id),
  campaign_type text not null, -- registration, reminder, follow-up, etc
  subject_template text not null,
  audience_segment jsonb not null, -- segmentation rules
  send_schedule jsonb,             -- timing logic
  status text not null default 'draft', -- draft, scheduled, running, paused, completed
  last_run_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Emails sent/tracking/event logs
create table email_sends (
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

-- Email templates (rich, blocks & variables)
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  template_name text not null,
  category text not null, -- registration, reminder, follow-up, etc
  design_json jsonb not null, -- block data for drag-and-drop builder
  html_template text not null,
  variables jsonb default '[]'::jsonb,
  is_public boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Template blocks (for reusable drag/drop sections)
create table email_template_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  block_type text not null,
  block_content jsonb not null,
  block_html text,
  is_system boolean not null default false,
  created_at timestamptz default now()
);

-- Unsubscribe/preferences (GDPR compliance)
create table email_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  unsubscribed boolean default false,
  preferences jsonb,
  unsubscribed_at timestamptz,
  updated_at timestamptz default now()
);

-- Bounce and complaint logs
create table email_bounces (
  id uuid primary key default gen_random_uuid(),
  email_send_id uuid references email_sends(id),
  recipient_email text not null,
  event_type text not null, -- bounced, complained
  event_data jsonb,
  received_at timestamptz default now()
);

-- Indexes
create index idx_campaign_user on email_campaigns(user_id);
create index idx_template_user on email_templates(user_id);
create index idx_email_send_campaign on email_sends(campaign_id);
create index idx_pref_user on email_preferences(user_id);
create index idx_bounce_email on email_bounces(recipient_email);

-- For RLS, user_id columns throughout are required.
