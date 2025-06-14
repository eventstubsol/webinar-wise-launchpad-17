
export type EmailTemplateCategory =
  | "registration"
  | "reminder"
  | "follow-up"
  | "re-engagement"
  | "thank-you"
  | "custom";

export interface EmailTemplate {
  id: string;
  user_id: string;
  template_name: string;
  category: EmailTemplateCategory;
  design_json: any;
  html_template: string;
  variables: string[];
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New fields from Phase 2
  tags?: string[];
  preview_image_url?: string;
  version_number?: number;
  is_system_template?: boolean;
  usage_count?: number;
  last_used_at?: string;
  rating?: number;
  rating_count?: number;
}

export interface EmailTemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  template_name: string;
  design_json: any;
  html_template: string;
  variables: string[];
  created_by: string;
  created_at: string;
  change_summary?: string;
  is_published: boolean;
}

export interface EmailTemplateCollection {
  id: string;
  user_id: string;
  collection_name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  user_id: string;
  workflow_id?: string;
  template_id: string;
  campaign_type: EmailTemplateCategory | string;
  subject_template: string;
  audience_segment: any;
  send_schedule?: any;
  status: "draft" | "scheduled" | "running" | "paused" | "completed";
  last_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailSend {
  id: string;
  campaign_id?: string;
  recipient_email: string;
  recipient_id?: string;
  subject: string;
  body_html: string;
  status: string;
  send_time?: string;
  open_time?: string;
  click_time?: string;
  bounce_time?: string;
  complaint_time?: string;
  unsubscribe_time?: string;
  error_message?: string;
  error_type?: string;
  metadata?: any;
  ab_variant?: string;
  created_at: string;
}

export interface EmailPreference {
  id: string;
  user_id: string;
  unsubscribed: boolean;
  preferences: any;
  unsubscribed_at?: string;
  updated_at: string;
}

export interface EmailBounce {
  id: string;
  email_send_id?: string;
  recipient_email: string;
  event_type: string;
  event_data?: any;
  received_at: string;
}
