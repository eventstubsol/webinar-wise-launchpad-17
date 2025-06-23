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
      ab_test_results: {
        Row: {
          campaign_id: string
          confidence_level: number | null
          created_at: string | null
          id: string
          sample_size: number | null
          statistical_significance: number | null
          test_end_date: string | null
          test_start_date: string
          test_status: string | null
          variant_a_id: string
          variant_b_id: string
          winner_variant_id: string | null
        }
        Insert: {
          campaign_id: string
          confidence_level?: number | null
          created_at?: string | null
          id?: string
          sample_size?: number | null
          statistical_significance?: number | null
          test_end_date?: string | null
          test_start_date: string
          test_status?: string | null
          variant_a_id: string
          variant_b_id: string
          winner_variant_id?: string | null
        }
        Update: {
          campaign_id?: string
          confidence_level?: number | null
          created_at?: string | null
          id?: string
          sample_size?: number | null
          statistical_significance?: number | null
          test_end_date?: string | null
          test_start_date?: string
          test_status?: string | null
          variant_a_id?: string
          variant_b_id?: string
          winner_variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_results_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_test_results_variant_a_id_fkey"
            columns: ["variant_a_id"]
            isOneToOne: false
            referencedRelation: "campaign_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_test_results_variant_b_id_fkey"
            columns: ["variant_b_id"]
            isOneToOne: false
            referencedRelation: "campaign_variants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      audience_segments: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_size: number | null
          filter_criteria: Json
          id: string
          is_active: boolean | null
          is_dynamic: boolean | null
          last_calculated_at: string | null
          segment_name: string
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_size?: number | null
          filter_criteria?: Json
          id?: string
          is_active?: boolean | null
          is_dynamic?: boolean | null
          last_calculated_at?: string | null
          segment_name: string
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_size?: number | null
          filter_criteria?: Json
          id?: string
          is_active?: boolean | null
          is_dynamic?: boolean | null
          last_calculated_at?: string | null
          segment_name?: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audience_segments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          change_context: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          change_context?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          change_context?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      backup_metadata: {
        Row: {
          backup_name: string
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          removed_at: string | null
          row_count: number | null
          table_name: string
        }
        Insert: {
          backup_name: string
          created_at: string
          created_by?: string | null
          id?: string
          reason?: string | null
          removed_at?: string | null
          row_count?: number | null
          table_name: string
        }
        Update: {
          backup_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          removed_at?: string | null
          row_count?: number | null
          table_name?: string
        }
        Relationships: []
      }
      behavioral_events: {
        Row: {
          campaign_id: string | null
          device_type: string | null
          email_address: string
          event_data: Json | null
          event_type: string
          id: string
          location_data: Json | null
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          device_type?: string | null
          email_address: string
          event_data?: Json | null
          event_type: string
          id?: string
          location_data?: Json | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          device_type?: string | null
          email_address?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          location_data?: Json | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavioral_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analytics: {
        Row: {
          campaign_id: string
          created_at: string | null
          event_data: Json | null
          event_timestamp: string | null
          id: string
          metric_type: string
          metric_value: number | null
          recipient_email: string | null
          variant_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          event_data?: Json | null
          event_timestamp?: string | null
          id?: string
          metric_type: string
          metric_value?: number | null
          recipient_email?: string | null
          variant_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          event_data?: Json | null
          event_timestamp?: string | null
          id?: string
          metric_type?: string
          metric_value?: number | null
          recipient_email?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_analytics_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "campaign_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_automation_workflows: {
        Row: {
          completed_subscribers: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          total_subscribers: number | null
          trigger_conditions: Json | null
          updated_at: string | null
          user_id: string | null
          workflow_name: string
          workflow_steps: Json
          workflow_type: string
        }
        Insert: {
          completed_subscribers?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          total_subscribers?: number | null
          trigger_conditions?: Json | null
          updated_at?: string | null
          user_id?: string | null
          workflow_name: string
          workflow_steps?: Json
          workflow_type: string
        }
        Update: {
          completed_subscribers?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          total_subscribers?: number | null
          trigger_conditions?: Json | null
          updated_at?: string | null
          user_id?: string | null
          workflow_name?: string
          workflow_steps?: Json
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_automation_workflows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_execution_queue: {
        Row: {
          campaign_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          execution_config: Json | null
          execution_type: string
          id: string
          priority: number | null
          progress_data: Json | null
          scheduled_for: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_config?: Json | null
          execution_type: string
          id?: string
          priority?: number | null
          progress_data?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_config?: Json | null
          execution_type?: string
          id?: string
          priority?: number | null
          progress_data?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_execution_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_execution_queue_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "campaign_automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_performance_summaries: {
        Row: {
          bounce_rate: number | null
          calculated_at: string | null
          campaign_id: string
          click_rate: number | null
          conversion_rate: number | null
          created_at: string | null
          id: string
          open_rate: number | null
          revenue_generated: number | null
          total_bounced: number | null
          total_clicked: number | null
          total_complained: number | null
          total_converted: number | null
          total_delivered: number | null
          total_opened: number | null
          total_sent: number | null
          total_unsubscribed: number | null
          unsubscribe_rate: number | null
        }
        Insert: {
          bounce_rate?: number | null
          calculated_at?: string | null
          campaign_id: string
          click_rate?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          open_rate?: number | null
          revenue_generated?: number | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_complained?: number | null
          total_converted?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          unsubscribe_rate?: number | null
        }
        Update: {
          bounce_rate?: number | null
          calculated_at?: string | null
          campaign_id?: string
          click_rate?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          open_rate?: number | null
          revenue_generated?: number | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_complained?: number | null
          total_converted?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_sent?: number | null
          total_unsubscribed?: number | null
          unsubscribe_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_performance_summaries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_schedules: {
        Row: {
          campaign_id: string
          created_at: string | null
          execution_count: number | null
          frequency_cap: Json | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          next_execution_at: string | null
          recurrence_pattern: Json | null
          schedule_type: string
          send_at: string | null
          timezone: string | null
          trigger_conditions: Json | null
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          execution_count?: number | null
          frequency_cap?: Json | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          next_execution_at?: string | null
          recurrence_pattern?: Json | null
          schedule_type: string
          send_at?: string | null
          timezone?: string | null
          trigger_conditions?: Json | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          execution_count?: number | null
          frequency_cap?: Json | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          next_execution_at?: string | null
          recurrence_pattern?: Json | null
          schedule_type?: string
          send_at?: string | null
          timezone?: string | null
          trigger_conditions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_schedules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          category: string
          created_at: string | null
          default_settings: Json | null
          description: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          rating: number | null
          rating_count: number | null
          tags: string[] | null
          template_name: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
          workflow_config: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          default_settings?: Json | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          rating?: number | null
          rating_count?: number | null
          tags?: string[] | null
          template_name: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          workflow_config?: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          default_settings?: Json | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          rating?: number | null
          rating_count?: number | null
          tags?: string[] | null
          template_name?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          workflow_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "campaign_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_variants: {
        Row: {
          campaign_id: string
          content_changes: Json | null
          created_at: string | null
          id: string
          is_control: boolean | null
          is_winner: boolean | null
          performance_metrics: Json | null
          recipient_count: number | null
          send_time_offset: number | null
          split_percentage: number | null
          subject_line: string | null
          template_id: string | null
          variant_name: string
          variant_type: string
        }
        Insert: {
          campaign_id: string
          content_changes?: Json | null
          created_at?: string | null
          id?: string
          is_control?: boolean | null
          is_winner?: boolean | null
          performance_metrics?: Json | null
          recipient_count?: number | null
          send_time_offset?: number | null
          split_percentage?: number | null
          subject_line?: string | null
          template_id?: string | null
          variant_name: string
          variant_type: string
        }
        Update: {
          campaign_id?: string
          content_changes?: Json | null
          created_at?: string | null
          id?: string
          is_control?: boolean | null
          is_winner?: boolean | null
          performance_metrics?: Json | null
          recipient_count?: number | null
          send_time_offset?: number | null
          split_percentage?: number | null
          subject_line?: string | null
          template_id?: string | null
          variant_name?: string
          variant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_variants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_workflows: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          trigger_conditions: Json | null
          updated_at: string | null
          user_id: string
          workflow_config: Json
          workflow_name: string
          workflow_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          trigger_conditions?: Json | null
          updated_at?: string | null
          user_id: string
          workflow_config?: Json
          workflow_name: string
          workflow_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          trigger_conditions?: Json | null
          updated_at?: string | null
          user_id?: string
          workflow_config?: Json
          workflow_name?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_workflows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_health_log: {
        Row: {
          connection_type: string
          error_message: string | null
          id: string
          metrics: Json | null
          ping_time_ms: number | null
          recorded_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          connection_type: string
          error_message?: string | null
          id?: string
          metrics?: Json | null
          ping_time_ms?: number | null
          recorded_at?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          connection_type?: string
          error_message?: string | null
          id?: string
          metrics?: Json | null
          ping_time_ms?: number | null
          recorded_at?: string | null
          status?: string
          user_id?: string | null
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
        ]
      }
      content_personalization_rules: {
        Row: {
          conditions: Json
          content_variations: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          performance_metrics: Json | null
          rule_name: string
          rule_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conditions?: Json
          content_variations?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          performance_metrics?: Json | null
          rule_name: string
          rule_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conditions?: Json
          content_variations?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          performance_metrics?: Json | null
          rule_name?: string
          rule_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_personalization_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_connections: {
        Row: {
          access_token: string | null
          api_key: string | null
          config: Json | null
          connection_name: string
          created_at: string | null
          crm_type: string
          error_count: number | null
          error_message: string | null
          id: string
          instance_url: string | null
          is_active: boolean | null
          is_primary: boolean | null
          last_sync_at: string | null
          next_sync_at: string | null
          refresh_token: string | null
          status: string | null
          sync_direction: string | null
          sync_enabled: boolean | null
          sync_frequency_hours: number | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          config?: Json | null
          connection_name: string
          created_at?: string | null
          crm_type: string
          error_count?: number | null
          error_message?: string | null
          id?: string
          instance_url?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          refresh_token?: string | null
          status?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          sync_frequency_hours?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          config?: Json | null
          connection_name?: string
          created_at?: string | null
          crm_type?: string
          error_count?: number | null
          error_message?: string | null
          id?: string
          instance_url?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          refresh_token?: string | null
          status?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          sync_frequency_hours?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crm_field_mappings: {
        Row: {
          conflict_resolution: string | null
          connection_id: string
          created_at: string | null
          crm_field: string
          crm_object_type: string
          default_value: string | null
          id: string
          is_required: boolean | null
          sync_direction: string | null
          transformation_rules: Json | null
          updated_at: string | null
          webinar_field: string
        }
        Insert: {
          conflict_resolution?: string | null
          connection_id: string
          created_at?: string | null
          crm_field: string
          crm_object_type: string
          default_value?: string | null
          id?: string
          is_required?: boolean | null
          sync_direction?: string | null
          transformation_rules?: Json | null
          updated_at?: string | null
          webinar_field: string
        }
        Update: {
          conflict_resolution?: string | null
          connection_id?: string
          created_at?: string | null
          crm_field?: string
          crm_object_type?: string
          default_value?: string | null
          id?: string
          is_required?: boolean | null
          sync_direction?: string | null
          transformation_rules?: Json | null
          updated_at?: string | null
          webinar_field?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_field_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sync_conflicts: {
        Row: {
          conflict_type: string
          connection_id: string
          created_at: string | null
          crm_value: Json | null
          field_name: string | null
          id: string
          resolution_method: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_value: Json | null
          status: string | null
          sync_log_id: string
          webinar_value: Json | null
        }
        Insert: {
          conflict_type: string
          connection_id: string
          created_at?: string | null
          crm_value?: Json | null
          field_name?: string | null
          id?: string
          resolution_method?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_value?: Json | null
          status?: string | null
          sync_log_id: string
          webinar_value?: Json | null
        }
        Update: {
          conflict_type?: string
          connection_id?: string
          created_at?: string | null
          crm_value?: Json | null
          field_name?: string | null
          id?: string
          resolution_method?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_value?: Json | null
          status?: string | null
          sync_log_id?: string
          webinar_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_sync_conflicts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sync_conflicts_sync_log_id_fkey"
            columns: ["sync_log_id"]
            isOneToOne: false
            referencedRelation: "crm_sync_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sync_logs: {
        Row: {
          completed_at: string | null
          conflict_details: Json | null
          connection_id: string
          created_at: string | null
          crm_object_id: string | null
          crm_object_type: string | null
          data_after: Json | null
          data_before: Json | null
          direction: string
          duration_ms: number | null
          error_message: string | null
          field_changes: Json | null
          id: string
          operation_type: string
          participant_id: string | null
          records_conflicts: number | null
          records_failed: number | null
          records_processed: number | null
          records_success: number | null
          resolution_action: string | null
          started_at: string | null
          status: string
          sync_type: string
          webinar_id: string | null
        }
        Insert: {
          completed_at?: string | null
          conflict_details?: Json | null
          connection_id: string
          created_at?: string | null
          crm_object_id?: string | null
          crm_object_type?: string | null
          data_after?: Json | null
          data_before?: Json | null
          direction: string
          duration_ms?: number | null
          error_message?: string | null
          field_changes?: Json | null
          id?: string
          operation_type: string
          participant_id?: string | null
          records_conflicts?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_success?: number | null
          resolution_action?: string | null
          started_at?: string | null
          status: string
          sync_type: string
          webinar_id?: string | null
        }
        Update: {
          completed_at?: string | null
          conflict_details?: Json | null
          connection_id?: string
          created_at?: string | null
          crm_object_id?: string | null
          crm_object_type?: string | null
          data_after?: Json | null
          data_before?: Json | null
          direction?: string
          duration_ms?: number | null
          error_message?: string | null
          field_changes?: Json | null
          id?: string
          operation_type?: string
          participant_id?: string | null
          records_conflicts?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_success?: number | null
          resolution_action?: string | null
          started_at?: string | null
          status?: string
          sync_type?: string
          webinar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sync_logs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "zoom_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_webhooks: {
        Row: {
          connection_id: string
          created_at: string | null
          event_types: string[] | null
          id: string
          is_active: boolean | null
          last_ping_at: string | null
          signature_header: string | null
          status: string | null
          updated_at: string | null
          verification_method: string | null
          webhook_secret: string | null
          webhook_url: string
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          event_types?: string[] | null
          id?: string
          is_active?: boolean | null
          last_ping_at?: string | null
          signature_header?: string | null
          status?: string | null
          updated_at?: string | null
          verification_method?: string | null
          webhook_secret?: string | null
          webhook_url: string
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          event_types?: string[] | null
          id?: string
          is_active?: boolean | null
          last_ping_at?: string | null
          signature_header?: string | null
          status?: string | null
          updated_at?: string | null
          verification_method?: string | null
          webhook_secret?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhooks_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_import_rows: {
        Row: {
          created_at: string | null
          created_entity_id: string | null
          error_message: string | null
          id: string
          import_id: string
          mapped_data: Json | null
          raw_data: Json
          row_number: number
          status: string
        }
        Insert: {
          created_at?: string | null
          created_entity_id?: string | null
          error_message?: string | null
          id?: string
          import_id: string
          mapped_data?: Json | null
          raw_data: Json
          row_number: number
          status: string
        }
        Update: {
          created_at?: string | null
          created_entity_id?: string | null
          error_message?: string | null
          id?: string
          import_id?: string
          mapped_data?: Json | null
          raw_data?: Json
          row_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "csv_import_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "csv_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_imports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_operation: string | null
          duplicate_rows: number | null
          failed_rows: number | null
          field_mapping: Json | null
          file_name: string
          file_size: number
          id: string
          import_options: Json | null
          import_type: string
          original_filename: string
          processed_rows: number | null
          processing_errors: Json | null
          progress_percentage: number | null
          started_at: string | null
          status: string | null
          successful_rows: number | null
          total_rows: number | null
          updated_at: string | null
          user_id: string
          validation_errors: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_operation?: string | null
          duplicate_rows?: number | null
          failed_rows?: number | null
          field_mapping?: Json | null
          file_name: string
          file_size: number
          id?: string
          import_options?: Json | null
          import_type: string
          original_filename: string
          processed_rows?: number | null
          processing_errors?: Json | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          successful_rows?: number | null
          total_rows?: number | null
          updated_at?: string | null
          user_id: string
          validation_errors?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_operation?: string | null
          duplicate_rows?: number | null
          failed_rows?: number | null
          field_mapping?: Json | null
          file_name?: string
          file_size?: number
          id?: string
          import_options?: Json | null
          import_type?: string
          original_filename?: string
          processed_rows?: number | null
          processing_errors?: Json | null
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          successful_rows?: number | null
          total_rows?: number | null
          updated_at?: string | null
          user_id?: string
          validation_errors?: Json | null
        }
        Relationships: []
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
      deliverability_alerts: {
        Row: {
          alert_level: string
          alert_type: string
          campaign_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          alert_level?: string
          alert_type: string
          campaign_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          alert_level?: string
          alert_type?: string
          campaign_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverability_alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverability_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverability_metrics: {
        Row: {
          created_at: string | null
          id: string
          metric_type: string
          metric_value: number
          provider: string | null
          recorded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_type: string
          metric_value: number
          provider?: string | null
          recorded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_type?: string
          metric_value?: number
          provider?: string | null
          recorded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverability_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverability_reports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          file_url: string | null
          id: string
          period_end: string
          period_start: string
          report_type: string
          status: string
          summary_data: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          period_end: string
          period_start: string
          report_type: string
          status?: string
          summary_data?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          period_end?: string
          period_start?: string
          report_type?: string
          status?: string
          summary_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverability_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_segment_membership: {
        Row: {
          added_at: string | null
          email_address: string
          id: string
          last_updated_at: string | null
          membership_reason: Json | null
          membership_score: number | null
          segment_id: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          email_address: string
          id?: string
          last_updated_at?: string | null
          membership_reason?: Json | null
          membership_score?: number | null
          segment_id: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          email_address?: string
          id?: string
          last_updated_at?: string | null
          membership_reason?: Json | null
          membership_score?: number | null
          segment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_segment_membership_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "audience_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_segment_membership_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_bounces: {
        Row: {
          email_send_id: string | null
          event_data: Json | null
          event_type: string
          id: string
          received_at: string | null
          recipient_email: string
        }
        Insert: {
          email_send_id?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          received_at?: string | null
          recipient_email: string
        }
        Update: {
          email_send_id?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          received_at?: string | null
          recipient_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_bounces_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          audience_segment: Json
          campaign_type: string
          created_at: string | null
          id: string
          last_run_at: string | null
          send_schedule: Json | null
          status: string
          subject_template: string
          template_id: string | null
          updated_at: string | null
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          audience_segment?: Json
          campaign_type: string
          created_at?: string | null
          id?: string
          last_run_at?: string | null
          send_schedule?: Json | null
          status?: string
          subject_template: string
          template_id?: string | null
          updated_at?: string | null
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          audience_segment?: Json
          campaign_type?: string
          created_at?: string | null
          id?: string
          last_run_at?: string | null
          send_schedule?: Json | null
          status?: string
          subject_template?: string
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      email_performance_analytics: {
        Row: {
          calculated_at: string | null
          campaign_id: string | null
          date_period: string
          id: string
          metrics: Json
          period_type: string
          user_id: string | null
        }
        Insert: {
          calculated_at?: string | null
          campaign_id?: string | null
          date_period: string
          id?: string
          metrics?: Json
          period_type: string
          user_id?: string | null
        }
        Update: {
          calculated_at?: string | null
          campaign_id?: string | null
          date_period?: string
          id?: string
          metrics?: Json
          period_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_performance_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_performance_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          id: string
          preference_management_token: string | null
          preference_token_expires_at: string | null
          preferences: Json | null
          unsubscribed: boolean | null
          unsubscribed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          preference_management_token?: string | null
          preference_token_expires_at?: string | null
          preferences?: Json | null
          unsubscribed?: boolean | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          preference_management_token?: string | null
          preference_token_expires_at?: string | null
          preferences?: Json | null
          unsubscribed?: boolean | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_reputation_history: {
        Row: {
          created_at: string | null
          domain_reputation: number | null
          id: string
          ip_reputation: number | null
          provider: string | null
          recorded_date: string
          sender_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          domain_reputation?: number | null
          id?: string
          ip_reputation?: number | null
          provider?: string | null
          recorded_date: string
          sender_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          domain_reputation?: number | null
          id?: string
          ip_reputation?: number | null
          provider?: string | null
          recorded_date?: string
          sender_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reputation_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_queue: {
        Row: {
          attempts: number | null
          campaign_id: string
          created_at: string | null
          error_message: string | null
          id: string
          max_attempts: number | null
          personalization_data: Json | null
          priority: number | null
          recipient_email: string
          recipient_id: string | null
          scheduled_send_time: string
          sent_at: string | null
          status: string | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          attempts?: number | null
          campaign_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          personalization_data?: Json | null
          priority?: number | null
          recipient_email: string
          recipient_id?: string | null
          scheduled_send_time: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          attempts?: number | null
          campaign_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          personalization_data?: Json | null
          priority?: number | null
          recipient_email?: string
          recipient_id?: string | null
          scheduled_send_time?: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_queue_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_queue_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "campaign_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          ab_variant: string | null
          body_html: string | null
          bounce_time: string | null
          campaign_id: string | null
          click_time: string | null
          click_tracking_enabled: boolean | null
          complaint_time: string | null
          created_at: string | null
          error_message: string | null
          error_type: string | null
          id: string
          metadata: Json | null
          open_time: string | null
          recipient_email: string
          recipient_id: string | null
          send_time: string | null
          status: string
          subject: string | null
          tracking_pixel_url: string | null
          unsubscribe_time: string | null
          unsubscribe_url: string | null
        }
        Insert: {
          ab_variant?: string | null
          body_html?: string | null
          bounce_time?: string | null
          campaign_id?: string | null
          click_time?: string | null
          click_tracking_enabled?: boolean | null
          complaint_time?: string | null
          created_at?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          metadata?: Json | null
          open_time?: string | null
          recipient_email: string
          recipient_id?: string | null
          send_time?: string | null
          status?: string
          subject?: string | null
          tracking_pixel_url?: string | null
          unsubscribe_time?: string | null
          unsubscribe_url?: string | null
        }
        Update: {
          ab_variant?: string | null
          body_html?: string | null
          bounce_time?: string | null
          campaign_id?: string | null
          click_time?: string | null
          click_tracking_enabled?: boolean | null
          complaint_time?: string | null
          created_at?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          metadata?: Json | null
          open_time?: string | null
          recipient_email?: string
          recipient_id?: string | null
          send_time?: string | null
          status?: string
          subject?: string | null
          tracking_pixel_url?: string | null
          unsubscribe_time?: string | null
          unsubscribe_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_blocks: {
        Row: {
          block_content: Json
          block_html: string | null
          block_type: string
          created_at: string | null
          id: string
          is_system: boolean
          user_id: string | null
        }
        Insert: {
          block_content: Json
          block_html?: string | null
          block_type: string
          created_at?: string | null
          id?: string
          is_system?: boolean
          user_id?: string | null
        }
        Update: {
          block_content?: Json
          block_html?: string | null
          block_type?: string
          created_at?: string | null
          id?: string
          is_system?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_template_blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_collection_items: {
        Row: {
          added_at: string | null
          collection_id: string
          id: string
          template_id: string
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          id?: string
          template_id: string
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_template_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "email_template_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_collection_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_collections: {
        Row: {
          collection_name: string
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          collection_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          collection_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_template_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_tags: {
        Row: {
          created_at: string | null
          id: string
          tag_name: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag_name: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag_name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_template_tags_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_usage: {
        Row: {
          id: string
          template_id: string
          used_at: string | null
          used_by: string | null
          used_in_campaign: string | null
        }
        Insert: {
          id?: string
          template_id: string
          used_at?: string | null
          used_by?: string | null
          used_in_campaign?: string | null
        }
        Update: {
          id?: string
          template_id?: string
          used_at?: string | null
          used_by?: string | null
          used_in_campaign?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_template_usage_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_usage_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_usage_used_in_campaign_fkey"
            columns: ["used_in_campaign"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_versions: {
        Row: {
          change_summary: string | null
          created_at: string | null
          created_by: string | null
          design_json: Json
          html_template: string
          id: string
          is_published: boolean | null
          template_id: string
          template_name: string
          variables: Json | null
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          design_json?: Json
          html_template: string
          id?: string
          is_published?: boolean | null
          template_id: string
          template_name: string
          variables?: Json | null
          version_number: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          design_json?: Json
          html_template?: string
          id?: string
          is_published?: boolean | null
          template_id?: string
          template_name?: string
          variables?: Json | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          created_at: string | null
          design_json: Json
          html_template: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_public: boolean | null
          is_system_template: boolean | null
          last_used_at: string | null
          preview_image_url: string | null
          rating: number | null
          rating_count: number | null
          subject_template: string
          tags: string[] | null
          template_name: string
          template_type: string
          text_template: string | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
          variables: Json | null
          version_number: number | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          design_json?: Json
          html_template: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_public?: boolean | null
          is_system_template?: boolean | null
          last_used_at?: string | null
          preview_image_url?: string | null
          rating?: number | null
          rating_count?: number | null
          subject_template: string
          tags?: string[] | null
          template_name: string
          template_type: string
          text_template?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          variables?: Json | null
          version_number?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          design_json?: Json
          html_template?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_public?: boolean | null
          is_system_template?: boolean | null
          last_used_at?: string | null
          preview_image_url?: string | null
          rating?: number | null
          rating_count?: number | null
          subject_template?: string
          tags?: string[] | null
          template_name?: string
          template_type?: string
          text_template?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          variables?: Json | null
          version_number?: number | null
        }
        Relationships: []
      }
      email_tracking_events: {
        Row: {
          created_at: string | null
          email_send_id: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email_send_id: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email_send_id?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_tracking_events_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
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
        ]
      }
      engagement_scoring_models: {
        Row: {
          created_at: string | null
          feature_weights: Json | null
          id: string
          is_active: boolean | null
          last_trained_at: string | null
          model_config: Json
          model_name: string
          model_type: string
          performance_metrics: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature_weights?: Json | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          model_config?: Json
          model_name: string
          model_type: string
          performance_metrics?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature_weights?: Json | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          model_config?: Json
          model_name?: string
          model_type?: string
          performance_metrics?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_scoring_models_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      export_dead_letter_queue: {
        Row: {
          created_at: string | null
          export_config: Json
          export_type: string
          failure_reason: string | null
          id: string
          moved_to_dlq_at: string | null
          original_job_id: string
          retry_history: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          export_config: Json
          export_type: string
          failure_reason?: string | null
          id?: string
          moved_to_dlq_at?: string | null
          original_job_id: string
          retry_history?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          export_config?: Json
          export_type?: string
          failure_reason?: string | null
          id?: string
          moved_to_dlq_at?: string | null
          original_job_id?: string
          retry_history?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      export_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          expires_at: string | null
          export_config: Json | null
          export_format: string | null
          export_type: string
          file_size: number | null
          file_url: string | null
          id: string
          max_retries: number | null
          next_retry_at: string | null
          performance_metrics: Json | null
          progress_percentage: number | null
          retry_count: number | null
          retry_policy: Json | null
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_config?: Json | null
          export_format?: string | null
          export_type: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          performance_metrics?: Json | null
          progress_percentage?: number | null
          retry_count?: number | null
          retry_policy?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_config?: Json | null
          export_format?: string | null
          export_type?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          performance_metrics?: Json | null
          progress_percentage?: number | null
          retry_count?: number | null
          retry_policy?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      optimization_experiments: {
        Row: {
          control_group_size: number | null
          created_at: string | null
          end_date: string | null
          experiment_name: string
          experiment_type: string
          hypothesis: string | null
          id: string
          results: Json | null
          start_date: string | null
          statistical_significance: number | null
          status: string | null
          success_metrics: Json | null
          test_configurations: Json
          updated_at: string | null
          user_id: string
          winner_variant: string | null
        }
        Insert: {
          control_group_size?: number | null
          created_at?: string | null
          end_date?: string | null
          experiment_name: string
          experiment_type: string
          hypothesis?: string | null
          id?: string
          results?: Json | null
          start_date?: string | null
          statistical_significance?: number | null
          status?: string | null
          success_metrics?: Json | null
          test_configurations?: Json
          updated_at?: string | null
          user_id: string
          winner_variant?: string | null
        }
        Update: {
          control_group_size?: number | null
          created_at?: string | null
          end_date?: string | null
          experiment_name?: string
          experiment_type?: string
          hypothesis?: string | null
          id?: string
          results?: Json | null
          start_date?: string | null
          statistical_significance?: number | null
          status?: string | null
          success_metrics?: Json | null
          test_configurations?: Json
          updated_at?: string | null
          user_id?: string
          winner_variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optimization_experiments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagination_tokens: {
        Row: {
          created_at: string | null
          data_hash: string
          expires_at: string
          id: string
          last_accessed_at: string | null
          query_params: Json
          token: string
          user_id: string | null
          webinar_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_hash: string
          expires_at: string
          id?: string
          last_accessed_at?: string | null
          query_params?: Json
          token: string
          user_id?: string | null
          webinar_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_hash?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          query_params?: Json
          token?: string
          user_id?: string | null
          webinar_id?: string | null
        }
        Relationships: []
      }
      participant_sync_debug_log: {
        Row: {
          created_at: string | null
          field_issues: Json | null
          id: string
          processing_errors: string[] | null
          raw_participant_data: Json
          webinar_id: string
        }
        Insert: {
          created_at?: string | null
          field_issues?: Json | null
          id?: string
          processing_errors?: string[] | null
          raw_participant_data: Json
          webinar_id: string
        }
        Update: {
          created_at?: string | null
          field_issues?: Json | null
          id?: string
          processing_errors?: string[] | null
          raw_participant_data?: Json
          webinar_id?: string
        }
        Relationships: []
      }
      personalization_rules: {
        Row: {
          conditions: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          replacements: Json
          rule_name: string
          rule_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conditions?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          replacements?: Json
          rule_name: string
          rule_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conditions?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          replacements?: Json
          rule_name?: string
          rule_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personalization_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_models: {
        Row: {
          accuracy_score: number | null
          algorithm: string
          created_at: string | null
          f1_score: number | null
          feature_columns: Json | null
          id: string
          is_active: boolean | null
          last_trained_at: string | null
          model_file_path: string | null
          model_name: string
          model_parameters: Json | null
          model_type: string
          precision_score: number | null
          recall_score: number | null
          target_column: string | null
          training_data_size: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy_score?: number | null
          algorithm: string
          created_at?: string | null
          f1_score?: number | null
          feature_columns?: Json | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          model_file_path?: string | null
          model_name: string
          model_parameters?: Json | null
          model_type: string
          precision_score?: number | null
          recall_score?: number | null
          target_column?: string | null
          training_data_size?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy_score?: number | null
          algorithm?: string
          created_at?: string | null
          f1_score?: number | null
          feature_columns?: Json | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          model_file_path?: string | null
          model_name?: string
          model_parameters?: Json | null
          model_type?: string
          precision_score?: number | null
          recall_score?: number | null
          target_column?: string | null
          training_data_size?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictive_models_user_id_fkey"
            columns: ["user_id"]
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
      report_history: {
        Row: {
          created_at: string | null
          delivery_details: Json | null
          delivery_status: string | null
          export_queue_id: string | null
          file_size: number | null
          file_url: string | null
          generation_time_ms: number | null
          id: string
          recipient_count: number | null
          report_title: string
          report_type: string
          scheduled_report_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_details?: Json | null
          delivery_status?: string | null
          export_queue_id?: string | null
          file_size?: number | null
          file_url?: string | null
          generation_time_ms?: number | null
          id?: string
          recipient_count?: number | null
          report_title: string
          report_type: string
          scheduled_report_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_details?: Json | null
          delivery_status?: string | null
          export_queue_id?: string | null
          file_size?: number | null
          file_url?: string | null
          generation_time_ms?: number | null
          id?: string
          recipient_count?: number | null
          report_title?: string
          report_type?: string
          scheduled_report_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_history_export_queue_id_fkey"
            columns: ["export_queue_id"]
            isOneToOne: false
            referencedRelation: "export_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_history_scheduled_report_id_fkey"
            columns: ["scheduled_report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          branding_config: Json | null
          content_sections: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          layout_config: Json | null
          template_description: string | null
          template_name: string
          template_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          branding_config?: Json | null
          content_sections?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          layout_config?: Json | null
          template_description?: string | null
          template_name: string
          template_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          branding_config?: Json | null
          content_sections?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          layout_config?: Json | null
          template_description?: string | null
          template_name?: string
          template_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          created_at: string | null
          filter_config: Json | null
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          next_send_at: string | null
          recipient_list: Json | null
          report_name: string
          report_type: string
          schedule_config: Json | null
          schedule_frequency: string
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filter_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          next_send_at?: string | null
          recipient_list?: Json | null
          report_name: string
          report_type: string
          schedule_config?: Json | null
          schedule_frequency: string
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          filter_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          next_send_at?: string | null
          recipient_list?: Json | null
          report_name?: string
          report_type?: string
          schedule_config?: Json | null
          schedule_frequency?: string
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_syncs: {
        Row: {
          connection_id: string | null
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          id: string
          scheduled_for: string
          status: string
          sync_config: Json
          sync_log_id: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          scheduled_for: string
          status?: string
          sync_config?: Json
          sync_log_id?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          scheduled_for?: string
          status?: string
          sync_config?: Json
          sync_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_syncs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_syncs_sync_log_id_fkey"
            columns: ["sync_log_id"]
            isOneToOne: false
            referencedRelation: "zoom_sync_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      send_time_analytics: {
        Row: {
          click_rate: number | null
          created_at: string | null
          engagement_score: number | null
          id: string
          last_calculated: string | null
          open_rate: number | null
          recipient_email: string
          sample_size: number | null
          send_day_of_week: number
          send_hour: number
          timezone: string | null
          user_id: string
        }
        Insert: {
          click_rate?: number | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_calculated?: string | null
          open_rate?: number | null
          recipient_email: string
          sample_size?: number | null
          send_day_of_week: number
          send_hour: number
          timezone?: string | null
          user_id: string
        }
        Update: {
          click_rate?: number | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_calculated?: string | null
          open_rate?: number | null
          recipient_email?: string
          sample_size?: number | null
          send_day_of_week?: number
          send_hour?: number
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "send_time_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      send_time_optimization: {
        Row: {
          confidence_level: number | null
          engagement_score: number | null
          id: string
          last_updated: string | null
          optimal_day_of_week: number | null
          optimal_hour: number | null
          recipient_email: string
          sample_size: number | null
          timezone: string | null
          user_id: string
        }
        Insert: {
          confidence_level?: number | null
          engagement_score?: number | null
          id?: string
          last_updated?: string | null
          optimal_day_of_week?: number | null
          optimal_hour?: number | null
          recipient_email: string
          sample_size?: number | null
          timezone?: string | null
          user_id: string
        }
        Update: {
          confidence_level?: number | null
          engagement_score?: number | null
          id?: string
          last_updated?: string | null
          optimal_day_of_week?: number | null
          optimal_hour?: number | null
          recipient_email?: string
          sample_size?: number | null
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "send_time_optimization_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_performance_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_name: string
          metric_unit: string | null
          metric_value: number
          recorded_at: string
          sync_id: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          recorded_at?: string
          sync_id: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          recorded_at?: string
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
          sync_id: string | null
          update_type: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          message: string
          progress_percentage?: number | null
          sync_id?: string | null
          update_type: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string
          progress_percentage?: number | null
          sync_id?: string | null
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_progress_updates_sync_id_fkey"
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
          created_at: string
          error_message: string | null
          estimated_duration_seconds: number | null
          id: string
          queue_position: number
          started_at: string | null
          status: string
          sync_id: string
          updated_at: string
          webinar_id: string
          webinar_title: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          estimated_duration_seconds?: number | null
          id?: string
          queue_position: number
          started_at?: string | null
          status?: string
          sync_id: string
          updated_at?: string
          webinar_id: string
          webinar_title?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          estimated_duration_seconds?: number | null
          id?: string
          queue_position?: number
          started_at?: string | null
          status?: string
          sync_id?: string
          updated_at?: string
          webinar_id?: string
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
          connection_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          connection_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          connection_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_schedules_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "zoom_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_state: {
        Row: {
          connection_id: string | null
          created_at: string | null
          id: string
          last_processed_item: string | null
          processed_items: number | null
          state_data: Json
          state_type: string
          sync_id: string | null
          total_items: number | null
          updated_at: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string | null
          id?: string
          last_processed_item?: string | null
          processed_items?: number | null
          state_data?: Json
          state_type: string
          sync_id?: string | null
          total_items?: number | null
          updated_at?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string | null
          id?: string
          last_processed_item?: string | null
          processed_items?: number | null
          state_data?: Json
          state_type?: string
          sync_id?: string | null
          total_items?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_state_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_state_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "zoom_sync_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      template_library: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          is_system_template: boolean | null
          preview_image_url: string | null
          rating: number | null
          rating_count: number | null
          tags: string[] | null
          template_content: Json
          template_name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_system_template?: boolean | null
          preview_image_url?: string | null
          rating?: number | null
          rating_count?: number | null
          tags?: string[] | null
          template_content: Json
          template_name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_system_template?: boolean | null
          preview_image_url?: string | null
          rating?: number | null
          rating_count?: number | null
          tags?: string[] | null
          template_content?: Json
          template_name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_behavior_profiles: {
        Row: {
          churn_risk_score: number | null
          content_preferences: Json | null
          created_at: string | null
          email_address: string
          engagement_score: number | null
          id: string
          interaction_history: Json | null
          last_engagement_at: string | null
          lifecycle_stage: string | null
          predicted_ltv: number | null
          preferred_day_of_week: number | null
          preferred_send_hour: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          churn_risk_score?: number | null
          content_preferences?: Json | null
          created_at?: string | null
          email_address: string
          engagement_score?: number | null
          id?: string
          interaction_history?: Json | null
          last_engagement_at?: string | null
          lifecycle_stage?: string | null
          predicted_ltv?: number | null
          preferred_day_of_week?: number | null
          preferred_send_hour?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          churn_risk_score?: number | null
          content_preferences?: Json | null
          created_at?: string | null
          email_address?: string
          engagement_score?: number | null
          id?: string
          interaction_history?: Json | null
          last_engagement_at?: string | null
          lifecycle_stage?: string | null
          predicted_ltv?: number | null
          preferred_day_of_week?: number | null
          preferred_send_hour?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_behavior_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      webhook_events: {
        Row: {
          event_data: Json
          event_type: string
          id: string
          processed: boolean | null
          processed_at: string | null
          processing_error: string | null
          received_at: string | null
          webhook_source: string
        }
        Insert: {
          event_data: Json
          event_type: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
          webhook_source: string
        }
        Update: {
          event_data?: Json
          event_type?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
          webhook_source?: string
        }
        Relationships: []
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
          sync_id: string | null
          webinar_id: string
          webinar_type: string
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
          sync_id?: string | null
          webinar_id: string
          webinar_type: string
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
          sync_id?: string | null
          webinar_id?: string
          webinar_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_sync_queue_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "zoom_sync_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_action_executions: {
        Row: {
          action_id: string
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          execution_id: string
          execution_state: Database["public"]["Enums"]["workflow_execution_state"]
          id: string
          input_data: Json | null
          output_data: Json | null
          retry_count: number | null
          started_at: string
        }
        Insert: {
          action_id: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          execution_state?: Database["public"]["Enums"]["workflow_execution_state"]
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string
        }
        Update: {
          action_id?: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          execution_state?: Database["public"]["Enums"]["workflow_execution_state"]
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_action_executions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "workflow_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_actions: {
        Row: {
          action_config: Json
          action_type: Database["public"]["Enums"]["workflow_action_type"]
          created_at: string
          depends_on_action_id: string | null
          execution_order: number
          id: string
          is_active: boolean
          retry_config: Json | null
          timeout_seconds: number | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          action_config: Json
          action_type: Database["public"]["Enums"]["workflow_action_type"]
          created_at?: string
          depends_on_action_id?: string | null
          execution_order?: number
          id?: string
          is_active?: boolean
          retry_config?: Json | null
          timeout_seconds?: number | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          action_config?: Json
          action_type?: Database["public"]["Enums"]["workflow_action_type"]
          created_at?: string
          depends_on_action_id?: string | null
          execution_order?: number
          id?: string
          is_active?: boolean
          retry_config?: Json | null
          timeout_seconds?: number | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_actions_depends_on_action_id_fkey"
            columns: ["depends_on_action_id"]
            isOneToOne: false
            referencedRelation: "workflow_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_actions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_audit_log: {
        Row: {
          action_type: Database["public"]["Enums"]["workflow_audit_action_type"]
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["workflow_audit_entity_type"]
          execution_id: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
          workflow_id: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["workflow_audit_action_type"]
          created_at?: string
          entity_id?: string | null
          entity_type: Database["public"]["Enums"]["workflow_audit_entity_type"]
          execution_id?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["workflow_audit_action_type"]
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["workflow_audit_entity_type"]
          execution_id?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_audit_log_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_audit_log_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          context_data: Json | null
          created_at: string
          current_action_id: string | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          execution_state: Database["public"]["Enums"]["workflow_execution_state"]
          id: string
          progress_percentage: number | null
          retry_count: number | null
          started_at: string
          trigger_id: string | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          context_data?: Json | null
          created_at?: string
          current_action_id?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          execution_state?: Database["public"]["Enums"]["workflow_execution_state"]
          id?: string
          progress_percentage?: number | null
          retry_count?: number | null
          started_at?: string
          trigger_id?: string | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          context_data?: Json | null
          created_at?: string
          current_action_id?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          execution_state?: Database["public"]["Enums"]["workflow_execution_state"]
          id?: string
          progress_percentage?: number | null
          retry_count?: number | null
          started_at?: string
          trigger_id?: string | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_current_action_id_fkey"
            columns: ["current_action_id"]
            isOneToOne: false
            referencedRelation: "workflow_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "workflow_triggers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          permission_level: Database["public"]["Enums"]["workflow_permission_level"]
          team_id: string | null
          user_id: string | null
          workflow_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_level: Database["public"]["Enums"]["workflow_permission_level"]
          team_id?: string | null
          user_id?: string | null
          workflow_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_level?: Database["public"]["Enums"]["workflow_permission_level"]
          team_id?: string | null
          user_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_permissions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          conditions: Json | null
          created_at: string | null
          delay_hours: number | null
          id: string
          is_active: boolean | null
          step_config: Json
          step_order: number
          step_type: string
          workflow_id: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          delay_hours?: number | null
          id?: string
          is_active?: boolean | null
          step_config?: Json
          step_order: number
          step_type: string
          workflow_id: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          delay_hours?: number | null
          id?: string
          is_active?: boolean | null
          step_config?: Json
          step_order?: number
          step_type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "campaign_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_subscriptions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string
          metadata: Json | null
          next_action_at: string | null
          started_at: string | null
          status: string | null
          subscriber_email: string
          subscriber_id: string | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          metadata?: Json | null
          next_action_at?: string | null
          started_at?: string | null
          status?: string | null
          subscriber_email: string
          subscriber_id?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          metadata?: Json | null
          next_action_at?: string | null
          started_at?: string | null
          status?: string | null
          subscriber_email?: string
          subscriber_id?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_subscriptions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_subscriptions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "campaign_automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: Database["public"]["Enums"]["workflow_template_category"]
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_featured: boolean
          is_public: boolean
          name: string
          rating: number | null
          supported_actions: Json | null
          supported_triggers: Json | null
          tags: string[] | null
          template_config: Json
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["workflow_template_category"]
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          name: string
          rating?: number | null
          supported_actions?: Json | null
          supported_triggers?: Json | null
          tags?: string[] | null
          template_config: Json
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["workflow_template_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          name?: string
          rating?: number | null
          supported_actions?: Json | null
          supported_triggers?: Json | null
          tags?: string[] | null
          template_config?: Json
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_triggers: {
        Row: {
          conditions: Json | null
          cooldown_minutes: number | null
          created_at: string
          id: string
          is_active: boolean
          priority: number | null
          trigger_config: Json
          trigger_type: Database["public"]["Enums"]["workflow_trigger_type"]
          updated_at: string
          workflow_id: string
        }
        Insert: {
          conditions?: Json | null
          cooldown_minutes?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number | null
          trigger_config: Json
          trigger_type: Database["public"]["Enums"]["workflow_trigger_type"]
          updated_at?: string
          workflow_id: string
        }
        Update: {
          conditions?: Json | null
          cooldown_minutes?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number | null
          trigger_config?: Json
          trigger_type?: Database["public"]["Enums"]["workflow_trigger_type"]
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_variables: {
        Row: {
          created_at: string
          execution_id: string | null
          id: string
          scope: string
          updated_at: string
          variable_name: string
          variable_type: Database["public"]["Enums"]["workflow_variable_type"]
          variable_value: Json | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          execution_id?: string | null
          id?: string
          scope?: string
          updated_at?: string
          variable_name: string
          variable_type: Database["public"]["Enums"]["workflow_variable_type"]
          variable_value?: Json | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          execution_id?: string | null
          id?: string
          scope?: string
          updated_at?: string
          variable_name?: string
          variable_type?: Database["public"]["Enums"]["workflow_variable_type"]
          variable_value?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_variables_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_variables_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_template: boolean
          last_triggered_at: string | null
          name: string
          schema_version: string
          status: Database["public"]["Enums"]["workflow_status"]
          success_rate: number | null
          team_id: string | null
          trigger_count: number
          updated_at: string
          user_id: string
          workflow_definition: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean
          last_triggered_at?: string | null
          name: string
          schema_version?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          success_rate?: number | null
          team_id?: string | null
          trigger_count?: number
          updated_at?: string
          user_id: string
          workflow_definition: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean
          last_triggered_at?: string | null
          name?: string
          schema_version?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          success_rate?: number | null
          team_id?: string | null
          trigger_count?: number
          updated_at?: string
          user_id?: string
          workflow_definition?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workflows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          sender_email: string | null
          sender_name: string | null
          sent_at: string | null
          webinar_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          webinar_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          webinar_id?: string | null
        }
        Relationships: []
      }
      zoom_connections: {
        Row: {
          access_token: string
          account_id: string | null
          auto_sync_enabled: boolean | null
          client_id: string | null
          client_secret: string | null
          connection_status: string
          connection_type: string | null
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
          account_id?: string | null
          auto_sync_enabled?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          connection_status?: string
          connection_type?: string | null
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
          account_id?: string | null
          auto_sync_enabled?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          connection_status?: string
          connection_type?: string | null
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
      zoom_panelists: {
        Row: {
          created_at: string | null
          id: string
          join_url: string | null
          name: string | null
          panelist_email: string | null
          panelist_id: string | null
          webinar_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          join_url?: string | null
          name?: string | null
          panelist_email?: string | null
          panelist_id?: string | null
          webinar_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          join_url?: string | null
          name?: string | null
          panelist_email?: string | null
          panelist_id?: string | null
          webinar_id?: string | null
        }
        Relationships: []
      }
      zoom_participants: {
        Row: {
          answered_polling: boolean | null
          asked_question: boolean | null
          attentiveness_score: number | null
          camera_on_duration: number | null
          connection_id: string | null
          connection_type: string | null
          created_at: string | null
          customer_key: string | null
          data_center: string | null
          device: string | null
          domain: string | null
          duration: number | null
          email: string | null
          failover: boolean | null
          generated_participant_id: string | null
          harddisk_id: string | null
          id: string
          internal_user: boolean | null
          ip_address: string | null
          join_time: string | null
          leave_time: string | null
          location: string | null
          mac_addr: string | null
          name: string
          network_type: string | null
          participant_id: string | null
          pc_name: string | null
          posted_chat: boolean | null
          raised_hand: boolean | null
          recording_consent: boolean | null
          registrant_id: string | null
          share_application_duration: number | null
          share_desktop_duration: number | null
          status: Database["public"]["Enums"]["participant_status"] | null
          updated_at: string | null
          user_id: string | null
          version: string | null
          webinar_id: string
        }
        Insert: {
          answered_polling?: boolean | null
          asked_question?: boolean | null
          attentiveness_score?: number | null
          camera_on_duration?: number | null
          connection_id?: string | null
          connection_type?: string | null
          created_at?: string | null
          customer_key?: string | null
          data_center?: string | null
          device?: string | null
          domain?: string | null
          duration?: number | null
          email?: string | null
          failover?: boolean | null
          generated_participant_id?: string | null
          harddisk_id?: string | null
          id?: string
          internal_user?: boolean | null
          ip_address?: string | null
          join_time?: string | null
          leave_time?: string | null
          location?: string | null
          mac_addr?: string | null
          name: string
          network_type?: string | null
          participant_id?: string | null
          pc_name?: string | null
          posted_chat?: boolean | null
          raised_hand?: boolean | null
          recording_consent?: boolean | null
          registrant_id?: string | null
          share_application_duration?: number | null
          share_desktop_duration?: number | null
          status?: Database["public"]["Enums"]["participant_status"] | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
          webinar_id: string
        }
        Update: {
          answered_polling?: boolean | null
          asked_question?: boolean | null
          attentiveness_score?: number | null
          camera_on_duration?: number | null
          connection_id?: string | null
          connection_type?: string | null
          created_at?: string | null
          customer_key?: string | null
          data_center?: string | null
          device?: string | null
          domain?: string | null
          duration?: number | null
          email?: string | null
          failover?: boolean | null
          generated_participant_id?: string | null
          harddisk_id?: string | null
          id?: string
          internal_user?: boolean | null
          ip_address?: string | null
          join_time?: string | null
          leave_time?: string | null
          location?: string | null
          mac_addr?: string | null
          name?: string
          network_type?: string | null
          participant_id?: string | null
          pc_name?: string | null
          posted_chat?: boolean | null
          raised_hand?: boolean | null
          recording_consent?: boolean | null
          registrant_id?: string | null
          share_application_duration?: number | null
          share_desktop_duration?: number | null
          status?: Database["public"]["Enums"]["participant_status"] | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_zoom_participants_connection"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      zoom_registrants: {
        Row: {
          address: string | null
          city: string | null
          comments: string | null
          country: string | null
          create_time: string | null
          created_at: string | null
          custom_questions: Json | null
          email: string
          first_name: string | null
          id: string
          industry: string | null
          job_title: string | null
          join_url: string | null
          language: string | null
          last_name: string | null
          no_of_employees: string | null
          occurrence_id: string | null
          org: string | null
          phone: string | null
          purchasing_time_frame: string | null
          registrant_id: string
          registrant_uuid: string | null
          role_in_purchase_process: string | null
          source_id: string | null
          state: string | null
          status: string | null
          tracking_source: string | null
          tracking_source_id: string | null
          updated_at: string | null
          webinar_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          comments?: string | null
          country?: string | null
          create_time?: string | null
          created_at?: string | null
          custom_questions?: Json | null
          email: string
          first_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          join_url?: string | null
          language?: string | null
          last_name?: string | null
          no_of_employees?: string | null
          occurrence_id?: string | null
          org?: string | null
          phone?: string | null
          purchasing_time_frame?: string | null
          registrant_id: string
          registrant_uuid?: string | null
          role_in_purchase_process?: string | null
          source_id?: string | null
          state?: string | null
          status?: string | null
          tracking_source?: string | null
          tracking_source_id?: string | null
          updated_at?: string | null
          webinar_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          comments?: string | null
          country?: string | null
          create_time?: string | null
          created_at?: string | null
          custom_questions?: Json | null
          email?: string
          first_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          join_url?: string | null
          language?: string | null
          last_name?: string | null
          no_of_employees?: string | null
          occurrence_id?: string | null
          org?: string | null
          phone?: string | null
          purchasing_time_frame?: string | null
          registrant_id?: string
          registrant_uuid?: string | null
          role_in_purchase_process?: string | null
          source_id?: string | null
          state?: string | null
          status?: string | null
          tracking_source?: string | null
          tracking_source_id?: string | null
          updated_at?: string | null
          webinar_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      zoom_segmentation_rules: {
        Row: {
          auto_apply: boolean | null
          created_at: string | null
          id: string
          last_applied_at: string | null
          rule_name: string
          segment_criteria: Json
          updated_at: string | null
          user_id: string | null
          webinar_criteria: Json
        }
        Insert: {
          auto_apply?: boolean | null
          created_at?: string | null
          id?: string
          last_applied_at?: string | null
          rule_name: string
          segment_criteria?: Json
          updated_at?: string | null
          user_id?: string | null
          webinar_criteria?: Json
        }
        Update: {
          auto_apply?: boolean | null
          created_at?: string | null
          id?: string
          last_applied_at?: string | null
          rule_name?: string
          segment_criteria?: Json
          updated_at?: string | null
          user_id?: string | null
          webinar_criteria?: Json
        }
        Relationships: [
          {
            foreignKeyName: "zoom_segmentation_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_server_tokens: {
        Row: {
          access_token: string
          connection_id: string
          created_at: string | null
          expires_at: string
          id: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          connection_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          connection_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_server_tokens_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
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
          current_webinar_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          error_details: Json | null
          error_message: string | null
          failed_items: number | null
          id: string
          max_participant_retries: number | null
          metadata: Json | null
          processed_items: number | null
          progress: Json | null
          rate_limit_hits: number | null
          resource_id: string | null
          resource_type: string | null
          retry_attempts: number | null
          retry_schedule: Json | null
          stage_progress_percentage: number | null
          started_at: string
          status: string
          sync_stage: string | null
          sync_status: string | null
          sync_type: string
          total_items: number | null
          updated_at: string | null
          webinars_synced: number | null
        }
        Insert: {
          api_calls_made?: number | null
          completed_at?: string | null
          connection_id: string
          created_at?: string | null
          current_webinar_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          failed_items?: number | null
          id?: string
          max_participant_retries?: number | null
          metadata?: Json | null
          processed_items?: number | null
          progress?: Json | null
          rate_limit_hits?: number | null
          resource_id?: string | null
          resource_type?: string | null
          retry_attempts?: number | null
          retry_schedule?: Json | null
          stage_progress_percentage?: number | null
          started_at?: string
          status: string
          sync_stage?: string | null
          sync_status?: string | null
          sync_type: string
          total_items?: number | null
          updated_at?: string | null
          webinars_synced?: number | null
        }
        Update: {
          api_calls_made?: number | null
          completed_at?: string | null
          connection_id?: string
          created_at?: string | null
          current_webinar_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          failed_items?: number | null
          id?: string
          max_participant_retries?: number | null
          metadata?: Json | null
          processed_items?: number | null
          progress?: Json | null
          rate_limit_hits?: number | null
          resource_id?: string | null
          resource_type?: string | null
          retry_attempts?: number | null
          retry_schedule?: Json | null
          stage_progress_percentage?: number | null
          started_at?: string
          status?: string
          sync_stage?: string | null
          sync_status?: string | null
          sync_type?: string
          total_items?: number | null
          updated_at?: string | null
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
      zoom_webinar_tracking: {
        Row: {
          created_at: string | null
          id: string
          registration_count: number | null
          source_name: string | null
          tracking_url: string | null
          visitor_count: number | null
          webinar_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          registration_count?: number | null
          source_name?: string | null
          tracking_url?: string | null
          visitor_count?: number | null
          webinar_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          registration_count?: number | null
          source_name?: string | null
          tracking_url?: string | null
          visitor_count?: number | null
          webinar_id?: string | null
        }
        Relationships: []
      }
      zoom_webinars: {
        Row: {
          agenda: string | null
          avg_attendance_duration: number | null
          connection_id: string
          created_at: string | null
          created_at_db: string | null
          duration: number | null
          encrypted_passcode: string | null
          h323_passcode: string | null
          host_email: string | null
          host_id: string
          id: string
          is_simulive: boolean | null
          join_url: string | null
          last_synced_at: string | null
          occurrence_id: string | null
          occurrences: Json | null
          participant_sync_completed_at: string | null
          participant_sync_error: string | null
          participant_sync_status:
            | Database["public"]["Enums"]["participant_sync_status"]
            | null
          password: string | null
          pmi: number | null
          pstn_password: string | null
          recurrence: Json | null
          registration_type: number | null
          registration_url: string | null
          settings: Json | null
          simulive_webinar_id: string | null
          start_time: string | null
          start_url: string | null
          status: string | null
          timezone: string | null
          topic: string
          total_absentees: number | null
          total_attendees: number | null
          total_minutes: number | null
          total_registrants: number | null
          tracking_fields: Json | null
          type: number
          updated_at_db: string | null
          uuid: string
          webinar_id: string
          webinar_passcode: string | null
        }
        Insert: {
          agenda?: string | null
          avg_attendance_duration?: number | null
          connection_id: string
          created_at?: string | null
          created_at_db?: string | null
          duration?: number | null
          encrypted_passcode?: string | null
          h323_passcode?: string | null
          host_email?: string | null
          host_id: string
          id?: string
          is_simulive?: boolean | null
          join_url?: string | null
          last_synced_at?: string | null
          occurrence_id?: string | null
          occurrences?: Json | null
          participant_sync_completed_at?: string | null
          participant_sync_error?: string | null
          participant_sync_status?:
            | Database["public"]["Enums"]["participant_sync_status"]
            | null
          password?: string | null
          pmi?: number | null
          pstn_password?: string | null
          recurrence?: Json | null
          registration_type?: number | null
          registration_url?: string | null
          settings?: Json | null
          simulive_webinar_id?: string | null
          start_time?: string | null
          start_url?: string | null
          status?: string | null
          timezone?: string | null
          topic: string
          total_absentees?: number | null
          total_attendees?: number | null
          total_minutes?: number | null
          total_registrants?: number | null
          tracking_fields?: Json | null
          type?: number
          updated_at_db?: string | null
          uuid: string
          webinar_id: string
          webinar_passcode?: string | null
        }
        Update: {
          agenda?: string | null
          avg_attendance_duration?: number | null
          connection_id?: string
          created_at?: string | null
          created_at_db?: string | null
          duration?: number | null
          encrypted_passcode?: string | null
          h323_passcode?: string | null
          host_email?: string | null
          host_id?: string
          id?: string
          is_simulive?: boolean | null
          join_url?: string | null
          last_synced_at?: string | null
          occurrence_id?: string | null
          occurrences?: Json | null
          participant_sync_completed_at?: string | null
          participant_sync_error?: string | null
          participant_sync_status?:
            | Database["public"]["Enums"]["participant_sync_status"]
            | null
          password?: string | null
          pmi?: number | null
          pstn_password?: string | null
          recurrence?: Json | null
          registration_type?: number | null
          registration_url?: string | null
          settings?: Json | null
          simulive_webinar_id?: string | null
          start_time?: string | null
          start_url?: string | null
          status?: string | null
          timezone?: string | null
          topic?: string
          total_absentees?: number | null
          total_attendees?: number | null
          total_minutes?: number | null
          total_registrants?: number | null
          tracking_fields?: Json | null
          type?: number
          updated_at_db?: string | null
          uuid?: string
          webinar_id?: string
          webinar_passcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinars_new_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "zoom_connections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      recent_audit_activity: {
        Row: {
          action: string | null
          changed_at: string | null
          changed_by_email: string | null
          id: string | null
          record_description: string | null
          table_name: string | null
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
      calculate_campaign_performance: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      calculate_engagement_score: {
        Args: { p_user_id: string; p_email: string }
        Returns: number
      }
      cleanup_expired_pagination_tokens: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_sync_data: {
        Args: { days_to_keep?: number }
        Returns: undefined
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
      ensure_email_preferences_for_profile: {
        Args: { p_profile_id: string }
        Returns: string
      }
      generate_fallback_participant_id: {
        Args: {
          p_webinar_id: string
          p_email: string
          p_name: string
          p_join_time: string
        }
        Returns: string
      }
      get_record_history: {
        Args: { p_table_name: string; p_record_id: string }
        Returns: {
          audit_id: string
          action: string
          changed_at: string
          changed_by: string
          changes: Json
        }[]
      }
      invalidate_cache_dependencies: {
        Args: { dep_pattern: string }
        Returns: number
      }
      migrate_zoom_webinars_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          migrated_count: number
          failed_count: number
        }[]
      }
      populate_performance_metrics_from_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_scheduled_syncs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      test_zoom_sync: {
        Args: { p_connection_id: string; p_user_id: string }
        Returns: Json
      }
      update_all_webinar_statuses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_behavior_profile: {
        Args: { p_user_id: string; p_email: string }
        Returns: undefined
      }
      update_segment_size: {
        Args: { p_segment_id: string }
        Returns: undefined
      }
      update_webinar_computed_fields: {
        Args: {
          p_webinar_id: string
          p_total_registrants: number
          p_total_attendees: number
          p_total_minutes: number
          p_avg_duration: number
        }
        Returns: undefined
      }
      update_webinar_sync_status: {
        Args: {
          p_webinar_id: string
          p_sync_status: string
          p_error_message?: string
        }
        Returns: undefined
      }
      user_owns_connection: {
        Args: { connection_id: string }
        Returns: boolean
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
      participant_status:
        | "in_meeting"
        | "in_waiting_room"
        | "attended"
        | "not_attended"
        | "left_early"
      participant_sync_status:
        | "not_applicable"
        | "pending"
        | "synced"
        | "failed"
        | "no_participants"
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
      workflow_action_type:
        | "email"
        | "sms"
        | "webhook"
        | "crm_update"
        | "delay"
        | "condition"
        | "ai_analysis"
      workflow_audit_action_type:
        | "created"
        | "updated"
        | "deleted"
        | "triggered"
        | "paused"
        | "resumed"
      workflow_audit_entity_type:
        | "workflow"
        | "trigger"
        | "action"
        | "execution"
        | "permission"
      workflow_execution_state:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
        | "paused"
        | "retrying"
        | "skipped"
      workflow_permission_level: "owner" | "editor" | "viewer" | "executor"
      workflow_status: "draft" | "active" | "paused" | "archived"
      workflow_template_category:
        | "registration"
        | "engagement"
        | "follow_up"
        | "analytics"
        | "custom"
      workflow_trigger_type: "time_based" | "event_based" | "webhook" | "manual"
      workflow_variable_type:
        | "string"
        | "number"
        | "boolean"
        | "object"
        | "array"
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
      participant_status: [
        "in_meeting",
        "in_waiting_room",
        "attended",
        "not_attended",
        "left_early",
      ],
      participant_sync_status: [
        "not_applicable",
        "pending",
        "synced",
        "failed",
        "no_participants",
      ],
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
      workflow_action_type: [
        "email",
        "sms",
        "webhook",
        "crm_update",
        "delay",
        "condition",
        "ai_analysis",
      ],
      workflow_audit_action_type: [
        "created",
        "updated",
        "deleted",
        "triggered",
        "paused",
        "resumed",
      ],
      workflow_audit_entity_type: [
        "workflow",
        "trigger",
        "action",
        "execution",
        "permission",
      ],
      workflow_execution_state: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
        "paused",
        "retrying",
        "skipped",
      ],
      workflow_permission_level: ["owner", "editor", "viewer", "executor"],
      workflow_status: ["draft", "active", "paused", "archived"],
      workflow_template_category: [
        "registration",
        "engagement",
        "follow_up",
        "analytics",
        "custom",
      ],
      workflow_trigger_type: ["time_based", "event_based", "webhook", "manual"],
      workflow_variable_type: [
        "string",
        "number",
        "boolean",
        "object",
        "array",
      ],
    },
  },
} as const
