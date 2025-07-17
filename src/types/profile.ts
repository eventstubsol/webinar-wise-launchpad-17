
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  company?: string;
  job_title?: string;
  phone?: string;
  role?: 'owner' | 'admin' | 'member';
  is_zoom_admin?: boolean;
  zoom_account_level?: string;
  created_at: string;
  updated_at: string;
}
