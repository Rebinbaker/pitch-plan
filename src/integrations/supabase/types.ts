export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      customer_interactions: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          interaction_type: string
          organization_id: string
          related_project_id: string | null
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          interaction_type?: string
          organization_id: string
          related_project_id?: string | null
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          interaction_type?: string
          organization_id?: string
          related_project_id?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          id: string
          name: string
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          project_id?: string | null
          size?: number
          type?: string
          uploaded_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          priority?: string
          project_id?: string | null
          project_name?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          organization_id?: string
          role?: string
          user_id?: string
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
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
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
          accommodation_booking: Json | null
          activity_log: Json | null
          actual_construction_start: string | null
          address: string | null
          assigned_trailer: string | null
          avvarat_material: Json | null
          checklist: Json | null
          completion_percentage: number | null
          construction_start_week: string | null
          construction_team: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          deadline: string | null
          estimated_work_days: number | null
          id: string
          material_order: Json | null
          name: string
          notes: string | null
          organization_id: string
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
          accommodation_booking?: Json | null
          activity_log?: Json | null
          actual_construction_start?: string | null
          address?: string | null
          assigned_trailer?: string | null
          avvarat_material?: Json | null
          checklist?: Json | null
          completion_percentage?: number | null
          construction_start_week?: string | null
          construction_team?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deadline?: string | null
          estimated_work_days?: number | null
          id?: string
          material_order?: Json | null
          name: string
          notes?: string | null
          organization_id: string
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
          accommodation_booking?: Json | null
          activity_log?: Json | null
          actual_construction_start?: string | null
          address?: string | null
          assigned_trailer?: string | null
          avvarat_material?: Json | null
          checklist?: Json | null
          completion_percentage?: number | null
          construction_start_week?: string | null
          construction_team?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deadline?: string | null
          estimated_work_days?: number | null
          id?: string
          material_order?: Json | null
          name?: string
          notes?: string | null
          organization_id?: string
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
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: []
      }
      scaffolding: {
        Row: {
          created_at: string
          description: string | null
          id: string
          last_project_location: string | null
          last_project_name: string | null
          last_released_at: string | null
          name: string
          organization_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          last_project_location?: string | null
          last_project_name?: string | null
          last_released_at?: string | null
          name: string
          organization_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          last_project_location?: string | null
          last_project_name?: string | null
          last_released_at?: string | null
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scaffolding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_schedules: {
        Row: {
          created_at: string
          date: string
          hours_planned: number | null
          id: string
          notes: string | null
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          status?: string
          team_id?: string
          team_member_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          performance_notes?: string | null
          sellers?: Json | null
          skills?: Json | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
            foreignKeyName: "time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
        Relationships: [
          {
            foreignKeyName: "time_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
            foreignKeyName: "work_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
        Args: never
        Returns: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_organization_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      sync_trailer_status: { Args: never; Returns: undefined }
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
