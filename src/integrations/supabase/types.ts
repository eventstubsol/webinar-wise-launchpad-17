export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: [
          {
            foreignKeyName: "processing_queue_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "sync_queue_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinars"
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
      zoom_connections: {
        Row: {
          access_token: string
          connection_status: string
          connection_type: string
          created_at: string
          id: string
          is_primary: boolean
          last_sync_at: string | null
          refresh_token: string | null
          scopes: string[]
          token_expires_at: string
          updated_at: string
          user_id: string
          zoom_account_id: string
          zoom_account_type: string
          zoom_email: string
          zoom_user_id: string
        }
        Insert: {
          access_token: string
          connection_status?: string
          connection_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          last_sync_at?: string | null
          refresh_token?: string | null
          scopes?: string[]
          token_expires_at: string
          updated_at?: string
          user_id: string
          zoom_account_id: string
          zoom_account_type?: string
          zoom_email: string
          zoom_user_id: string
        }
        Update: {
          access_token?: string
          connection_status?: string
          connection_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          last_sync_at?: string | null
          refresh_token?: string | null
          scopes?: string[]
          token_expires_at?: string
          updated_at?: string
          user_id?: string
          zoom_account_id?: string
          zoom_account_type?: string
          zoom_email?: string
          zoom_user_id?: string
        }
        Relationships: []
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
      zoom_participants: {
        Row: {
          created_at: string
          duration: number | null
          email: string | null
          failover: boolean | null
          id: string
          join_time: string | null
          leave_time: string | null
          name: string
          participant_uuid: string | null
          registrant_id: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          webinar_id: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          email?: string | null
          failover?: boolean | null
          id?: string
          join_time?: string | null
          leave_time?: string | null
          name: string
          participant_uuid?: string | null
          registrant_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          webinar_id?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          email?: string | null
          failover?: boolean | null
          id?: string
          join_time?: string | null
          leave_time?: string | null
          name?: string
          participant_uuid?: string | null
          registrant_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          webinar_id?: string | null
        }
        Relationships: [
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
        Relationships: [
          {
            foreignKeyName: "zoom_polls_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinars"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "zoom_qna_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinars"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "zoom_recordings_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_registrants: {
        Row: {
          address: string | null
          city: string | null
          comments: string | null
          country: string | null
          create_time: string | null
          created_at: string
          custom_questions: Json | null
          email: string
          first_name: string | null
          id: string
          industry: string | null
          job_title: string | null
          join_url: string | null
          last_name: string | null
          no_of_employees: string | null
          org: string | null
          phone: string | null
          purchasing_time_frame: string | null
          registrant_id: string | null
          registrant_uuid: string | null
          role_in_purchase_process: string | null
          state: string | null
          status: string | null
          updated_at: string
          webinar_id: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          comments?: string | null
          country?: string | null
          create_time?: string | null
          created_at?: string
          custom_questions?: Json | null
          email: string
          first_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          join_url?: string | null
          last_name?: string | null
          no_of_employees?: string | null
          org?: string | null
          phone?: string | null
          purchasing_time_frame?: string | null
          registrant_id?: string | null
          registrant_uuid?: string | null
          role_in_purchase_process?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          webinar_id?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          comments?: string | null
          country?: string | null
          create_time?: string | null
          created_at?: string
          custom_questions?: Json | null
          email?: string
          first_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          join_url?: string | null
          last_name?: string | null
          no_of_employees?: string | null
          org?: string | null
          phone?: string | null
          purchasing_time_frame?: string | null
          registrant_id?: string | null
          registrant_uuid?: string | null
          role_in_purchase_process?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          webinar_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_registrants_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_sync_logs: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string
          duration_seconds: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          metadata: Json | null
          processed_items: number | null
          stage_progress_percentage: number | null
          started_at: string
          status: string | null
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
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          processed_items?: number | null
          stage_progress_percentage?: number | null
          started_at?: string
          status?: string | null
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
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          processed_items?: number | null
          stage_progress_percentage?: number | null
          started_at?: string
          status?: string | null
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
          connection_id: string
          created_at: string
          duration: number
          host_email: string
          host_id: string
          id: string
          join_url: string
          participant_sync_attempted_at: string | null
          participant_sync_completed_at: string | null
          participant_sync_error: string | null
          participant_sync_status: string | null
          registration_url: string | null
          start_time: string
          status: string
          synced_at: string
          timezone: string
          topic: string
          updated_at: string
          webinar_id: string | null
          webinar_type: number
          zoom_uuid: string | null
          zoom_webinar_id: string
        }
        Insert: {
          agenda?: string | null
          connection_id: string
          created_at?: string
          duration: number
          host_email: string
          host_id: string
          id?: string
          join_url: string
          participant_sync_attempted_at?: string | null
          participant_sync_completed_at?: string | null
          participant_sync_error?: string | null
          participant_sync_status?: string | null
          registration_url?: string | null
          start_time: string
          status: string
          synced_at?: string
          timezone: string
          topic: string
          updated_at?: string
          webinar_id?: string | null
          webinar_type: number
          zoom_uuid?: string | null
          zoom_webinar_id: string
        }
        Update: {
          agenda?: string | null
          connection_id?: string
          created_at?: string
          duration?: number
          host_email?: string
          host_id?: string
          id?: string
          join_url?: string
          participant_sync_attempted_at?: string | null
          participant_sync_completed_at?: string | null
          participant_sync_error?: string | null
          participant_sync_status?: string | null
          registration_url?: string | null
          start_time?: string
          status?: string
          synced_at?: string
          timezone?: string
          topic?: string
          updated_at?: string
          webinar_id?: string | null
          webinar_type?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      invalidate_cache_dependencies: {
        Args: { dep_pattern: string }
        Returns: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
