
// User types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Authentication types
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
}

// Webinar types
export interface Webinar {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  max_attendees?: number;
  host_id: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';
  meeting_url?: string;
  recording_url?: string;
  created_at: string;
  updated_at: string;
}

// Registration types
export interface WebinarRegistration {
  id: string;
  webinar_id: string;
  user_id: string;
  registered_at: string;
  attended: boolean;
  join_time?: string;
  leave_time?: string;
}

// Analytics types
export interface WebinarAnalytics {
  webinar_id: string;
  total_registrations: number;
  total_attendees: number;
  attendance_rate: number;
  average_watch_time: number;
  engagement_score: number;
}

// UI Component types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

// Form types
export interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}
