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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      files: {
        Row: {
          id: string
          name: string
          project_id: string | null
          size: number
          type: string
          uploaded_at: string
          url: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          project_id?: string | null
          size: number
          type: string
          uploaded_at?: string
          url: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          project_id?: string | null
          size?: number
          type?: string
          uploaded_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_warranties: {
        Row: {
          customer_address: string
          customer_name: string
          generated_at: string
          generated_by: string
          generated_pdf_url: string
          id: string
          project_id: string
          template_id: string
        }
        Insert: {
          customer_address: string
          customer_name: string
          generated_at?: string
          generated_by: string
          generated_pdf_url: string
          id?: string
          project_id: string
          template_id: string
        }
        Update: {
          customer_address?: string
          customer_name?: string
          generated_at?: string
          generated_by?: string
          generated_pdf_url?: string
          id?: string
          project_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_warranties_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "warranty_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          requested_by: string
          start_date: string
          status: string
          team_id: string
          team_member_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          requested_by: string
          start_date: string
          status?: string
          team_id: string
          team_member_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          requested_by?: string
          start_date?: string
          status?: string
          team_id?: string
          team_member_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_required: boolean
          changed_by_user: string | null
          created_at: string
          field_name: string | null
          id: string
          is_read: boolean
          message: string
          new_value: string | null
          old_value: string | null
          priority: string
          project_id: string | null
          project_name: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_required?: boolean
          changed_by_user?: string | null
          created_at?: string
          field_name?: string | null
          id?: string
          is_read?: boolean
          message: string
          new_value?: string | null
          old_value?: string | null
          priority?: string
          project_id?: string | null
          project_name?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_required?: boolean
          changed_by_user?: string | null
          created_at?: string
          field_name?: string | null
          id?: string
          is_read?: boolean
          message?: string
          new_value?: string | null
          old_value?: string | null
          priority?: string
          project_id?: string | null
          project_name?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          activity_log: Json | null
          actual_construction_start: string | null
          address: string | null
          assigned_trailer: string | null
          checklist: Json | null
          completion_percentage: number | null
          construction_start_week: string | null
          construction_team: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          deadline: string | null
          estimated_work_days: number | null
          id: string
          name: string
          notes: string | null
          region: string | null
          responsible_seller: string | null
          rot_status: string | null
          scaffolding_responsible: string | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
          work_phases: Json | null
        }
        Insert: {
          activity_log?: Json | null
          actual_construction_start?: string | null
          address?: string | null
          assigned_trailer?: string | null
          checklist?: Json | null
          completion_percentage?: number | null
          construction_start_week?: string | null
          construction_team?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          deadline?: string | null
          estimated_work_days?: number | null
          id?: string
          name: string
          notes?: string | null
          region?: string | null
          responsible_seller?: string | null
          rot_status?: string | null
          scaffolding_responsible?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
          work_phases?: Json | null
        }
        Update: {
          activity_log?: Json | null
          actual_construction_start?: string | null
          address?: string | null
          assigned_trailer?: string | null
          checklist?: Json | null
          completion_percentage?: number | null
          construction_start_week?: string | null
          construction_team?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          deadline?: string | null
          estimated_work_days?: number | null
          id?: string
          name?: string
          notes?: string | null
          region?: string | null
          responsible_seller?: string | null
          rot_status?: string | null
          scaffolding_responsible?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          work_phases?: Json | null
        }
        Relationships: []
      }
      scaffolding: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_schedules: {
        Row: {
          created_at: string
          date: string
          hours_planned: number | null
          id: string
          notes: string | null
          status: string
          team_id: string
          team_member_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          hours_planned?: number | null
          id?: string
          notes?: string | null
          status?: string
          team_id: string
          team_member_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours_planned?: number | null
          id?: string
          notes?: string | null
          status?: string
          team_id?: string
          team_member_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_schedules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          availability_next_week: string | null
          contact_info: string | null
          created_at: string
          current_job: string | null
          id: string
          leader: string | null
          members: Json | null
          name: string
          performance_notes: string | null
          sellers: Json | null
          skills: Json | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_next_week?: string | null
          contact_info?: string | null
          created_at?: string
          current_job?: string | null
          id?: string
          leader?: string | null
          members?: Json | null
          name: string
          performance_notes?: string | null
          sellers?: Json | null
          skills?: Json | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_next_week?: string | null
          contact_info?: string | null
          created_at?: string
          current_job?: string | null
          id?: string
          leader?: string | null
          members?: Json | null
          name?: string
          performance_notes?: string | null
          sellers?: Json | null
          skills?: Json | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string
          description: string | null
          duration_hours: number | null
          end_time: string | null
          entry_type: string
          gps_latitude: number | null
          gps_longitude: number | null
          hourly_rate: number | null
          id: string
          is_billable: boolean
          location_address: string | null
          location_verified: boolean | null
          photo_verified: boolean | null
          project_id: string | null
          start_time: string
          team_id: string | null
          updated_at: string
          user_id: string
          verification_photo_url: string | null
          work_phase_name: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          end_time?: string | null
          entry_type?: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          hourly_rate?: number | null
          id?: string
          is_billable?: boolean
          location_address?: string | null
          location_verified?: boolean | null
          photo_verified?: boolean | null
          project_id?: string | null
          start_time: string
          team_id?: string | null
          updated_at?: string
          user_id: string
          verification_photo_url?: string | null
          work_phase_name?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          end_time?: string | null
          entry_type?: string
          gps_latitude?: number | null
          gps_longitude?: number | null
          hourly_rate?: number | null
          id?: string
          is_billable?: boolean
          location_address?: string | null
          location_verified?: boolean | null
          photo_verified?: boolean | null
          project_id?: string | null
          start_time?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
          verification_photo_url?: string | null
          work_phase_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      time_reports: {
        Row: {
          billable_hours: number
          created_at: string
          description: string | null
          end_date: string
          generated_at: string
          id: string
          project_ids: string[] | null
          report_data: Json | null
          report_type: string
          start_date: string
          team_ids: string[] | null
          title: string
          total_cost: number | null
          total_hours: number
          user_id: string
        }
        Insert: {
          billable_hours?: number
          created_at?: string
          description?: string | null
          end_date: string
          generated_at?: string
          id?: string
          project_ids?: string[] | null
          report_data?: Json | null
          report_type: string
          start_date: string
          team_ids?: string[] | null
          title: string
          total_cost?: number | null
          total_hours?: number
          user_id: string
        }
        Update: {
          billable_hours?: number
          created_at?: string
          description?: string | null
          end_date?: string
          generated_at?: string
          id?: string
          project_ids?: string[] | null
          report_data?: Json | null
          report_type?: string
          start_date?: string
          team_ids?: string[] | null
          title?: string
          total_cost?: number | null
          total_hours?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warranty_templates: {
        Row: {
          created_at: string
          created_by: string
          field_coordinates: Json
          id: string
          name: string
          pdf_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          field_coordinates?: Json
          id?: string
          name: string
          pdf_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          field_coordinates?: Json
          id?: string
          name?: string
          pdf_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_sessions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          break_hours: number
          created_at: string
          id: string
          notes: string | null
          overtime_hours: number
          project_id: string | null
          session_date: string
          status: string
          submitted_at: string | null
          team_id: string | null
          total_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          break_hours?: number
          created_at?: string
          id?: string
          notes?: string | null
          overtime_hours?: number
          project_id?: string | null
          session_date: string
          status?: string
          submitted_at?: string | null
          team_id?: string | null
          total_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          break_hours?: number
          created_at?: string
          id?: string
          notes?: string | null
          overtime_hours?: number
          project_id?: string | null
          session_date?: string
          status?: string
          submitted_at?: string | null
          team_id?: string | null
          total_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_as_admin: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_users_for_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string
          username: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      sync_trailer_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
