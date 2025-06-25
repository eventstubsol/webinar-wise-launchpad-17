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
      csv_imports: {
        Row: {
          completed_at: string | null
          created_at: string
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
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
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
        }
        Update: {
          completed_at?: string | null
          created_at?: string
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
      zoom_sync_logs: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string
          error_message: string | null
          id: string
          processed_items: number | null
          stage_progress_percentage: number | null
          started_at: string
          sync_stage: string | null
          sync_status: string
          sync_type: string
          total_items: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          processed_items?: number | null
          stage_progress_percentage?: number | null
          started_at?: string
          sync_stage?: string | null
          sync_status?: string
          sync_type: string
          total_items?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          processed_items?: number | null
          stage_progress_percentage?: number | null
          started_at?: string
          sync_stage?: string | null
          sync_status?: string
          sync_type?: string
          total_items?: number | null
          updated_at?: string
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
          registration_url: string | null
          start_time: string
          status: string
          synced_at: string
          timezone: string
          topic: string
          updated_at: string
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
          registration_url?: string | null
          start_time: string
          status: string
          synced_at?: string
          timezone: string
          topic: string
          updated_at?: string
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
          registration_url?: string | null
          start_time?: string
          status?: string
          synced_at?: string
          timezone?: string
          topic?: string
          updated_at?: string
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
      [_ in never]: never
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
