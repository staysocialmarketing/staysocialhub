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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      agent_morale: {
        Row: {
          agent_name: string
          created_at: string | null
          id: string
          least_engaging: string | null
          lev_summary: string | null
          missing_context: string | null
          most_engaging: string | null
          suggestions: string | null
          week_of: string
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          id?: string
          least_engaging?: string | null
          lev_summary?: string | null
          missing_context?: string | null
          most_engaging?: string | null
          suggestions?: string | null
          week_of: string
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          id?: string
          least_engaging?: string | null
          lev_summary?: string | null
          missing_context?: string | null
          most_engaging?: string | null
          suggestions?: string | null
          week_of?: string
        }
        Relationships: []
      }
      agent_status: {
        Row: {
          id: string
          name: string
          role: string | null
          status: string
          task: string | null
          task_tags: string[] | null
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          role?: string | null
          status?: string
          task?: string | null
          task_tags?: string[] | null
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string | null
          status?: string
          task?: string | null
          task_tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_updates: {
        Row: {
          agent_name: string
          created_at: string | null
          id: string
          output_location: string | null
          status: string | null
          task_summary: string
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          id?: string
          output_location?: string | null
          status?: string | null
          task_summary: string
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          id?: string
          output_location?: string | null
          status?: string | null
          task_summary?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          activation_criteria: string | null
          id: string
          is_placeholder: boolean | null
          member_type: string | null
          name: string
          role: string | null
        }
        Insert: {
          activation_criteria?: string | null
          id: string
          is_placeholder?: boolean | null
          member_type?: string | null
          name: string
          role?: string | null
        }
        Update: {
          activation_criteria?: string | null
          id?: string
          is_placeholder?: boolean | null
          member_type?: string | null
          name?: string
          role?: string | null
        }
        Relationships: []
      }
      allowed_domains: {
        Row: {
          added_by_user_id: string | null
          created_at: string
          domain: string
          id: string
        }
        Insert: {
          added_by_user_id?: string | null
          created_at?: string
          domain: string
          id?: string
        }
        Update: {
          added_by_user_id?: string | null
          created_at?: string
          domain?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowed_domains_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_batch_items: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "approval_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_batch_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_batches: {
        Row: {
          batch_type: string
          client_id: string
          created_at: string
          created_by_user_id: string
          id: string
          name: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          batch_type?: string
          client_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          name: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          batch_type?: string
          client_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          name?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_batches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_batches_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
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
      automation_rules: {
        Row: {
          action_config_json: Json
          action_type: string
          conditions_json: Json
          created_at: string
          created_by_user_id: string
          id: string
          is_active: boolean
          name: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_config_json?: Json
          action_type: string
          conditions_json?: Json
          created_at?: string
          created_by_user_id: string
          id?: string
          is_active?: boolean
          name: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_config_json?: Json
          action_type?: string
          conditions_json?: Json
          created_at?: string
          created_by_user_id?: string
          id?: string
          is_active?: boolean
          name?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      brain_captures: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          client_id: string
          content: string
          converted_to_request_id: string | null
          created_at: string
          created_by_user_id: string
          id: string
          link_url: string | null
          notes: string | null
          tags: Json
          type: string
          voice_transcript: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          client_id: string
          content?: string
          converted_to_request_id?: string | null
          created_at?: string
          created_by_user_id: string
          id?: string
          link_url?: string | null
          notes?: string | null
          tags?: Json
          type?: string
          voice_transcript?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          client_id?: string
          content?: string
          converted_to_request_id?: string | null
          created_at?: string
          created_by_user_id?: string
          id?: string
          link_url?: string | null
          notes?: string | null
          tags?: Json
          type?: string
          voice_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_captures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_captures_converted_to_request_id_fkey"
            columns: ["converted_to_request_id"]
            isOneToOne: false
            referencedRelation: "requests_archive"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_interviews: {
        Row: {
          client_id: string
          created_at: string
          extracted_data: Json | null
          id: string
          messages: Json
          started_by_user_id: string
          status: string
          template: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          extracted_data?: Json | null
          id?: string
          messages?: Json
          started_by_user_id: string
          status?: string
          template?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          extracted_data?: Json | null
          id?: string
          messages?: Json
          started_by_user_id?: string
          status?: string
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_interviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_interviews_started_by_user_id_fkey"
            columns: ["started_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_twin: {
        Row: {
          audience_json: Json
          avoid_list_json: Json
          brand_basics_json: Json
          brand_voice_json: Json
          client_id: string
          colour_direction_json: Json
          composition_json: Json
          content_rules_json: Json
          cta_style_json: Json
          formatting_rules_json: Json
          locked_rules_json: Json
          offers_json: Json
          prompt_notes_json: Json
          seasonal_local_json: Json
          social_direction_json: Json
          source_material_json: Json
          subject_themes_json: Json
          text_on_design_json: Json
          typography_json: Json
          updated_at: string
          visual_design_json: Json
          website_direction_json: Json
        }
        Insert: {
          audience_json?: Json
          avoid_list_json?: Json
          brand_basics_json?: Json
          brand_voice_json?: Json
          client_id: string
          colour_direction_json?: Json
          composition_json?: Json
          content_rules_json?: Json
          cta_style_json?: Json
          formatting_rules_json?: Json
          locked_rules_json?: Json
          offers_json?: Json
          prompt_notes_json?: Json
          seasonal_local_json?: Json
          social_direction_json?: Json
          source_material_json?: Json
          subject_themes_json?: Json
          text_on_design_json?: Json
          typography_json?: Json
          updated_at?: string
          visual_design_json?: Json
          website_direction_json?: Json
        }
        Update: {
          audience_json?: Json
          avoid_list_json?: Json
          brand_basics_json?: Json
          brand_voice_json?: Json
          client_id?: string
          colour_direction_json?: Json
          composition_json?: Json
          content_rules_json?: Json
          cta_style_json?: Json
          formatting_rules_json?: Json
          locked_rules_json?: Json
          offers_json?: Json
          prompt_notes_json?: Json
          seasonal_local_json?: Json
          social_direction_json?: Json
          source_material_json?: Json
          subject_themes_json?: Json
          text_on_design_json?: Json
          typography_json?: Json
          updated_at?: string
          visual_design_json?: Json
          website_direction_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "brand_twin_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_activity: {
        Row: {
          activity_type: string
          client_id: string
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          title: string
          visible_to_client: boolean
        }
        Insert: {
          activity_type?: string
          client_id: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          title: string
          visible_to_client?: boolean
        }
        Update: {
          activity_type?: string
          client_id?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          title?: string
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "client_activity_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_activity_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_onboarding: {
        Row: {
          client_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          client_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          client_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_onboarding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      client_strategy: {
        Row: {
          campaigns_json: Json
          client_id: string
          focus_json: Json
          goals_json: Json
          pillars_json: Json
          studio_notes_json: Json
          updated_at: string
          visible_sections: Json
        }
        Insert: {
          campaigns_json?: Json
          client_id: string
          focus_json?: Json
          goals_json?: Json
          pillars_json?: Json
          studio_notes_json?: Json
          updated_at?: string
          visible_sections?: Json
        }
        Update: {
          campaigns_json?: Json
          client_id?: string
          focus_json?: Json
          goals_json?: Json
          pillars_json?: Json
          studio_notes_json?: Json
          updated_at?: string
          visible_sections?: Json
        }
        Relationships: [
          {
            foreignKeyName: "client_strategy_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_success_extras: {
        Row: {
          client_id: string
          coming_up_next: Json
          focus_override: string | null
          recent_wins: Json
          recommended_next_step: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          coming_up_next?: Json
          focus_override?: string | null
          recent_wins?: Json
          recommended_next_step?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          coming_up_next?: Json
          focus_override?: string | null
          recent_wins?: Json
          recommended_next_step?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_success_extras_client_id_fkey"
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
          company: string | null
          created_at: string
          health_override: string | null
          health_override_at: string | null
          id: string
          name: string
          niche: string | null
          plan_id: string | null
          platforms: Json | null
          province: string | null
          recommended_item_id: string | null
          region: string | null
          status: string
          whats_new_visible_addons: Json
        }
        Insert: {
          assistants_can_approve?: boolean
          company?: string | null
          created_at?: string
          health_override?: string | null
          health_override_at?: string | null
          id?: string
          name: string
          niche?: string | null
          plan_id?: string | null
          platforms?: Json | null
          province?: string | null
          recommended_item_id?: string | null
          region?: string | null
          status?: string
          whats_new_visible_addons?: Json
        }
        Update: {
          assistants_can_approve?: boolean
          company?: string | null
          created_at?: string
          health_override?: string | null
          health_override_at?: string | null
          id?: string
          name?: string
          niche?: string | null
          plan_id?: string | null
          platforms?: Json | null
          province?: string | null
          recommended_item_id?: string | null
          region?: string | null
          status?: string
          whats_new_visible_addons?: Json
        }
        Relationships: [
          {
            foreignKeyName: "clients_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_recommended_item_id_fkey"
            columns: ["recommended_item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
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
          task_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id?: string | null
          request_id?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string | null
          request_id?: string | null
          task_id?: string | null
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
            referencedRelation: "requests_archive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
      content_metrics: {
        Row: {
          clicks: number
          client_id: string
          created_at: string
          engagement: number
          id: string
          impressions: number
          post_id: string
          reach: number
          reported_at: string
        }
        Insert: {
          clicks?: number
          client_id: string
          created_at?: string
          engagement?: number
          id?: string
          impressions?: number
          post_id: string
          reach?: number
          reported_at?: string
        }
        Update: {
          clicks?: number
          client_id?: string
          created_at?: string
          engagement?: number
          id?: string
          impressions?: number
          post_id?: string
          reach?: number
          reported_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_strategies: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by_user_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          created_by_user_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      generated_content: {
        Row: {
          client_id: string
          content_type: string
          created_at: string
          id: string
          output: string
          prompt: string
          saved_to_capture_id: string | null
          tone_override: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          content_type?: string
          created_at?: string
          id?: string
          output?: string
          prompt?: string
          saved_to_capture_id?: string | null
          tone_override?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          content_type?: string
          created_at?: string
          id?: string
          output?: string
          prompt?: string
          saved_to_capture_id?: string | null
          tone_override?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_content_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_content_saved_to_capture_id_fkey"
            columns: ["saved_to_capture_id"]
            isOneToOne: false
            referencedRelation: "brain_captures"
            referencedColumns: ["id"]
          },
        ]
      }
      google_integrations: {
        Row: {
          access_token: string
          created_at: string
          id: string
          refresh_token: string
          scopes: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          refresh_token: string
          scopes?: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          refresh_token?: string
          scopes?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_items: {
        Row: {
          billing_type: string | null
          category: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          price: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          billing_type?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_type?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meeting_notes: {
        Row: {
          client_id: string | null
          created_at: string
          extracted_data: Json | null
          extraction_status: string
          google_doc_id: string
          id: string
          meeting_date: string | null
          raw_content: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          extracted_data?: Json | null
          extraction_status?: string
          google_doc_id: string
          id?: string
          meeting_date?: string | null
          raw_content?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          extracted_data?: Json | null
          extraction_status?: string
          google_doc_id?: string
          id?: string
          meeting_date?: string | null
          raw_content?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          daily_digest: boolean
          email_enabled: boolean
          in_app_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_digest?: boolean
          email_enabled?: boolean
          in_app_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_digest?: boolean
          email_enabled?: boolean
          in_app_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
          notification_key: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          notification_key?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          notification_key?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      open_items: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
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
      platform_versions: {
        Row: {
          created_at: string
          id: string
          major_version: number
          minor_version: number
          notes: string | null
          published_at: string | null
          published_by_user_id: string | null
          title: string | null
          visible_to_clients: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          major_version?: number
          minor_version?: number
          notes?: string | null
          published_at?: string | null
          published_by_user_id?: string | null
          title?: string | null
          visible_to_clients?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          major_version?: number
          minor_version?: number
          notes?: string | null
          published_at?: string | null
          published_by_user_id?: string | null
          title?: string | null
          visible_to_clients?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "platform_versions_published_by_user_id_fkey"
            columns: ["published_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_images: {
        Row: {
          alt_text: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          platform: string | null
          position: number
          post_id: string
          storage_path: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          platform?: string | null
          position?: number
          post_id: string
          storage_path: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          platform?: string | null
          position?: number
          post_id?: string
          storage_path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_images_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
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
          agent_confidence: number | null
          agent_status: string | null
          ai_suggested_assignee: string | null
          ai_suggested_client: string | null
          ai_suggested_content_type: string | null
          ai_suggested_next_action: string | null
          ai_suggested_priority: string | null
          ai_suggested_project: string | null
          ai_suggested_subproject: string | null
          ai_summary: string | null
          assigned_to_user_id: string | null
          audience: string | null
          campaign_link: string | null
          caption: string | null
          client_id: string
          content_type: string | null
          created_at: string
          created_by_user_id: string | null
          creative_url: string | null
          due_at: string | null
          email_body: string | null
          hashtags: string | null
          id: string
          internal_notes: string | null
          platform: string | null
          platform_content: Json
          preferred_publish_window: string | null
          preview_text: string | null
          priority: string | null
          raw_attachment_url: string | null
          raw_input_text: string | null
          request_id: string | null
          request_notes: string | null
          reviewer_user_id: string | null
          posted_at: string | null
          revision_count: number
          scheduled_at: string | null
          send_date: string | null
          source: string
          source_type: string | null
          status_column: Database["public"]["Enums"]["post_status"]
          strategy_brief: Json | null
          subject_line: string | null
          tags: Json
          title: string
          voice_transcript: string | null
        }
        Insert: {
          agent_confidence?: number | null
          agent_status?: string | null
          ai_suggested_assignee?: string | null
          ai_suggested_client?: string | null
          ai_suggested_content_type?: string | null
          ai_suggested_next_action?: string | null
          ai_suggested_priority?: string | null
          ai_suggested_project?: string | null
          ai_suggested_subproject?: string | null
          ai_summary?: string | null
          assigned_to_user_id?: string | null
          audience?: string | null
          campaign_link?: string | null
          caption?: string | null
          client_id: string
          content_type?: string | null
          created_at?: string
          created_by_user_id?: string | null
          creative_url?: string | null
          due_at?: string | null
          email_body?: string | null
          hashtags?: string | null
          id?: string
          internal_notes?: string | null
          platform?: string | null
          platform_content?: Json
          preferred_publish_window?: string | null
          preview_text?: string | null
          priority?: string | null
          raw_attachment_url?: string | null
          raw_input_text?: string | null
          request_id?: string | null
          request_notes?: string | null
          reviewer_user_id?: string | null
          posted_at?: string | null
          revision_count?: number
          scheduled_at?: string | null
          send_date?: string | null
          source?: string
          source_type?: string | null
          status_column?: Database["public"]["Enums"]["post_status"]
          strategy_brief?: Json | null
          subject_line?: string | null
          tags?: Json
          title: string
          voice_transcript?: string | null
        }
        Update: {
          agent_confidence?: number | null
          agent_status?: string | null
          ai_suggested_assignee?: string | null
          ai_suggested_client?: string | null
          ai_suggested_content_type?: string | null
          ai_suggested_next_action?: string | null
          ai_suggested_priority?: string | null
          ai_suggested_project?: string | null
          ai_suggested_subproject?: string | null
          ai_summary?: string | null
          assigned_to_user_id?: string | null
          audience?: string | null
          campaign_link?: string | null
          caption?: string | null
          client_id?: string
          content_type?: string | null
          created_at?: string
          created_by_user_id?: string | null
          creative_url?: string | null
          due_at?: string | null
          email_body?: string | null
          hashtags?: string | null
          id?: string
          internal_notes?: string | null
          platform?: string | null
          platform_content?: Json
          preferred_publish_window?: string | null
          preview_text?: string | null
          priority?: string | null
          raw_attachment_url?: string | null
          raw_input_text?: string | null
          request_id?: string | null
          request_notes?: string | null
          reviewer_user_id?: string | null
          posted_at?: string | null
          revision_count?: number
          scheduled_at?: string | null
          send_date?: string | null
          source?: string
          source_type?: string | null
          status_column?: Database["public"]["Enums"]["post_status"]
          strategy_brief?: Json | null
          subject_line?: string | null
          tags?: Json
          title?: string
          voice_transcript?: string | null
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
            referencedRelation: "requests_archive"
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
      requests_archive: {
        Row: {
          agent_confidence: number | null
          agent_status: string | null
          ai_suggested_assignee: string | null
          ai_suggested_client: string | null
          ai_suggested_content_type: string | null
          ai_suggested_next_action: string | null
          ai_suggested_priority: string | null
          ai_suggested_project: string | null
          ai_suggested_subproject: string | null
          ai_summary: string | null
          assigned_to_user_id: string | null
          attachments_url: string | null
          client_id: string
          created_at: string
          created_by_user_id: string
          id: string
          notes: string | null
          preferred_publish_window: string | null
          priority: string | null
          raw_attachment_url: string | null
          raw_input_text: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["request_status"]
          strategy_brief: Json | null
          submitted_on_behalf_by: string | null
          task_id: string | null
          topic: string
          type: Database["public"]["Enums"]["request_type"]
          voice_transcript: string | null
        }
        Insert: {
          agent_confidence?: number | null
          agent_status?: string | null
          ai_suggested_assignee?: string | null
          ai_suggested_client?: string | null
          ai_suggested_content_type?: string | null
          ai_suggested_next_action?: string | null
          ai_suggested_priority?: string | null
          ai_suggested_project?: string | null
          ai_suggested_subproject?: string | null
          ai_summary?: string | null
          assigned_to_user_id?: string | null
          attachments_url?: string | null
          client_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          notes?: string | null
          preferred_publish_window?: string | null
          priority?: string | null
          raw_attachment_url?: string | null
          raw_input_text?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          strategy_brief?: Json | null
          submitted_on_behalf_by?: string | null
          task_id?: string | null
          topic: string
          type: Database["public"]["Enums"]["request_type"]
          voice_transcript?: string | null
        }
        Update: {
          agent_confidence?: number | null
          agent_status?: string | null
          ai_suggested_assignee?: string | null
          ai_suggested_client?: string | null
          ai_suggested_content_type?: string | null
          ai_suggested_next_action?: string | null
          ai_suggested_priority?: string | null
          ai_suggested_project?: string | null
          ai_suggested_subproject?: string | null
          ai_summary?: string | null
          assigned_to_user_id?: string | null
          attachments_url?: string | null
          client_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          notes?: string | null
          preferred_publish_window?: string | null
          priority?: string | null
          raw_attachment_url?: string | null
          raw_input_text?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          strategy_brief?: Json | null
          submitted_on_behalf_by?: string | null
          task_id?: string | null
          topic?: string
          type?: Database["public"]["Enums"]["request_type"]
          voice_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          uploaded_by_user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          uploaded_by_user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          completed: boolean
          created_at: string
          created_by_user_id: string
          id: string
          sort_order: number
          task_id: string
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          created_by_user_id: string
          id?: string
          sort_order?: number
          task_id: string
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          created_by_user_id?: string
          id?: string
          sort_order?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          agent_confidence: number | null
          agent_status: string | null
          ai_suggested_assignee: string | null
          ai_suggested_client: string | null
          ai_suggested_content_type: string | null
          ai_suggested_item_type: string | null
          ai_suggested_next_action: string | null
          ai_suggested_priority: string | null
          ai_suggested_project: string | null
          ai_suggested_subproject: string | null
          ai_summary: string | null
          assigned_to_team: boolean
          assigned_to_user_id: string | null
          client_id: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          due_at: string | null
          id: string
          parent_item_id: string | null
          priority: string
          project_id: string | null
          raw_attachment_url: string | null
          raw_input_text: string | null
          request_id: string | null
          source_type: string | null
          status: string
          strategy_brief: Json | null
          title: string
          updated_at: string
          voice_transcript: string | null
        }
        Insert: {
          agent_confidence?: number | null
          agent_status?: string | null
          ai_suggested_assignee?: string | null
          ai_suggested_client?: string | null
          ai_suggested_content_type?: string | null
          ai_suggested_item_type?: string | null
          ai_suggested_next_action?: string | null
          ai_suggested_priority?: string | null
          ai_suggested_project?: string | null
          ai_suggested_subproject?: string | null
          ai_summary?: string | null
          assigned_to_team?: boolean
          assigned_to_user_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          due_at?: string | null
          id?: string
          parent_item_id?: string | null
          priority?: string
          project_id?: string | null
          raw_attachment_url?: string | null
          raw_input_text?: string | null
          request_id?: string | null
          source_type?: string | null
          status?: string
          strategy_brief?: Json | null
          title: string
          updated_at?: string
          voice_transcript?: string | null
        }
        Update: {
          agent_confidence?: number | null
          agent_status?: string | null
          ai_suggested_assignee?: string | null
          ai_suggested_client?: string | null
          ai_suggested_content_type?: string | null
          ai_suggested_item_type?: string | null
          ai_suggested_next_action?: string | null
          ai_suggested_priority?: string | null
          ai_suggested_project?: string | null
          ai_suggested_subproject?: string | null
          ai_summary?: string | null
          assigned_to_team?: boolean
          assigned_to_user_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          due_at?: string | null
          id?: string
          parent_item_id?: string | null
          priority?: string
          project_id?: string | null
          raw_attachment_url?: string | null
          raw_input_text?: string | null
          request_id?: string | null
          source_type?: string | null
          status?: string
          strategy_brief?: Json | null
          title?: string
          updated_at?: string
          voice_transcript?: string | null
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
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          {
            foreignKeyName: "tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests_archive"
            referencedColumns: ["id"]
          },
        ]
      }
      team_growth_tracks: {
        Row: {
          id: string
          sort_order: number
          track_name: string
          updated_at: string
          user_name: string
        }
        Insert: {
          id?: string
          sort_order?: number
          track_name: string
          updated_at?: string
          user_name: string
        }
        Update: {
          id?: string
          sort_order?: number
          track_name?: string
          updated_at?: string
          user_name?: string
        }
        Relationships: []
      }
      team_roles_config: {
        Row: {
          id: string
          mission: string | null
          responsibilities: Json | null
          sort_order: number
          title: string | null
          updated_at: string
          user_name: string
        }
        Insert: {
          id?: string
          mission?: string | null
          responsibilities?: Json | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          user_name: string
        }
        Update: {
          id?: string
          mission?: string | null
          responsibilities?: Json | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          user_name?: string
        }
        Relationships: []
      }
      team_settings: {
        Row: {
          bonus_pool: number
          id: string
          monthly_revenue: number
          next_milestone: number
          updated_at: string
        }
        Insert: {
          bonus_pool?: number
          id?: string
          monthly_revenue?: number
          next_milestone?: number
          updated_at?: string
        }
        Update: {
          bonus_pool?: number
          id?: string
          monthly_revenue?: number
          next_milestone?: number
          updated_at?: string
        }
        Relationships: []
      }
      team_wins: {
        Row: {
          agent: string | null
          category: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          title: string
        }
        Insert: {
          agent?: string | null
          category?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          agent?: string | null
          category?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      think_tank_items: {
        Row: {
          agent_confidence: number | null
          agent_status: string | null
          ai_suggested_assignee: string | null
          ai_suggested_client: string | null
          ai_suggested_content_type: string | null
          ai_suggested_next_action: string | null
          ai_suggested_priority: string | null
          ai_suggested_project: string | null
          ai_suggested_subproject: string | null
          ai_summary: string | null
          body: string | null
          client_id: string | null
          created_at: string
          created_by_user_id: string
          id: string
          project_id: string | null
          raw_attachment_url: string | null
          raw_input_text: string | null
          source_type: string | null
          status: string
          strategy_brief: Json | null
          title: string
          type: string
          updated_at: string
          voice_transcript: string | null
        }
        Insert: {
          agent_confidence?: number | null
          agent_status?: string | null
          ai_suggested_assignee?: string | null
          ai_suggested_client?: string | null
          ai_suggested_content_type?: string | null
          ai_suggested_next_action?: string | null
          ai_suggested_priority?: string | null
          ai_suggested_project?: string | null
          ai_suggested_subproject?: string | null
          ai_summary?: string | null
          body?: string | null
          client_id?: string | null
          created_at?: string
          created_by_user_id: string
          id?: string
          project_id?: string | null
          raw_attachment_url?: string | null
          raw_input_text?: string | null
          source_type?: string | null
          status?: string
          strategy_brief?: Json | null
          title: string
          type?: string
          updated_at?: string
          voice_transcript?: string | null
        }
        Update: {
          agent_confidence?: number | null
          agent_status?: string | null
          ai_suggested_assignee?: string | null
          ai_suggested_client?: string | null
          ai_suggested_content_type?: string | null
          ai_suggested_next_action?: string | null
          ai_suggested_priority?: string | null
          ai_suggested_project?: string | null
          ai_suggested_subproject?: string | null
          ai_summary?: string | null
          body?: string | null
          client_id?: string | null
          created_at?: string
          created_by_user_id?: string
          id?: string
          project_id?: string | null
          raw_attachment_url?: string | null
          raw_input_text?: string | null
          source_type?: string | null
          status?: string
          strategy_brief?: Json | null
          title?: string
          type?: string
          updated_at?: string
          voice_transcript?: string | null
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
      universal_inbox: {
        Row: {
          agent_confidence: number | null
          attachment_url: string | null
          converted_to_id: string | null
          converted_to_type: string | null
          created_at: string
          created_by_user_id: string
          id: string
          raw_input_text: string | null
          source_type: string | null
          status: string
          suggested_assignee: string | null
          suggested_client: string | null
          suggested_content_type: string | null
          suggested_item_type: string | null
          suggested_priority: string | null
          suggested_project: string | null
          suggested_subproject: string | null
          title: string | null
          updated_at: string
          voice_transcript: string | null
        }
        Insert: {
          agent_confidence?: number | null
          attachment_url?: string | null
          converted_to_id?: string | null
          converted_to_type?: string | null
          created_at?: string
          created_by_user_id: string
          id?: string
          raw_input_text?: string | null
          source_type?: string | null
          status?: string
          suggested_assignee?: string | null
          suggested_client?: string | null
          suggested_content_type?: string | null
          suggested_item_type?: string | null
          suggested_priority?: string | null
          suggested_project?: string | null
          suggested_subproject?: string | null
          title?: string | null
          updated_at?: string
          voice_transcript?: string | null
        }
        Update: {
          agent_confidence?: number | null
          attachment_url?: string | null
          converted_to_id?: string | null
          converted_to_type?: string | null
          created_at?: string
          created_by_user_id?: string
          id?: string
          raw_input_text?: string | null
          source_type?: string | null
          status?: string
          suggested_assignee?: string | null
          suggested_client?: string | null
          suggested_content_type?: string | null
          suggested_item_type?: string | null
          suggested_priority?: string | null
          suggested_project?: string | null
          suggested_subproject?: string | null
          title?: string | null
          updated_at?: string
          voice_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "universal_inbox_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      website_briefs: {
        Row: {
          client_id: string
          content_json: Json
          design_json: Json
          functionality_json: Json
          inspiration_json: Json
          layout_json: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          content_json?: Json
          design_json?: Json
          functionality_json?: Json
          inspiration_json?: Json
          layout_json?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          content_json?: Json
          design_json?: Json
          functionality_json?: Json
          inspiration_json?: Json
          layout_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_briefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stage_assignments: {
        Row: {
          assigned_user_id: string | null
          stage: string
          updated_at: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          stage: string
          updated_at?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          stage?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stage_assignments_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_docs: {
        Row: {
          category: string
          content: string
          id: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string
          content: string
          id?: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          content?: string
          id?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acting_on_behalf_of_client: {
        Args: { _client_id: string }
        Returns: boolean
      }
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
      notify_batch_client_response: {
        Args: { _action: string; _batch_name: string; _client_id: string }
        Returns: undefined
      }
      notify_batch_sent_to_client: {
        Args: { _batch_name: string; _client_id: string; _item_count: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "client_admin"
        | "client_assistant"
        | "ss_admin"
        | "ss_producer"
        | "ss_ops"
        | "ss_team"
        | "ss_manager"
      approval_type: "approve" | "approve_with_notes" | "request_changes"
      post_status:
        | "idea"
        | "in_progress"
        | "writing"
        | "design"
        | "internal_review"
        | "corey_review"
        | "client_approval"
        | "request_changes"
        | "approved"
        | "scheduled"
        | "published"
        | "ready_to_send"
        | "sent"
        | "complete"
        | "ready_to_schedule"
        | "ai_draft"
        | "ready_for_client_batch"
      profile_update_status:
        | "pending"
        | "approved"
        | "changes_requested"
        | "rejected"
      request_status: "open" | "in_progress" | "completed" | "cancelled"
      request_type:
        | "social_post"
        | "email_campaign"
        | "design"
        | "video"
        | "automation"
        | "strategy"
        | "general"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "client_admin",
        "client_assistant",
        "ss_admin",
        "ss_producer",
        "ss_ops",
        "ss_team",
        "ss_manager",
      ],
      approval_type: ["approve", "approve_with_notes", "request_changes"],
      post_status: [
        "idea",
        "in_progress",
        "writing",
        "design",
        "internal_review",
        "corey_review",
        "client_approval",
        "request_changes",
        "approved",
        "scheduled",
        "published",
        "ready_to_send",
        "sent",
        "complete",
        "ready_to_schedule",
        "ai_draft",
        "ready_for_client_batch",
      ],
      profile_update_status: [
        "pending",
        "approved",
        "changes_requested",
        "rejected",
      ],
      request_status: ["open", "in_progress", "completed", "cancelled"],
      request_type: [
        "social_post",
        "email_campaign",
        "design",
        "video",
        "automation",
        "strategy",
        "general",
      ],
    },
  },
} as const
