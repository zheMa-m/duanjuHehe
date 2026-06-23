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
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          category: string
          created_at: string | null
          id: number
          ip: string | null
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          category: string
          created_at?: string | null
          id?: number
          ip?: string | null
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          category?: string
          created_at?: string | null
          id?: number
          ip?: string | null
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      ad_events: {
        Row: {
          ad_slot_id: string | null
          campaign_subdomain: string | null
          created_at: string | null
          event_type: string
          id: string
          ip: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          ad_slot_id?: string | null
          campaign_subdomain?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          ip?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          ad_slot_id?: string | null
          campaign_subdomain?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          ip?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_slot_id_fkey"
            columns: ["ad_slot_id"]
            isOneToOne: false
            referencedRelation: "ad_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_slots: {
        Row: {
          ad_config: Json
          ad_provider: string
          campaign_id: string | null
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          position: string
          sort_order: number
        }
        Insert: {
          ad_config?: Json
          ad_provider?: string
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          position: string
          sort_order?: number
        }
        Update: {
          ad_config?: Json
          ad_provider?: string
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_slots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          allowed_endpoints: string[] | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json
          rate_limit_override: number | null
          require_signature: boolean
          signing_secret: string
          updated_at: string | null
        }
        Insert: {
          allowed_endpoints?: string[] | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json
          rate_limit_override?: number | null
          require_signature?: boolean
          signing_secret: string
          updated_at?: string | null
        }
        Update: {
          allowed_endpoints?: string[] | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json
          rate_limit_override?: number | null
          require_signature?: boolean
          signing_secret?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_security_settings: {
        Row: {
          country_policy: Json
          endpoint_overrides: Json
          id: boolean
          ip_policy: Json
          rate_limit: Json
          signature_required: boolean
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          country_policy?: Json
          endpoint_overrides?: Json
          id?: boolean
          ip_policy?: Json
          rate_limit?: Json
          signature_required?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          country_policy?: Json
          endpoint_overrides?: Json
          id?: boolean
          ip_policy?: Json
          rate_limit?: Json
          signature_required?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      campaign_registrations: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          email: string
          id: string
          phone: string
          subdomain: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          phone: string
          subdomain: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          phone?: string
          subdomain?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_registrations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          badge: string
          color_from: string
          color_to: string
          cover_image: string | null
          created_at: string | null
          cta_text: string
          cta_url: string | null
          description: string | null
          features: Json
          ga_measurement_id: string | null
          id: string
          is_active: boolean
          meta_pixel_id: string | null
          sort_order: number
          subdomain: string
          subtitle: string
          tiktok_pixel_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          badge: string
          color_from?: string
          color_to?: string
          cover_image?: string | null
          created_at?: string | null
          cta_text?: string
          cta_url?: string | null
          description?: string | null
          features?: Json
          ga_measurement_id?: string | null
          id?: string
          is_active?: boolean
          meta_pixel_id?: string | null
          sort_order?: number
          subdomain: string
          subtitle: string
          tiktok_pixel_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          badge?: string
          color_from?: string
          color_to?: string
          cover_image?: string | null
          created_at?: string | null
          cta_text?: string
          cta_url?: string | null
          description?: string | null
          features?: Json
          ga_measurement_id?: string | null
          id?: string
          is_active?: boolean
          meta_pixel_id?: string | null
          sort_order?: number
          subdomain?: string
          subtitle?: string
          tiktok_pixel_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          admin_reply: string | null
          campaign_subdomain: string | null
          comment: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_approved: boolean
          rating: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          admin_reply?: string | null
          campaign_subdomain?: string | null
          comment?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_approved?: boolean
          rating?: number | null
          type?: string
          user_id?: string | null
        }
        Update: {
          admin_reply?: string | null
          campaign_subdomain?: string | null
          comment?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_approved?: boolean
          rating?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          order_no: string
          payment_intent_id: string | null
          payment_provider: string
          product_id: string | null
          product_name: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          order_no: string
          payment_intent_id?: string | null
          payment_provider?: string
          product_id?: string | null
          product_name: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          order_no?: string
          payment_intent_id?: string | null
          payment_provider?: string
          product_id?: string | null
          product_name?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_configs: {
        Row: {
          extra_meta: Json
          is_enabled: boolean
          provider: string
          public_keys: Json
          updated_at: string | null
        }
        Insert: {
          extra_meta?: Json
          is_enabled?: boolean
          provider: string
          public_keys?: Json
          updated_at?: string | null
        }
        Update: {
          extra_meta?: Json
          is_enabled?: boolean
          provider?: string
          public_keys?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          payment_meta: Json
          price: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          payment_meta?: Json
          price: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payment_meta?: Json
          price?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_provider: string
          avatar_url: string | null
          created_at: string | null
          device_id: string | null
          display_name: string | null
          email_verified: boolean
          id: string
          is_anonymous: boolean
          phone: string | null
          plan_status: string
          provider_id: string | null
          role: string
          stripe_customer_id: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          auth_provider?: string
          avatar_url?: string | null
          created_at?: string | null
          device_id?: string | null
          display_name?: string | null
          email_verified?: boolean
          id: string
          is_anonymous?: boolean
          phone?: string | null
          plan_status?: string
          provider_id?: string | null
          role?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          auth_provider?: string
          avatar_url?: string | null
          created_at?: string | null
          device_id?: string | null
          display_name?: string | null
          email_verified?: boolean
          id?: string
          is_anonymous?: boolean
          phone?: string | null
          plan_status?: string
          provider_id?: string | null
          role?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      storage_trash: {
        Row: {
          created_at: string
          deleted_by: string | null
          expires_at: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          original_bucket: string
          original_path: string
          trash_path: string
        }
        Insert: {
          created_at?: string
          deleted_by?: string | null
          expires_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_bucket: string
          original_path: string
          trash_path: string
        }
        Update: {
          created_at?: string
          deleted_by?: string | null
          expires_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          original_bucket?: string
          original_path?: string
          trash_path?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string | null
          current_period_end: string
          current_period_start: string
          gateway_subscription_id: string
          id: string
          price_id: string
          quantity: number
          status: string
          subscription_provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          gateway_subscription_id: string
          id?: string
          price_id: string
          quantity?: number
          status: string
          subscription_provider?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          gateway_subscription_id?: string
          id?: string
          price_id?: string
          quantity?: number
          status?: string
          subscription_provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_configs: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean
          created_at: string | null
          id: string
          tenant_id: string
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string | null
          id?: string
          tenant_id: string
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string | null
          id?: string
          tenant_id?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { uid: string }; Returns: boolean }
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
