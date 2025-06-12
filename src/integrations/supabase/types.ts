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
      decrypt_token: {
        Args: { encrypted_token: string }
        Returns: string
      }
      encrypt_token: {
        Args: { token: string }
        Returns: string
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
