export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      analytics_cache: {
        Row: {
          cache_data: Json
          cache_key: string
          cache_version: number | null
          created_at: string | null
          dependencies: string[] | null
          expires_at: string
          id: string
          updated_at: string | null
        }
        Insert: {
          cache_data: Json
          cache_key: string
          cache_version?: number | null
          created_at?: string | null
          dependencies?: string[] | null
          expires_at: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          cache_data?: Json
          cache_key?: string
          cache_version?: number | null
          created_at?: string | null
          dependencies?: string[] | null
          expires_at?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          change_context: string | null
          changed_at: string
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          change_context?: string | null
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          change_context?: string | null
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      campaign_performance_summaries: {
        Row: {
          bounce_rate: number | null
          campaign_id: string
          click_rate: number | null
          conversion_rate: number | null
          cost_per_click: number | null
          created_at: string
          engagement_score: number | null
          id: string
          open_rate: number | null
          revenue_generated: number | null
          roi: number | null
          total_bounced: number
          total_clicked: number
          total_delivered: number
          total_opened: number
          total_sent: number
          total_unsubscribed: number
          updated_at: string
        }
        Insert: {
          bounce_rate?: number | null
          campaign_id: string
          click_rate?: number | null
          conversion_rate?: number | null
          cost_per_click?: number | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          open_rate?: number | null
          revenue_generated?: number | null
          roi?: number | null
          total_bounced?: number
          total_clicked?: number
          total_delivered?: number
          total_opened?: number
          total_sent?: number
          total_unsubscribed?: number
          updated_at?: string
        }
        Update: {
          bounce_rate?: number | null
          campaign_id?: string
          click_rate?: number | null
          conversion_rate?: number | null
          cost_per_click?: number | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          open_rate?: number | null
          revenue_generated?: number | null
          roi?: number | null
          total_bounced?: number
          total_clicked?: number
          total_delivered?: number
          total_opened?: number
          total_sent?: number
          total_unsubscribed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_performance_summaries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_segment: Json | null
          campaign_type: string
          completed_at: string | null
          content_template: string | null
          created_at: string
          id: string
          name: string
          schedule_config: Json | null
          sent_at: string | null
          status: string
          subject_template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audience_segment?: Json | null
          campaign_type?: string
          completed_at?: string | null
          content_template?: string | null
          created_at?: string
          id?: string
          name: string
          schedule_config?: Json | null
          sent_at?: string | null
          status?: string
          subject_template: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audience_segment?: Json | null
          campaign_type?: string
          completed_at?: string | null
          content_template?: string | null
          created_at?: string
          id?: string
          name?: string
          schedule_config?: Json | null
          sent_at?: string | null
          status?: string
          subject_template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connection_health_log: {
        Row: {
          connection_type: string
          created_at: string
          error_message: string | null
          id: string
          ping_time_ms: number | null
          recorded_at: string
          status: string
          user_id: string
        }
        Insert: {
          connection_type: string
          created_at?: string
          error_message?: string | null
          id?: string
          ping_time_ms?: number | null
          recorded_at?: string
          status?: string
          user_id: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ping_time_ms?: number | null
          recorded_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      csv_imports: {
        Row: {
          completed_at: string | null
          created_at: string
          duplicate_rows: number | null
          failed_rows: number | null
          field_mapping: Json
          file_name: string
          file_size: number
          id: string
          import_options: Json
          import_type: string
          original_filename: string
          processing_errors: Json | null
          progress_percentage: number | null
          started_at: string | null
          status: string
          successful_rows: number | null
          total_rows: number
          updated_at: string
          user_id: string
          validation_errors: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duplicate_rows?: number | null
          failed_rows?: number | null
          field_mapping: Json
          file_name: string
          file_size: number
          id?: string
          import_options: Json
          import_type: string
          original_filename: string
          processing_errors?: Json | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string
          successful_rows?: number | null
          total_rows: number
          updated_at?: string
          user_id: string
          validation_errors?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duplicate_rows?: number | null
          failed_rows?: number | null
          field_mapping?: Json
          file_name?: string
          file_size?: number
          id?: string
          import_options?: Json
          import_type?: string
          original_filename?: string
          processing_errors?: Json | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string
          successful_rows?: number | null
          total_rows?: number
          updated_at?: string
          user_id?: string
          validation_errors?: Json | null
        }
        Relationships: []
      }
      export_dead_letter_queue: {
        Row: {
          created_at: string
          export_config: Json
          export_type: string
          failure_reason: string
          id: string
          moved_to_dlq_at: string
          original_job_id: string
          retry_history: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          export_config?: Json
          export_type: string
          failure_reason: string
          id?: string
          moved_to_dlq_at?: string
          original_job_id: string
          retry_history?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          export_config?: Json
          export_type?: string
          failure_reason?: string
          id?: string
          moved_to_dlq_at?: string
          original_job_id?: string
          retry_history?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_dead_letter_queue_original_job_id_fkey"
            columns: ["original_job_id"]
            isOneToOne: false
            referencedRelation: "export_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      export_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          export_config: Json
          export_type: string
          file_size: number | null
          file_url: string | null
          id: string
          max_retries: number
          performance_metrics: Json | null
          progress_percentage: number
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          export_config?: Json
          export_type: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          max_retries?: number
          performance_metrics?: Json | null
          progress_percentage?: number
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          export_config?: Json
          export_type?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          max_retries?: number
          performance_metrics?: Json | null
          progress_percentage?: number
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          browser_notifications_enabled: boolean | null
          created_at: string
          email_notifications_enabled: boolean | null
          id: string
          notification_types: Json | null
          toast_notifications_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_notifications_enabled?: boolean | null
          created_at?: string
          email_notifications_enabled?: boolean | null
          id?: string
          notification_types?: Json | null
          toast_notifications_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_notifications_enabled?: boolean | null
          created_at?: string
          email_notifications_enabled?: boolean | null
          id?: string
          notification_types?: Json | null
          toast_notifications_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invitation_token: string | null
          invited_by: string | null
          organization_id: string | null
          role: string | null
          status: string | null
          updated_at: string | null
          zoom_email: string
          zoom_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_token?: string | null
          invited_by?: string | null
          organization_id?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          zoom_email: string
          zoom_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_token?: string | null
          invited_by?: string | null
          organization_id?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          zoom_email?: string
          zoom_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          organization_id: string | null
          permissions: Json | null
          role: string
          updated_at: string | null
          user_id: string | null
          zoom_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          organization_id?: string | null
          permissions?: Json | null
          role: string
          updated_at?: string | null
          user_id?: string | null
          zoom_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          organization_id?: string | null
          permissions?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
          zoom_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          owner_user_id: string | null
          settings: Json | null
          subscription_plan: string | null
          updated_at: string | null
          zoom_account_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          owner_user_id?: string | null
          settings?: Json | null
          subscription_plan?: string | null
          updated_at?: string | null
          zoom_account_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          owner_user_id?: string | null
          settings?: Json | null
          subscription_plan?: string | null
          updated_at?: string | null
          zoom_account_id?: string
        }
        Relationships: []
      }
      processing_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          priority: number | null
          retry_count: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          task_data: Json
          task_type: string
          updated_at: string | null
          user_id: string | null
          webinar_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          task_data: Json
          task_type: string
          updated_at?: string | null
          user_id?: string | null
          webinar_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          task_data?: Json
          task_type?: string
          updated_at?: string | null
          user_id?: string | null
          webinar_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_zoom_admin: boolean | null
          job_title: string | null
          organization_id: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
          zoom_account_id: string | null
          zoom_account_level: string | null
          zoom_provider_refresh_token: string | null
          zoom_provider_token: string | null
          zoom_user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_zoom_admin?: boolean | null
          job_title?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          zoom_account_id?: string | null
          zoom_account_level?: string | null
          zoom_provider_refresh_token?: string | null
          zoom_provider_token?: string | null
          zoom_user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_zoom_admin?: boolean | null
          job_title?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          zoom_account_id?: string | null
          zoom_account_level?: string | null
          zoom_provider_refresh_token?: string | null
          zoom_provider_token?: string | null
          zoom_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_tracking: {
        Row: {
          api_calls_limit: number
          api_calls_made: number
          connection_id: string
          created_at: string
          id: string
          reset_time: string
          updated_at: string
          user_id: string
          warning_threshold: number | null
        }
        Insert: {
          api_calls_limit?: number
          api_calls_made?: number
          connection_id: string
          created_at?: string
          id?: string
          reset_time: string
          updated_at?: string
          user_id: string
          warning_threshold?: number | null
        }
        Update: {
          api_calls_limit?: number
          api_calls_made?: number
          connection_id?: string
          created_at?: string
          id?: string
          reset_time?: string
          updated_at?: string
          user_id?: string
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_tracking_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_syncs: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          scheduled_for: string
          status: string
          sync_config: Json
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          scheduled_for: string
          status?: string
          sync_config?: Json
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          scheduled_for?: string
          status?: string
          sync_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_syncs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_performance_metrics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_unit: string | null
          metric_value: number
          recorded_at: string | null
          sync_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          recorded_at?: string | null
          sync_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          recorded_at?: string | null
          sync_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_performance_metrics_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "zoom_sync_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_progress: {
        Row: {
          completed_webinars: number
          current_stage: string | null
          current_webinar_index: number | null
          current_webinar_name: string | null
          estimated_completion: string | null
          id: string
          started_at: string
          sync_id: string
          total_webinars: number
          updated_at: string
        }
        Insert: {
          completed_webinars?: number
          current_stage?: string | null
          current_webinar_index?: number | null
          current_webinar_name?: string | null
          estimated_completion?: string | null
          id?: string
          started_at?: string
          sync_id: string
          total_webinars?: number
          updated_at?: string
        }
        Update: {
          completed_webinars?: number
          current_stage?: string | null
          current_webinar_index?: number | null
          current_webinar_name?: string | null
          estimated_completion?: string | null
          id?: string
          started_at?: string
          sync_id?: string
          total_webinars?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_progress_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "zoom_sync_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_progress_updates: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          message: string
          progress_percentage: number | null
          sync_id: string
          update_type: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          message: string
          progress_percentage?: number | null
          sync_id: string
          update_type: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string
          progress_percentage?: number | null
          sync_id?: string
          update_type?: string
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          estimated_duration_seconds: number | null
          id: string
          queue_position: number
          started_at: string | null
          status: string | null
          sync_id: string
          updated_at: string | null
          webinar_id: string | null
          webinar_title: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          estimated_duration_seconds?: number | null
          id?: string
          queue_position: number
          started_at?: string | null
          status?: string | null
          sync_id: string
          updated_at?: string | null
          webinar_id?: string | null
          webinar_title?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          estimated_duration_seconds?: number | null
          id?: string
          queue_position?: number
          started_at?: string | null
          status?: string | null
          sync_id?: string
          updated_at?: string | null
          webinar_id?: string | null
          webinar_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "zoom_sync_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_schedules: {
        Row: {
          config: Json
          connection_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          connection_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          connection_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_schedules_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_state: {
        Row: {
          connection_id: string
          created_at: string | null
          id: string
          last_processed_item: string | null
          processed_items: number | null
          state_data: Json | null
          state_type: string
          sync_id: string
          total_items: number | null
          updated_at: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          id?: string
          last_processed_item?: string | null
          processed_items?: number | null
          state_data?: Json | null
          state_type: string
          sync_id: string
          total_items?: number | null
          updated_at?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          id?: string
          last_processed_item?: string | null
          processed_items?: number | null
          state_data?: Json | null
          state_type?: string
          sync_id?: string
          total_items?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_organizations: {
        Row: {
          admin_user_id: string | null
          created_at: string | null
          id: string
          managed_user_id: string | null
          permissions: Json | null
          relationship_type: string | null
          updated_at: string | null
          zoom_account_id: string
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          managed_user_id?: string | null
          permissions?: Json | null
          relationship_type?: string | null
          updated_at?: string | null
          zoom_account_id: string
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          managed_user_id?: string | null
          permissions?: Json | null
          relationship_type?: string | null
          updated_at?: string | null
          zoom_account_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          theme_preference: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id: string
          marketing_emails?: boolean | null
          theme_preference?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          theme_preference?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webinar_metrics: {
        Row: {
          actual_participant_count: number | null
          avg_attendance_duration: number | null
          created_at: string | null
          id: string
          participant_sync_attempted_at: string | null
          participant_sync_completed_at: string | null
          participant_sync_error: string | null
          participant_sync_status: string | null
          total_absentees: number | null
          total_attendees: number | null
          total_minutes: number | null
          unique_attendees: number | null
          updated_at: string | null
          webinar_id: string
        }
        Insert: {
          actual_participant_count?: number | null
          avg_attendance_duration?: number | null
          created_at?: string | null
          id?: string
          participant_sync_attempted_at?: string | null
          participant_sync_completed_at?: string | null
          participant_sync_error?: string | null
          participant_sync_status?: string | null
          total_absentees?: number | null
          total_attendees?: number | null
          total_minutes?: number | null
          unique_attendees?: number | null
          updated_at?: string | null
          webinar_id: string
        }
        Update: {
          actual_participant_count?: number | null
          avg_attendance_duration?: number | null
          created_at?: string | null
          id?: string
          participant_sync_attempted_at?: string | null
          participant_sync_completed_at?: string | null
          participant_sync_error?: string | null
          participant_sync_status?: string | null
          total_absentees?: number | null
          total_attendees?: number | null
          total_minutes?: number | null
          unique_attendees?: number | null
          updated_at?: string | null
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_metrics_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: true
            referencedRelation: "organization_webinars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinar_metrics_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: true
            referencedRelation: "zoom_webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      webinar_sync_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          priority: number | null
          processing_status: string | null
          retry_count: number | null
          scheduled_at: string | null
          started_at: string | null
          sync_id: string
          updated_at: string | null
          webinar_id: string
          webinar_type: string
          webinar_uuid: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          priority?: number | null
          processing_status?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          sync_id: string
          updated_at?: string | null
          webinar_id: string
          webinar_type: string
          webinar_uuid?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          priority?: number | null
          processing_status?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          sync_id?: string
          updated_at?: string | null
          webinar_id?: string
          webinar_type?: string
          webinar_uuid?: string | null
        }
        Relationships: []
      }
      zoom_connections: {
        Row: {
          access_token: string
          can_view_all_users: boolean | null
          connection_status: string
          connection_type: string
          created_at: string
          id: string
          is_account_admin: boolean | null
          is_active: boolean | null
          is_primary: boolean
          last_sync_at: string | null
          organization_id: string | null
          refresh_token: string | null
          scopes: string[]
          token_expires_at: string
          updated_at: string
          user_id: string
          zoom_account_id: string
          zoom_account_type: string
          zoom_email: string
          zoom_role: string | null
          zoom_role_id: string | null
          zoom_user_id: string
        }
        Insert: {
          access_token: string
          can_view_all_users?: boolean | null
          connection_status?: string
          connection_type?: string
          created_at?: string
          id?: string
          is_account_admin?: boolean | null
          is_active?: boolean | null
          is_primary?: boolean
          last_sync_at?: string | null
          organization_id?: string | null
          refresh_token?: string | null
          scopes?: string[]
          token_expires_at: string
          updated_at?: string
          user_id: string
          zoom_account_id: string
          zoom_account_type?: string
          zoom_email: string
          zoom_role?: string | null
          zoom_role_id?: string | null
          zoom_user_id: string
        }
        Update: {
          access_token?: string
          can_view_all_users?: boolean | null
          connection_status?: string
          connection_type?: string
          created_at?: string
          id?: string
          is_account_admin?: boolean | null
          is_active?: boolean | null
          is_primary?: boolean
          last_sync_at?: string | null
          organization_id?: string | null
          refresh_token?: string | null
          scopes?: string[]
          token_expires_at?: string
          updated_at?: string
          user_id?: string
          zoom_account_id?: string
          zoom_account_type?: string
          zoom_email?: string
          zoom_role?: string | null
          zoom_role_id?: string | null
          zoom_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoom_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_credentials: {
        Row: {
          account_id: string
          app_name: string | null
          app_type: string
          client_id: string
          client_secret: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          app_name?: string | null
          app_type?: string
          client_id: string
          client_secret: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          app_name?: string | null
          app_type?: string
          client_id?: string
          client_secret?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zoom_participant_sessions: {
        Row: {
          created_at: string | null
          duration: number | null
          id: string
          join_time: string | null
          leave_time: string | null
          participant_id: string | null
          session_id: string | null
          updated_at: string | null
          webinar_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          id?: string
          join_time?: string | null
          leave_time?: string | null
          participant_id?: string | null
          session_id?: string | null
          updated_at?: string | null
          webinar_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          id?: string
          join_time?: string | null
          leave_time?: string | null
          participant_id?: string | null
          session_id?: string | null
          updated_at?: string | null
          webinar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_participant_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "zoom_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_participants: {
        Row: {
          answered_polling: boolean | null
          asked_question: boolean | null
          attentiveness_score: number | null
          camera_on_duration: number | null
          city: string | null
          country: string | null
          created_at: string
          customer_key: string | null
          device: string | null
          duration: number | null
          email: string | null
          failover: boolean | null
          first_join_time: string | null
          id: string
          ip_address: string | null
          is_aggregated: boolean | null
          is_rejoin_session: boolean | null
          join_time: string | null
          last_leave_time: string | null
          leave_time: string | null
          location: string | null
          name: string
          network_type: string | null
          participant_email: string | null
          participant_id: string | null
          participant_name: string | null
          participant_session_id: string | null
          participant_status: string | null
          participant_user_id: string | null
          participant_uuid: string | null
          posted_chat: boolean | null
          raised_hand: boolean | null
          registrant_id: string | null
          session_count: number | null
          session_sequence: number | null
          share_application_duration: number | null
          share_desktop_duration: number | null
          share_whiteboard_duration: number | null
          status: string | null
          total_duration: number | null
          updated_at: string
          user_id: string | null
          version: string | null
          webinar_id: string | null
        }
        Insert: {
          answered_polling?: boolean | null
          asked_question?: boolean | null
          attentiveness_score?: number | null
          camera_on_duration?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          customer_key?: string | null
          device?: string | null
          duration?: number | null
          email?: string | null
          failover?: boolean | null
          first_join_time?: string | null
          id?: string
          ip_address?: string | null
          is_aggregated?: boolean | null
          is_rejoin_session?: boolean | null
          join_time?: string | null
          last_leave_time?: string | null
          leave_time?: string | null
          location?: string | null
          name: string
          network_type?: string | null
          participant_email?: string | null
          participant_id?: string | null
          participant_name?: string | null
          participant_session_id?: string | null
          participant_status?: string | null
          participant_user_id?: string | null
          participant_uuid?: string | null
          posted_chat?: boolean | null
          raised_hand?: boolean | null
          registrant_id?: string | null
          session_count?: number | null
          session_sequence?: number | null
          share_application_duration?: number | null
          share_desktop_duration?: number | null
          share_whiteboard_duration?: number | null
          status?: string | null
          total_duration?: number | null
          updated_at?: string
          user_id?: string | null
          version?: string | null
          webinar_id?: string | null
        }
        Update: {
          answered_polling?: boolean | null
          asked_question?: boolean | null
          attentiveness_score?: number | null
          camera_on_duration?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          customer_key?: string | null
          device?: string | null
          duration?: number | null
          email?: string | null
          failover?: boolean | null
          first_join_time?: string | null
          id?: string
          ip_address?: string | null
          is_aggregated?: boolean | null
          is_rejoin_session?: boolean | null
          join_time?: string | null
          last_leave_time?: string | null
          leave_time?: string | null
          location?: string | null
          name?: string
          network_type?: string | null
          participant_email?: string | null
          participant_id?: string | null
          participant_name?: string | null
          participant_session_id?: string | null
          participant_status?: string | null
          participant_user_id?: string | null
          participant_uuid?: string | null
          posted_chat?: boolean | null
          raised_hand?: boolean | null
          registrant_id?: string | null
          session_count?: number | null
          session_sequence?: number | null
          share_application_duration?: number | null
          share_desktop_duration?: number | null
          share_whiteboard_duration?: number | null
          status?: string | null
          total_duration?: number | null
          updated_at?: string
          user_id?: string | null
          version?: string | null
          webinar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_participants_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "organization_webinars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoom_participants_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_poll_responses: {
        Row: {
          created_at: string
          date_time: string | null
          id: string
          participant_email: string | null
          participant_name: string | null
          poll_id: string | null
          question_details: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_time?: string | null
          id?: string
          participant_email?: string | null
          participant_name?: string | null
          poll_id?: string | null
          question_details?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_time?: string | null
          id?: string
          participant_email?: string | null
          participant_name?: string | null
          poll_id?: string | null
          question_details?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoom_poll_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "zoom_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_polls: {
        Row: {
          anonymous: boolean | null
          created_at: string
          id: string
          poll_id: string
          poll_type: number | null
          questions: Json | null
          status: string | null
          title: string
          updated_at: string
          webinar_id: string | null
        }
        Insert: {
          anonymous?: boolean | null
          created_at?: string
          id?: string
          poll_id: string
          poll_type?: number | null
          questions?: Json | null
          status?: string | null
          title: string
          updated_at?: string
          webinar_id?: string | null
        }
        Update: {
          anonymous?: boolean | null
          created_at?: string
          id?: string
          poll_id?: string
          poll_type?: number | null
          questions?: Json | null
          status?: string | null
          title?: string
          updated_at?: string
          webinar_id?: string | null
        }
        Relationships: []
      }
      zoom_qna: {
        Row: {
          answer_details: Json | null
          created_at: string
          id: string
          question_details: Json | null
          updated_at: string
          webinar_id: string | null
        }
        Insert: {
          answer_details?: Json | null
          created_at?: string
          id?: string
          question_details?: Json | null
          updated_at?: string
          webinar_id?: string | null
        }
        Update: {
          answer_details?: Json | null
          created_at?: string
          id?: string
          question_details?: Json | null
          updated_at?: string
          webinar_id?: string | null
        }
        Relationships: []
      }
      zoom_recordings: {
        Row: {
          created_at: string
          download_url: string | null
          file_size: number | null
          file_type: string | null
          id: string
          meeting_uuid: string | null
          play_url: string | null
          recording_end: string | null
          recording_id: string
          recording_start: string | null
          recording_type: string | null
          status: string | null
          updated_at: string
          webinar_id: string | null
        }
        Insert: {
          created_at?: string
          download_url?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          meeting_uuid?: string | null
          play_url?: string | null
          recording_end?: string | null
          recording_id: string
          recording_start?: string | null
          recording_type?: string | null
          status?: string | null
          updated_at?: string
          webinar_id?: string | null
        }
        Update: {
          created_at?: string
          download_url?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          meeting_uuid?: string | null
          play_url?: string | null
          recording_end?: string | null
          recording_id?: string
          recording_start?: string | null
          recording_type?: string | null
          status?: string | null
          updated_at?: string
          webinar_id?: string | null
        }
        Relationships: []
      }
      zoom_registrants: {
        Row: {
          address: string | null
          attended: boolean | null
          city: string | null
          comments: string | null
          country: string | null
          create_time: string | null
          created_at: string
          custom_questions: Json | null
          duration: number | null
          email: string
          first_name: string | null
          id: string
          industry: string | null
          job_title: string | null
          join_time: string | null
          join_url: string | null
          language: string | null
          last_name: string | null
          leave_time: string | null
          no_of_employees: string | null
          org: string | null
          phone: string | null
          purchasing_time_frame: string | null
          registrant_id: string | null
          registrant_uuid: string | null
          registration_time: string | null
          role_in_purchase_process: string | null
          source_id: string | null
          state: string | null
          status: string | null
          tracking_source: string | null
          updated_at: string
          webinar_id: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          attended?: boolean | null
          city?: string | null
          comments?: string | null
          country?: string | null
          create_time?: string | null
          created_at?: string
          custom_questions?: Json | null
          duration?: number | null
          email: string
          first_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          join_time?: string | null
          join_url?: string | null
          language?: string | null
          last_name?: string | null
          leave_time?: string | null
          no_of_employees?: string | null
          org?: string | null
          phone?: string | null
          purchasing_time_frame?: string | null
          registrant_id?: string | null
          registrant_uuid?: string | null
          registration_time?: string | null
          role_in_purchase_process?: string | null
          source_id?: string | null
          state?: string | null
          status?: string | null
          tracking_source?: string | null
          updated_at?: string
          webinar_id?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          attended?: boolean | null
          city?: string | null
          comments?: string | null
          country?: string | null
          create_time?: string | null
          created_at?: string
          custom_questions?: Json | null
          duration?: number | null
          email?: string
          first_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          join_time?: string | null
          join_url?: string | null
          language?: string | null
          last_name?: string | null
          leave_time?: string | null
          no_of_employees?: string | null
          org?: string | null
          phone?: string | null
          purchasing_time_frame?: string | null
          registrant_id?: string | null
          registrant_uuid?: string | null
          registration_time?: string | null
          role_in_purchase_process?: string | null
          source_id?: string | null
          state?: string | null
          status?: string | null
          tracking_source?: string | null
          updated_at?: string
          webinar_id?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      zoom_sync_logs: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string
          current_operation: string | null
          duration_seconds: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          metadata: Json | null
          processed_items: number | null
          stage_progress_percentage: number | null
          started_at: string
          status: string | null
          sync_progress: number | null
          sync_stage: string | null
          sync_status: string
          sync_type: string
          total_items: number | null
          updated_at: string
          webinars_synced: number | null
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string
          current_operation?: string | null
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          processed_items?: number | null
          stage_progress_percentage?: number | null
          started_at?: string
          status?: string | null
          sync_progress?: number | null
          sync_stage?: string | null
          sync_status?: string
          sync_type: string
          total_items?: number | null
          updated_at?: string
          webinars_synced?: number | null
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          current_operation?: string | null
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          processed_items?: number | null
          stage_progress_percentage?: number | null
          started_at?: string
          status?: string | null
          sync_progress?: number | null
          sync_stage?: string | null
          sync_status?: string
          sync_type?: string
          total_items?: number | null
          updated_at?: string
          webinars_synced?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinars: {
        Row: {
          agenda: string | null
          attendees_count: number | null
          connection_id: string
          created_at: string | null
          creation_source: string | null
          duration: number
          encrypted_password: string | null
          h323_password: string | null
          host_email: string
          host_id: string
          id: string
          join_url: string
          occurrences: Json | null
          participant_sync_attempted_at: string | null
          participant_sync_completed_at: string | null
          participant_sync_status: string | null
          password: string | null
          pstn_password: string | null
          recurrence: Json | null
          registrants_count: number | null
          registration_url: string | null
          settings: Json | null
          start_time: string
          start_url: string | null
          status: string
          synced_at: string | null
          timezone: string
          topic: string
          total_attendees: number | null
          total_registrants: number | null
          tracking_fields: Json | null
          transition_to_live: boolean | null
          type: number | null
          updated_at: string | null
          uuid: string | null
          zoom_uuid: string | null
          zoom_webinar_id: string
        }
        Insert: {
          agenda?: string | null
          attendees_count?: number | null
          connection_id: string
          created_at?: string | null
          creation_source?: string | null
          duration: number
          encrypted_password?: string | null
          h323_password?: string | null
          host_email: string
          host_id: string
          id?: string
          join_url: string
          occurrences?: Json | null
          participant_sync_attempted_at?: string | null
          participant_sync_completed_at?: string | null
          participant_sync_status?: string | null
          password?: string | null
          pstn_password?: string | null
          recurrence?: Json | null
          registrants_count?: number | null
          registration_url?: string | null
          settings?: Json | null
          start_time: string
          start_url?: string | null
          status: string
          synced_at?: string | null
          timezone: string
          topic: string
          total_attendees?: number | null
          total_registrants?: number | null
          tracking_fields?: Json | null
          transition_to_live?: boolean | null
          type?: number | null
          updated_at?: string | null
          uuid?: string | null
          zoom_uuid?: string | null
          zoom_webinar_id: string
        }
        Update: {
          agenda?: string | null
          attendees_count?: number | null
          connection_id?: string
          created_at?: string | null
          creation_source?: string | null
          duration?: number
          encrypted_password?: string | null
          h323_password?: string | null
          host_email?: string
          host_id?: string
          id?: string
          join_url?: string
          occurrences?: Json | null
          participant_sync_attempted_at?: string | null
          participant_sync_completed_at?: string | null
          participant_sync_status?: string | null
          password?: string | null
          pstn_password?: string | null
          recurrence?: Json | null
          registrants_count?: number | null
          registration_url?: string | null
          settings?: Json | null
          start_time?: string
          start_url?: string | null
          status?: string
          synced_at?: string | null
          timezone?: string
          topic?: string
          total_attendees?: number | null
          total_registrants?: number | null
          tracking_fields?: Json | null
          transition_to_live?: boolean | null
          type?: number | null
          updated_at?: string | null
          uuid?: string | null
          zoom_uuid?: string | null
          zoom_webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinars_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinars_backup: {
        Row: {
          actual_participant_count: number | null
          add_audio_watermark: boolean | null
          add_watermark: boolean | null
          additional_data: Json | null
          agenda: string | null
          allow_multiple_devices: boolean | null
          allow_multiple_view_on_same_device: boolean | null
          alternative_hosts: string[] | null
          alternative_hosts_email_notification: boolean | null
          approval_type: number | null
          attendees_and_panelists_reminder_email_notification: Json | null
          audio: string | null
          audio_conferencing: Json | null
          authentication_domains: string | null
          authentication_name: string | null
          authentication_option: string | null
          auto_recording: string | null
          avg_attendance_duration: number | null
          cloud_recording: Json | null
          connection_id: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          creation_source: string | null
          duration: number | null
          email_language: string | null
          email_notification: boolean | null
          enable_dedicated_pin_for_all_panelists: boolean | null
          encrypted_password: string | null
          enforce_login: boolean | null
          follow_up_absentees_email_notification: Json | null
          follow_up_attendees_email_notification: Json | null
          global_dial_in_countries: string[] | null
          global_dial_in_numbers: Json | null
          h323_password: string | null
          hd_video: boolean | null
          hd_video_for_attendees: boolean | null
          host_email: string | null
          host_id: string | null
          host_save_video_order: boolean | null
          host_video: boolean | null
          id: string | null
          is_simulive: boolean | null
          join_url: string | null
          language_interpretation: Json | null
          last_successful_sync: string | null
          last_synced_at: string | null
          max_attendees: number | null
          max_registrants: number | null
          meeting_authentication: boolean | null
          notify_registrants: boolean | null
          occurrence_id: string | null
          occurrences: Json | null
          on_demand: boolean | null
          panelists_invitation_email_notification: boolean | null
          panelists_video: boolean | null
          participant_sync_attempted_at: string | null
          participant_sync_completed_at: string | null
          participant_sync_error: string | null
          participant_sync_status: string | null
          password: string | null
          post_webinar_survey: boolean | null
          practice_session: boolean | null
          pstn_password: string | null
          question_answer: boolean | null
          record_file_id: string | null
          recurrence: Json | null
          registrants_confirmation_email: boolean | null
          registrants_email_notification: boolean | null
          registrants_restrict_by_domain: string | null
          registrants_restrict_number: number | null
          registration_required: boolean | null
          registration_type: number | null
          registration_url: string | null
          send_1080p_video_to_attendees: boolean | null
          settings: Json | null
          show_share_button: boolean | null
          sign_language_interpretation: Json | null
          start_time: string | null
          start_url: string | null
          status: string | null
          survey_url: string | null
          sync_method: string | null
          sync_status: string | null
          synced_at: string | null
          timezone: string | null
          topic: string | null
          total_absentees: number | null
          total_attendees: number | null
          total_minutes: number | null
          total_participant_minutes: number | null
          total_registrants: number | null
          tracking_fields: Json | null
          transition_to_live: boolean | null
          type: number | null
          unique_participant_count: number | null
          updated_at: string | null
          uuid: string | null
          webinar_created_at: string | null
          zoom_webinar_id: string | null
        }
        Insert: {
          actual_participant_count?: number | null
          add_audio_watermark?: boolean | null
          add_watermark?: boolean | null
          additional_data?: Json | null
          agenda?: string | null
          allow_multiple_devices?: boolean | null
          allow_multiple_view_on_same_device?: boolean | null
          alternative_hosts?: string[] | null
          alternative_hosts_email_notification?: boolean | null
          approval_type?: number | null
          attendees_and_panelists_reminder_email_notification?: Json | null
          audio?: string | null
          audio_conferencing?: Json | null
          authentication_domains?: string | null
          authentication_name?: string | null
          authentication_option?: string | null
          auto_recording?: string | null
          avg_attendance_duration?: number | null
          cloud_recording?: Json | null
          connection_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          creation_source?: string | null
          duration?: number | null
          email_language?: string | null
          email_notification?: boolean | null
          enable_dedicated_pin_for_all_panelists?: boolean | null
          encrypted_password?: string | null
          enforce_login?: boolean | null
          follow_up_absentees_email_notification?: Json | null
          follow_up_attendees_email_notification?: Json | null
          global_dial_in_countries?: string[] | null
          global_dial_in_numbers?: Json | null
          h323_password?: string | null
          hd_video?: boolean | null
          hd_video_for_attendees?: boolean | null
          host_email?: string | null
          host_id?: string | null
          host_save_video_order?: boolean | null
          host_video?: boolean | null
          id?: string | null
          is_simulive?: boolean | null
          join_url?: string | null
          language_interpretation?: Json | null
          last_successful_sync?: string | null
          last_synced_at?: string | null
          max_attendees?: number | null
          max_registrants?: number | null
          meeting_authentication?: boolean | null
          notify_registrants?: boolean | null
          occurrence_id?: string | null
          occurrences?: Json | null
          on_demand?: boolean | null
          panelists_invitation_email_notification?: boolean | null
          panelists_video?: boolean | null
          participant_sync_attempted_at?: string | null
          participant_sync_completed_at?: string | null
          participant_sync_error?: string | null
          participant_sync_status?: string | null
          password?: string | null
          post_webinar_survey?: boolean | null
          practice_session?: boolean | null
          pstn_password?: string | null
          question_answer?: boolean | null
          record_file_id?: string | null
          recurrence?: Json | null
          registrants_confirmation_email?: boolean | null
          registrants_email_notification?: boolean | null
          registrants_restrict_by_domain?: string | null
          registrants_restrict_number?: number | null
          registration_required?: boolean | null
          registration_type?: number | null
          registration_url?: string | null
          send_1080p_video_to_attendees?: boolean | null
          settings?: Json | null
          show_share_button?: boolean | null
          sign_language_interpretation?: Json | null
          start_time?: string | null
          start_url?: string | null
          status?: string | null
          survey_url?: string | null
          sync_method?: string | null
          sync_status?: string | null
          synced_at?: string | null
          timezone?: string | null
          topic?: string | null
          total_absentees?: number | null
          total_attendees?: number | null
          total_minutes?: number | null
          total_participant_minutes?: number | null
          total_registrants?: number | null
          tracking_fields?: Json | null
          transition_to_live?: boolean | null
          type?: number | null
          unique_participant_count?: number | null
          updated_at?: string | null
          uuid?: string | null
          webinar_created_at?: string | null
          zoom_webinar_id?: string | null
        }
        Update: {
          actual_participant_count?: number | null
          add_audio_watermark?: boolean | null
          add_watermark?: boolean | null
          additional_data?: Json | null
          agenda?: string | null
          allow_multiple_devices?: boolean | null
          allow_multiple_view_on_same_device?: boolean | null
          alternative_hosts?: string[] | null
          alternative_hosts_email_notification?: boolean | null
          approval_type?: number | null
          attendees_and_panelists_reminder_email_notification?: Json | null
          audio?: string | null
          audio_conferencing?: Json | null
          authentication_domains?: string | null
          authentication_name?: string | null
          authentication_option?: string | null
          auto_recording?: string | null
          avg_attendance_duration?: number | null
          cloud_recording?: Json | null
          connection_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          creation_source?: string | null
          duration?: number | null
          email_language?: string | null
          email_notification?: boolean | null
          enable_dedicated_pin_for_all_panelists?: boolean | null
          encrypted_password?: string | null
          enforce_login?: boolean | null
          follow_up_absentees_email_notification?: Json | null
          follow_up_attendees_email_notification?: Json | null
          global_dial_in_countries?: string[] | null
          global_dial_in_numbers?: Json | null
          h323_password?: string | null
          hd_video?: boolean | null
          hd_video_for_attendees?: boolean | null
          host_email?: string | null
          host_id?: string | null
          host_save_video_order?: boolean | null
          host_video?: boolean | null
          id?: string | null
          is_simulive?: boolean | null
          join_url?: string | null
          language_interpretation?: Json | null
          last_successful_sync?: string | null
          last_synced_at?: string | null
          max_attendees?: number | null
          max_registrants?: number | null
          meeting_authentication?: boolean | null
          notify_registrants?: boolean | null
          occurrence_id?: string | null
          occurrences?: Json | null
          on_demand?: boolean | null
          panelists_invitation_email_notification?: boolean | null
          panelists_video?: boolean | null
          participant_sync_attempted_at?: string | null
          participant_sync_completed_at?: string | null
          participant_sync_error?: string | null
          participant_sync_status?: string | null
          password?: string | null
          post_webinar_survey?: boolean | null
          practice_session?: boolean | null
          pstn_password?: string | null
          question_answer?: boolean | null
          record_file_id?: string | null
          recurrence?: Json | null
          registrants_confirmation_email?: boolean | null
          registrants_email_notification?: boolean | null
          registrants_restrict_by_domain?: string | null
          registrants_restrict_number?: number | null
          registration_required?: boolean | null
          registration_type?: number | null
          registration_url?: string | null
          send_1080p_video_to_attendees?: boolean | null
          settings?: Json | null
          show_share_button?: boolean | null
          sign_language_interpretation?: Json | null
          start_time?: string | null
          start_url?: string | null
          status?: string | null
          survey_url?: string | null
          sync_method?: string | null
          sync_status?: string | null
          synced_at?: string | null
          timezone?: string | null
          topic?: string | null
          total_absentees?: number | null
          total_attendees?: number | null
          total_minutes?: number | null
          total_participant_minutes?: number | null
          total_registrants?: number | null
          tracking_fields?: Json | null
          transition_to_live?: boolean | null
          type?: number | null
          unique_participant_count?: number | null
          updated_at?: string | null
          uuid?: string | null
          webinar_created_at?: string | null
          zoom_webinar_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      organization_webinars: {
        Row: {
          agenda: string | null
          attendees_count: number | null
          connection_id: string | null
          created_at: string | null
          duration: number | null
          encrypted_password: string | null
          h323_password: string | null
          host_email: string | null
          host_id: string | null
          id: string | null
          join_url: string | null
          occurrences: Json | null
          organization_id: string | null
          organization_name: string | null
          password: string | null
          pstn_password: string | null
          recurrence: Json | null
          registrants_count: number | null
          registration_url: string | null
          settings: Json | null
          start_time: string | null
          start_url: string | null
          status: string | null
          synced_at: string | null
          timezone: string | null
          topic: string | null
          tracking_fields: Json | null
          type: number | null
          updated_at: string | null
          user_id: string | null
          uuid: string | null
          zoom_webinar_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoom_webinars_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aggregate_participant_sessions: {
        Args: { p_participant_id: string }
        Returns: undefined
      }
      batch_update_webinar_statuses: {
        Args: Record<PropertyKey, never>
        Returns: {
          updated_count: number
          upcoming_count: number
          live_count: number
          ended_count: number
        }[]
      }
      calculate_webinar_stats: {
        Args: { p_webinar_id: string }
        Returns: undefined
      }
      calculate_webinar_status: {
        Args:
          | { webinar_start_time: string; webinar_duration: number }
          | {
              webinar_start_time: string
              webinar_duration: number
              check_time: string
            }
        Returns: string
      }
      enqueue_task: {
        Args: {
          p_task_type: string
          p_task_data: Json
          p_priority?: number
          p_webinar_id?: string
          p_user_id?: string
        }
        Returns: string
      }
      get_record_history: {
        Args: { p_table_name: string; p_record_id: string }
        Returns: {
          audit_id: string
          action: string
          changes: Json
          changed_by: string
          changed_at: string
        }[]
      }
      get_webinar_status: {
        Args: { webinar_start_time: string; webinar_duration: number }
        Returns: string
      }
      invalidate_cache_dependencies: {
        Args: { dep_pattern: string }
        Returns: number
      }
      is_user_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
