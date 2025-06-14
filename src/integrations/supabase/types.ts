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
      ai_insights: {
        Row: {
          ai_model_name: string
          ai_model_version: string | null
          confidence_score: number | null
          created_at: string
          error_message: string | null
          id: string
          insight_data: Json
          insight_summary: string | null
          insight_title: string
          insight_type: Database["public"]["Enums"]["ai_insight_type"]
          parent_insight_id: string | null
          processing_completed_at: string | null
          processing_duration_ms: number | null
          processing_started_at: string | null
          status: Database["public"]["Enums"]["ai_insight_status"]
          supporting_data: Json | null
          updated_at: string
          user_id: string
          version: number
          webinar_id: string
        }
        Insert: {
          ai_model_name: string
          ai_model_version?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          insight_data?: Json
          insight_summary?: string | null
          insight_title: string
          insight_type: Database["public"]["Enums"]["ai_insight_type"]
          parent_insight_id?: string | null
          processing_completed_at?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          status?: Database["public"]["Enums"]["ai_insight_status"]
          supporting_data?: Json | null
          updated_at?: string
          user_id: string
          version?: number
          webinar_id: string
        }
        Update: {
          ai_model_name?: string
          ai_model_version?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          insight_data?: Json
          insight_summary?: string | null
          insight_title?: string
          insight_type?: Database["public"]["Enums"]["ai_insight_type"]
          parent_insight_id?: string | null
          processing_completed_at?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          status?: Database["public"]["Enums"]["ai_insight_status"]
          supporting_data?: Json | null
          updated_at?: string
          user_id?: string
          version?: number
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_parent_insight_id_fkey"
            columns: ["parent_insight_id"]
            isOneToOne: false
            referencedRelation: "ai_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinar_analytics_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinars"
            referencedColumns: ["id"]
          },
        ]
      }
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
      content_analysis: {
        Row: {
          analysis_model: string
          analysis_parameters: Json | null
          analysis_quality_score: number | null
          analysis_results: Json
          analysis_version: string | null
          content_hash: string | null
          content_source: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          error_message: string | null
          extracted_text: string | null
          id: string
          key_topics: Json | null
          keywords: Json | null
          processing_completed_at: string | null
          processing_confidence: number | null
          processing_duration_ms: number | null
          processing_started_at: string | null
          recording_id: string | null
          retry_count: number | null
          sentiment_scores: Json | null
          status: Database["public"]["Enums"]["analysis_status"]
          summary: string | null
          updated_at: string
          webinar_id: string
        }
        Insert: {
          analysis_model: string
          analysis_parameters?: Json | null
          analysis_quality_score?: number | null
          analysis_results?: Json
          analysis_version?: string | null
          content_hash?: string | null
          content_source?: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          error_message?: string | null
          extracted_text?: string | null
          id?: string
          key_topics?: Json | null
          keywords?: Json | null
          processing_completed_at?: string | null
          processing_confidence?: number | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          recording_id?: string | null
          retry_count?: number | null
          sentiment_scores?: Json | null
          status?: Database["public"]["Enums"]["analysis_status"]
          summary?: string | null
          updated_at?: string
          webinar_id: string
        }
        Update: {
          analysis_model?: string
          analysis_parameters?: Json | null
          analysis_quality_score?: number | null
          analysis_results?: Json
          analysis_version?: string | null
          content_hash?: string | null
          content_source?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          error_message?: string | null
          extracted_text?: string | null
          id?: string
          key_topics?: Json | null
          keywords?: Json | null
          processing_completed_at?: string | null
          processing_confidence?: number | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          recording_id?: string | null
          retry_count?: number | null
          sentiment_scores?: Json | null
          status?: Database["public"]["Enums"]["analysis_status"]
          summary?: string | null
          updated_at?: string
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_analysis_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "zoom_recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_analysis_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinar_analytics_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_analysis_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_metrics: {
        Row: {
          aggregation_method: string | null
          calculation_formula: string
          calculation_parameters: Json | null
          chart_type: string | null
          color_scheme: string | null
          connection_id: string | null
          created_at: string
          critical_threshold: number | null
          dashboard_order: number | null
          data_type: Database["public"]["Enums"]["metric_data_type"]
          display_format: string | null
          id: string
          is_active: boolean
          is_public: boolean
          metric_category: string | null
          metric_description: string | null
          metric_name: string
          target_value: number | null
          time_period_days: number | null
          updated_at: string
          user_id: string
          warning_threshold: number | null
        }
        Insert: {
          aggregation_method?: string | null
          calculation_formula: string
          calculation_parameters?: Json | null
          chart_type?: string | null
          color_scheme?: string | null
          connection_id?: string | null
          created_at?: string
          critical_threshold?: number | null
          dashboard_order?: number | null
          data_type: Database["public"]["Enums"]["metric_data_type"]
          display_format?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          metric_category?: string | null
          metric_description?: string | null
          metric_name: string
          target_value?: number | null
          time_period_days?: number | null
          updated_at?: string
          user_id: string
          warning_threshold?: number | null
        }
        Update: {
          aggregation_method?: string | null
          calculation_formula?: string
          calculation_parameters?: Json | null
          chart_type?: string | null
          color_scheme?: string | null
          connection_id?: string | null
          created_at?: string
          critical_threshold?: number | null
          dashboard_order?: number | null
          data_type?: Database["public"]["Enums"]["metric_data_type"]
          display_format?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          metric_category?: string | null
          metric_description?: string | null
          metric_name?: string
          target_value?: number | null
          time_period_days?: number | null
          updated_at?: string
          user_id?: string
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_metrics_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_predictions: {
        Row: {
          actual_value: number | null
          confidence_score: number
          contributing_factors: Json | null
          created_at: string
          feature_vector: Json | null
          id: string
          model_name: string
          model_version: string | null
          participant_id: string | null
          participant_session_duration: number | null
          predicted_value: number
          prediction_accuracy: number | null
          prediction_explanation: string | null
          prediction_timestamp: string
          prediction_type: Database["public"]["Enums"]["prediction_type"]
          updated_at: string
          validated_at: string | null
          webinar_elapsed_minutes: number | null
          webinar_id: string
        }
        Insert: {
          actual_value?: number | null
          confidence_score: number
          contributing_factors?: Json | null
          created_at?: string
          feature_vector?: Json | null
          id?: string
          model_name: string
          model_version?: string | null
          participant_id?: string | null
          participant_session_duration?: number | null
          predicted_value: number
          prediction_accuracy?: number | null
          prediction_explanation?: string | null
          prediction_timestamp?: string
          prediction_type: Database["public"]["Enums"]["prediction_type"]
          updated_at?: string
          validated_at?: string | null
          webinar_elapsed_minutes?: number | null
          webinar_id: string
        }
        Update: {
          actual_value?: number | null
          confidence_score?: number
          contributing_factors?: Json | null
          created_at?: string
          feature_vector?: Json | null
          id?: string
          model_name?: string
          model_version?: string | null
          participant_id?: string | null
          participant_session_duration?: number | null
          predicted_value?: number
          prediction_accuracy?: number | null
          prediction_explanation?: string | null
          prediction_timestamp?: string
          prediction_type?: Database["public"]["Enums"]["prediction_type"]
          updated_at?: string
          validated_at?: string | null
          webinar_elapsed_minutes?: number | null
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_predictions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "zoom_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_predictions_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinar_analytics_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_predictions_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_templates: {
        Row: {
          ai_model_requirements: Json | null
          allowed_teams: Json | null
          allowed_users: Json | null
          avg_processing_time_ms: number | null
          category: Database["public"]["Enums"]["template_category"]
          created_at: string
          created_by: string
          id: string
          input_parameters: Json
          is_active: boolean
          is_featured: boolean
          output_schema: Json
          processing_config: Json | null
          prompt_template: string
          retry_policy: Json | null
          sharing_permission: Database["public"]["Enums"]["sharing_permission"]
          success_rate: number | null
          template_description: string | null
          template_name: string
          updated_at: string
          usage_count: number | null
          validation_rules: Json | null
          version: number
        }
        Insert: {
          ai_model_requirements?: Json | null
          allowed_teams?: Json | null
          allowed_users?: Json | null
          avg_processing_time_ms?: number | null
          category: Database["public"]["Enums"]["template_category"]
          created_at?: string
          created_by: string
          id?: string
          input_parameters?: Json
          is_active?: boolean
          is_featured?: boolean
          output_schema?: Json
          processing_config?: Json | null
          prompt_template: string
          retry_policy?: Json | null
          sharing_permission?: Database["public"]["Enums"]["sharing_permission"]
          success_rate?: number | null
          template_description?: string | null
          template_name: string
          updated_at?: string
          usage_count?: number | null
          validation_rules?: Json | null
          version?: number
        }
        Update: {
          ai_model_requirements?: Json | null
          allowed_teams?: Json | null
          allowed_users?: Json | null
          avg_processing_time_ms?: number | null
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string
          created_by?: string
          id?: string
          input_parameters?: Json
          is_active?: boolean
          is_featured?: boolean
          output_schema?: Json
          processing_config?: Json | null
          prompt_template?: string
          retry_policy?: Json | null
          sharing_permission?: Database["public"]["Enums"]["sharing_permission"]
          success_rate?: number | null
          template_description?: string | null
          template_name?: string
          updated_at?: string
          usage_count?: number | null
          validation_rules?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "insight_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "webinar_analytics_summary"
            referencedColumns: ["id"]
          },
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
      realtime_events: {
        Row: {
          channel_name: string | null
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          processed: boolean | null
          target_users: string[] | null
        }
        Insert: {
          channel_name?: string | null
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          processed?: boolean | null
          target_users?: string[] | null
        }
        Update: {
          channel_name?: string | null
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          processed?: boolean | null
          target_users?: string[] | null
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
      zoom_connections: {
        Row: {
          access_token: string
          auto_sync_enabled: boolean | null
          connection_status: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          last_sync_at: string | null
          next_sync_at: string | null
          refresh_token: string
          scopes: string[] | null
          sync_frequency_hours: number | null
          token_expires_at: string
          updated_at: string | null
          user_id: string
          zoom_account_id: string
          zoom_account_type: string | null
          zoom_email: string
          zoom_user_id: string
        }
        Insert: {
          access_token: string
          auto_sync_enabled?: boolean | null
          connection_status?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          refresh_token: string
          scopes?: string[] | null
          sync_frequency_hours?: number | null
          token_expires_at: string
          updated_at?: string | null
          user_id: string
          zoom_account_id: string
          zoom_account_type?: string | null
          zoom_email: string
          zoom_user_id: string
        }
        Update: {
          access_token?: string
          auto_sync_enabled?: boolean | null
          connection_status?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          refresh_token?: string
          scopes?: string[] | null
          sync_frequency_hours?: number | null
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
          zoom_account_id?: string
          zoom_account_type?: string | null
          zoom_email?: string
          zoom_user_id?: string
        }
        Relationships: []
      }
      zoom_credentials: {
        Row: {
          account_id: string
          app_name: string | null
          client_id: string
          client_secret: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          app_name?: string | null
          client_id: string
          client_secret: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          app_name?: string | null
          client_id?: string
          client_secret?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoom_participants: {
        Row: {
          answered_polling: boolean | null
          asked_question: boolean | null
          attentiveness_score: number | null
          camera_on_duration: number | null
          created_at: string | null
          customer_key: string | null
          device: string | null
          duration: number | null
          id: string
          ip_address: unknown | null
          join_time: string
          leave_time: string | null
          location: string | null
          network_type: string | null
          participant_email: string | null
          participant_id: string
          participant_name: string
          participant_user_id: string | null
          posted_chat: boolean | null
          raised_hand: boolean | null
          registrant_id: string | null
          share_application_duration: number | null
          share_desktop_duration: number | null
          updated_at: string | null
          version: string | null
          webinar_id: string
        }
        Insert: {
          answered_polling?: boolean | null
          asked_question?: boolean | null
          attentiveness_score?: number | null
          camera_on_duration?: number | null
          created_at?: string | null
          customer_key?: string | null
          device?: string | null
          duration?: number | null
          id?: string
          ip_address?: unknown | null
          join_time: string
          leave_time?: string | null
          location?: string | null
          network_type?: string | null
          participant_email?: string | null
          participant_id: string
          participant_name: string
          participant_user_id?: string | null
          posted_chat?: boolean | null
          raised_hand?: boolean | null
          registrant_id?: string | null
          share_application_duration?: number | null
          share_desktop_duration?: number | null
          updated_at?: string | null
          version?: string | null
          webinar_id: string
        }
        Update: {
          answered_polling?: boolean | null
          asked_question?: boolean | null
          attentiveness_score?: number | null
          camera_on_duration?: number | null
          created_at?: string | null
          customer_key?: string | null
          device?: string | null
          duration?: number | null
          id?: string
          ip_address?: unknown | null
          join_time?: string
          leave_time?: string | null
          location?: string | null
          network_type?: string | null
          participant_email?: string | null
          participant_id?: string
          participant_name?: string
          participant_user_id?: string | null
          posted_chat?: boolean | null
          raised_hand?: boolean | null
          registrant_id?: string | null
          share_application_duration?: number | null
          share_desktop_duration?: number | null
          updated_at?: string | null
          version?: string | null
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoom_participants_registrant_id_fkey"
            columns: ["registrant_id"]
            isOneToOne: false
            referencedRelation: "zoom_registrants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoom_participants_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinar_analytics_summary"
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
          created_at: string | null
          id: string
          participant_email: string | null
          participant_id: string | null
          participant_name: string | null
          poll_id: string
          responses: Json
          submitted_at: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          participant_email?: string | null
          participant_id?: string | null
          participant_name?: string | null
          poll_id: string
          responses?: Json
          submitted_at: string
        }
        Update: {
          created_at?: string | null
          id?: string
          participant_email?: string | null
          participant_id?: string | null
          participant_name?: string | null
          poll_id?: string
          responses?: Json
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoom_poll_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "zoom_participants"
            referencedColumns: ["id"]
          },
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
          created_at: string | null
          id: string
          poll_id: string
          poll_title: string
          poll_type: string | null
          questions: Json
          status: string | null
          updated_at: string | null
          webinar_id: string
        }
        Insert: {
          anonymous?: boolean | null
          created_at?: string | null
          id?: string
          poll_id: string
          poll_title: string
          poll_type?: string | null
          questions?: Json
          status?: string | null
          updated_at?: string | null
          webinar_id: string
        }
        Update: {
          anonymous?: boolean | null
          created_at?: string | null
          id?: string
          poll_id?: string
          poll_title?: string
          poll_type?: string | null
          questions?: Json
          status?: string | null
          updated_at?: string | null
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoom_polls_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinar_analytics_summary"
            referencedColumns: ["id"]
          },
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
          anonymous: boolean | null
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          asked_at: string
          asker_email: string | null
          asker_name: string
          created_at: string | null
          id: string
          question: string
          question_id: string
          status: string | null
          updated_at: string | null
          upvote_count: number | null
          webinar_id: string
        }
        Insert: {
          anonymous?: boolean | null
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_at: string
          asker_email?: string | null
          asker_name: string
          created_at?: string | null
          id?: string
          question: string
          question_id: string
          status?: string | null
          updated_at?: string | null
          upvote_count?: number | null
          webinar_id: string
        }
        Update: {
          anonymous?: boolean | null
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_at?: string
          asker_email?: string | null
          asker_name?: string
          created_at?: string | null
          id?: string
          question?: string
          question_id?: string
          status?: string | null
          updated_at?: string | null
          upvote_count?: number | null
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoom_qna_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinar_analytics_summary"
            referencedColumns: ["id"]
          },
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
          created_at: string | null
          download_url: string | null
          expires_at: string | null
          file_size: number | null
          file_type: string | null
          id: string
          password: string | null
          play_url: string | null
          recording_end: string
          recording_id: string
          recording_start: string
          recording_type: string | null
          recording_uuid: string
          status: string | null
          total_downloads: number | null
          total_views: number | null
          updated_at: string | null
          webinar_id: string
        }
        Insert: {
          created_at?: string | null
          download_url?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          password?: string | null
          play_url?: string | null
          recording_end: string
          recording_id: string
          recording_start: string
          recording_type?: string | null
          recording_uuid: string
          status?: string | null
          total_downloads?: number | null
          total_views?: number | null
          updated_at?: string | null
          webinar_id: string
        }
        Update: {
          created_at?: string | null
          download_url?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          password?: string | null
          play_url?: string | null
          recording_end?: string
          recording_id?: string
          recording_start?: string
          recording_type?: string | null
          recording_uuid?: string
          status?: string | null
          total_downloads?: number | null
          total_views?: number | null
          updated_at?: string | null
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoom_recordings_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinar_analytics_summary"
            referencedColumns: ["id"]
          },
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
          attended: boolean | null
          city: string | null
          comments: string | null
          country: string | null
          created_at: string | null
          custom_questions: Json | null
          duration: number | null
          first_name: string | null
          id: string
          join_time: string | null
          last_name: string | null
          leave_time: string | null
          phone: string | null
          registrant_email: string
          registrant_id: string
          registration_time: string
          source_id: string | null
          state: string | null
          status: string | null
          tracking_source: string | null
          updated_at: string | null
          webinar_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          attended?: boolean | null
          city?: string | null
          comments?: string | null
          country?: string | null
          created_at?: string | null
          custom_questions?: Json | null
          duration?: number | null
          first_name?: string | null
          id?: string
          join_time?: string | null
          last_name?: string | null
          leave_time?: string | null
          phone?: string | null
          registrant_email: string
          registrant_id: string
          registration_time: string
          source_id?: string | null
          state?: string | null
          status?: string | null
          tracking_source?: string | null
          updated_at?: string | null
          webinar_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          attended?: boolean | null
          city?: string | null
          comments?: string | null
          country?: string | null
          created_at?: string | null
          custom_questions?: Json | null
          duration?: number | null
          first_name?: string | null
          id?: string
          join_time?: string | null
          last_name?: string | null
          leave_time?: string | null
          phone?: string | null
          registrant_email?: string
          registrant_id?: string
          registration_time?: string
          source_id?: string | null
          state?: string | null
          status?: string | null
          tracking_source?: string | null
          updated_at?: string | null
          webinar_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_registrants_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinar_analytics_summary"
            referencedColumns: ["id"]
          },
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
          api_calls_made: number | null
          completed_at: string | null
          connection_id: string
          created_at: string | null
          duration_seconds: number | null
          error_details: Json | null
          error_message: string | null
          failed_items: number | null
          id: string
          processed_items: number | null
          rate_limit_hits: number | null
          resource_id: string | null
          resource_type: string | null
          started_at: string
          sync_status: string
          sync_type: string
          total_items: number | null
          updated_at: string | null
        }
        Insert: {
          api_calls_made?: number | null
          completed_at?: string | null
          connection_id: string
          created_at?: string | null
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          failed_items?: number | null
          id?: string
          processed_items?: number | null
          rate_limit_hits?: number | null
          resource_id?: string | null
          resource_type?: string | null
          started_at?: string
          sync_status: string
          sync_type: string
          total_items?: number | null
          updated_at?: string | null
        }
        Update: {
          api_calls_made?: number | null
          completed_at?: string | null
          connection_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          failed_items?: number | null
          id?: string
          processed_items?: number | null
          rate_limit_hits?: number | null
          resource_id?: string | null
          resource_type?: string | null
          started_at?: string
          sync_status?: string
          sync_type?: string
          total_items?: number | null
          updated_at?: string | null
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
      zoom_token_refresh_log: {
        Row: {
          connection_id: string
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          new_token_expires_at: string | null
          old_token_expires_at: string | null
          refresh_status: string | null
          refresh_type: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          new_token_expires_at?: string | null
          old_token_expires_at?: string | null
          refresh_status?: string | null
          refresh_type?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          new_token_expires_at?: string | null
          old_token_expires_at?: string | null
          refresh_status?: string | null
          refresh_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_token_refresh_log_connection_id_fkey"
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
          alternative_hosts: string[] | null
          approval_type: number | null
          avg_attendance_duration: number | null
          connection_id: string
          created_at: string | null
          duration: number | null
          host_email: string | null
          host_id: string
          id: string
          join_url: string | null
          max_attendees: number | null
          max_registrants: number | null
          occurrence_id: string | null
          registration_required: boolean | null
          registration_type: number | null
          registration_url: string | null
          start_time: string | null
          status: string | null
          synced_at: string | null
          timezone: string | null
          topic: string
          total_attendees: number | null
          total_minutes: number | null
          total_registrants: number | null
          type: number
          updated_at: string | null
          webinar_id: string
          webinar_uuid: string
        }
        Insert: {
          agenda?: string | null
          alternative_hosts?: string[] | null
          approval_type?: number | null
          avg_attendance_duration?: number | null
          connection_id: string
          created_at?: string | null
          duration?: number | null
          host_email?: string | null
          host_id: string
          id?: string
          join_url?: string | null
          max_attendees?: number | null
          max_registrants?: number | null
          occurrence_id?: string | null
          registration_required?: boolean | null
          registration_type?: number | null
          registration_url?: string | null
          start_time?: string | null
          status?: string | null
          synced_at?: string | null
          timezone?: string | null
          topic: string
          total_attendees?: number | null
          total_minutes?: number | null
          total_registrants?: number | null
          type: number
          updated_at?: string | null
          webinar_id: string
          webinar_uuid: string
        }
        Update: {
          agenda?: string | null
          alternative_hosts?: string[] | null
          approval_type?: number | null
          avg_attendance_duration?: number | null
          connection_id?: string
          created_at?: string | null
          duration?: number | null
          host_email?: string | null
          host_id?: string
          id?: string
          join_url?: string | null
          max_attendees?: number | null
          max_registrants?: number | null
          occurrence_id?: string | null
          registration_required?: boolean | null
          registration_type?: number | null
          registration_url?: string | null
          start_time?: string | null
          status?: string | null
          synced_at?: string | null
          timezone?: string | null
          topic?: string
          total_attendees?: number | null
          total_minutes?: number | null
          total_registrants?: number | null
          type?: number
          updated_at?: string | null
          webinar_id?: string
          webinar_uuid?: string
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
      webinar_analytics_summary: {
        Row: {
          attendance_rate: number | null
          avg_attendance_duration: number | null
          duration: number | null
          id: string | null
          start_time: string | null
          topic: string | null
          total_attendees: number | null
          total_polls: number | null
          total_questions: number | null
          total_recordings: number | null
          total_registrants: number | null
          unique_participants: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      broadcast_event: {
        Args: {
          p_event_type: string
          p_event_data: Json
          p_target_users?: string[]
          p_channel_name?: string
        }
        Returns: string
      }
      decrypt_token: {
        Args: { encrypted_token: string }
        Returns: string
      }
      encrypt_token: {
        Args: { token: string }
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
      invalidate_cache_dependencies: {
        Args: { dep_pattern: string }
        Returns: number
      }
    }
    Enums: {
      ai_insight_status: "pending" | "processing" | "completed" | "failed"
      ai_insight_type:
        | "engagement"
        | "content"
        | "predictive"
        | "custom"
        | "performance"
      analysis_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "retrying"
      content_type: "transcript" | "slides" | "chat" | "audio" | "video"
      metric_data_type: "number" | "percentage" | "duration" | "count" | "ratio"
      prediction_type:
        | "dropout_risk"
        | "engagement_score"
        | "interaction_likelihood"
        | "attention_score"
      sharing_permission: "private" | "team" | "public"
      template_category:
        | "performance"
        | "engagement"
        | "content"
        | "custom"
        | "predictive"
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
    Enums: {
      ai_insight_status: ["pending", "processing", "completed", "failed"],
      ai_insight_type: [
        "engagement",
        "content",
        "predictive",
        "custom",
        "performance",
      ],
      analysis_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "retrying",
      ],
      content_type: ["transcript", "slides", "chat", "audio", "video"],
      metric_data_type: ["number", "percentage", "duration", "count", "ratio"],
      prediction_type: [
        "dropout_risk",
        "engagement_score",
        "interaction_likelihood",
        "attention_score",
      ],
      sharing_permission: ["private", "team", "public"],
      template_category: [
        "performance",
        "engagement",
        "content",
        "custom",
        "predictive",
      ],
    },
  },
} as const
