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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addon_requests: {
        Row: {
          addon_name: string
          client_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          addon_name: string
          client_id: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          addon_name?: string
          client_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          created_at: string
          id: string
          note: string | null
          post_id: string
          type: Database["public"]["Enums"]["approval_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          post_id: string
          type: Database["public"]["Enums"]["approval_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          post_id?: string
          type?: Database["public"]["Enums"]["approval_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profile: {
        Row: {
          assets_json: Json | null
          brand_voice_json: Json | null
          business_info_json: Json | null
          client_id: string
          content_prefs_json: Json | null
          offers_json: Json | null
          updated_at: string
        }
        Insert: {
          assets_json?: Json | null
          brand_voice_json?: Json | null
          business_info_json?: Json | null
          client_id: string
          content_prefs_json?: Json | null
          offers_json?: Json | null
          updated_at?: string
        }
        Update: {
          assets_json?: Json | null
          brand_voice_json?: Json | null
          business_info_json?: Json | null
          client_id?: string
          content_prefs_json?: Json | null
          offers_json?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profile_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assistants_can_approve: boolean
          created_at: string
          id: string
          name: string
          plan_id: string | null
          status: string
        }
        Insert: {
          assistants_can_approve?: boolean
          created_at?: string
          id?: string
          name: string
          plan_id?: string | null
          status?: string
        }
        Update: {
          assistants_can_approve?: boolean
          created_at?: string
          id?: string
          name?: string
          plan_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string | null
          request_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id?: string | null
          request_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string | null
          request_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          id: string
          includes_json: Json | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          includes_json?: Json | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          includes_json?: Json | null
          name?: string
        }
        Relationships: []
      }
      post_versions: {
        Row: {
          caption: string | null
          created_at: string
          created_by_user_id: string | null
          creative_url: string | null
          hashtags: string | null
          id: string
          post_id: string
          version_number: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by_user_id?: string | null
          creative_url?: string | null
          hashtags?: string | null
          id?: string
          post_id: string
          version_number?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by_user_id?: string | null
          creative_url?: string | null
          hashtags?: string | null
          id?: string
          post_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_versions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_versions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          assigned_to_user_id: string | null
          caption: string | null
          client_id: string
          content_type: string | null
          created_at: string
          created_by_user_id: string | null
          creative_url: string | null
          due_at: string | null
          hashtags: string | null
          id: string
          internal_notes: string | null
          platform: string | null
          request_id: string | null
          reviewer_user_id: string | null
          scheduled_at: string | null
          status_column: Database["public"]["Enums"]["post_status"]
          title: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          caption?: string | null
          client_id: string
          content_type?: string | null
          created_at?: string
          created_by_user_id?: string | null
          creative_url?: string | null
          due_at?: string | null
          hashtags?: string | null
          id?: string
          internal_notes?: string | null
          platform?: string | null
          request_id?: string | null
          reviewer_user_id?: string | null
          scheduled_at?: string | null
          status_column?: Database["public"]["Enums"]["post_status"]
          title: string
        }
        Update: {
          assigned_to_user_id?: string | null
          caption?: string | null
          client_id?: string
          content_type?: string | null
          created_at?: string
          created_by_user_id?: string | null
          creative_url?: string | null
          due_at?: string | null
          hashtags?: string | null
          id?: string
          internal_notes?: string | null
          platform?: string | null
          request_id?: string | null
          reviewer_user_id?: string | null
          scheduled_at?: string | null
          status_column?: Database["public"]["Enums"]["post_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_update_requests: {
        Row: {
          client_id: string
          created_at: string
          id: string
          proposed_profile_json: Json
          review_note: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["profile_update_status"]
          submitted_by_user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          proposed_profile_json: Json
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["profile_update_status"]
          submitted_by_user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          proposed_profile_json?: Json
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["profile_update_status"]
          submitted_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_update_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_update_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_update_requests_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          name: string
          parent_project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          name: string
          parent_project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          name?: string
          parent_project_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          attachments_url: string | null
          client_id: string
          created_at: string
          created_by_user_id: string
          id: string
          notes: string | null
          preferred_publish_window: string | null
          priority: string | null
          status: Database["public"]["Enums"]["request_status"]
          topic: string
          type: Database["public"]["Enums"]["request_type"]
        }
        Insert: {
          attachments_url?: string | null
          client_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          notes?: string | null
          preferred_publish_window?: string | null
          priority?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          topic: string
          type: Database["public"]["Enums"]["request_type"]
        }
        Update: {
          attachments_url?: string | null
          client_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          notes?: string | null
          preferred_publish_window?: string | null
          priority?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          topic?: string
          type?: Database["public"]["Enums"]["request_type"]
        }
        Relationships: [
          {
            foreignKeyName: "requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to_user_id: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          due_at: string | null
          id: string
          priority: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      think_tank_items: {
        Row: {
          body: string | null
          client_id: string | null
          created_at: string
          created_by_user_id: string
          id: string
          project_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          created_by_user_id: string
          id?: string
          project_id?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          created_by_user_id?: string
          id?: string
          project_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "think_tank_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "think_tank_items_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "think_tank_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          parent_user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          parent_user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          parent_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_client: { Args: { _client_id: string }; Returns: boolean }
      get_my_client_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_client_member: { Args: { _client_id: string }; Returns: boolean }
      is_ss_role: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "client_admin"
        | "client_assistant"
        | "ss_admin"
        | "ss_producer"
        | "ss_ops"
      approval_type: "approve" | "approve_with_notes" | "request_changes"
      post_status:
        | "idea"
        | "writing"
        | "design"
        | "internal_review"
        | "client_approval"
        | "request_changes"
        | "approved"
        | "scheduled"
        | "published"
      profile_update_status:
        | "pending"
        | "approved"
        | "changes_requested"
        | "rejected"
      request_status: "open" | "in_progress" | "completed" | "cancelled"
      request_type: "social_post" | "email_campaign"
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
      app_role: [
        "client_admin",
        "client_assistant",
        "ss_admin",
        "ss_producer",
        "ss_ops",
      ],
      approval_type: ["approve", "approve_with_notes", "request_changes"],
      post_status: [
        "idea",
        "writing",
        "design",
        "internal_review",
        "client_approval",
        "request_changes",
        "approved",
        "scheduled",
        "published",
      ],
      profile_update_status: [
        "pending",
        "approved",
        "changes_requested",
        "rejected",
      ],
      request_status: ["open", "in_progress", "completed", "cancelled"],
      request_type: ["social_post", "email_campaign"],
    },
  },
} as const
