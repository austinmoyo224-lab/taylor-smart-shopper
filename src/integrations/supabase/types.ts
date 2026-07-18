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
      audit_log: {
        Row: {
          action: string
          changed_data: Json | null
          created_at: string
          id: number
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          changed_data?: Json | null
          created_at?: string
          id?: number
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_data?: Json | null
          created_at?: string
          id?: number
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_global: boolean
          logo_url: string | null
          name: string
          organisation_id: string | null
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          logo_url?: string | null
          name: string
          organisation_id?: string | null
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          logo_url?: string | null
          name?: string
          organisation_id?: string | null
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience: Json
          created_at: string
          deleted_at: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          organisation_id: string
          schedule: Json
          scope: Database["public"]["Enums"]["campaign_scope"]
          starts_at: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          audience?: Json
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          organisation_id: string
          schedule?: Json
          scope?: Database["public"]["Enums"]["campaign_scope"]
          starts_at?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          audience?: Json
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          organisation_id?: string
          schedule?: Json
          scope?: Database["public"]["Enums"]["campaign_scope"]
          starts_at?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogues: {
        Row: {
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_published: boolean
          metadata: Json
          organisation_id: string
          pdf_url: string | null
          starts_at: string
          store_id: string | null
          title: string
          type: Database["public"]["Enums"]["catalogue_type"]
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          metadata?: Json
          organisation_id: string
          pdf_url?: string | null
          starts_at?: string
          store_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["catalogue_type"]
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          metadata?: Json
          organisation_id?: string
          pdf_url?: string | null
          starts_at?: string
          store_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["catalogue_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogues_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogues_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          last_message_at: string | null
          metadata: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          default_language: string
          default_timezone: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code: string
          default_language: string
          default_timezone: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          default_language?: string
          default_timezone?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          metadata: Json
          redeemed_at: string
          store_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          metadata?: Json
          redeemed_at?: string
          store_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          metadata?: Json
          redeemed_at?: string
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          deleted_at: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          ends_at: string | null
          id: string
          metadata: Json
          organisation_id: string
          promotion_id: string | null
          qr_payload: string
          starts_at: string
          status: Database["public"]["Enums"]["coupon_status"]
          store_id: string | null
          title: string
          updated_at: string
          usage_limit_per_user: number | null
          usage_limit_total: number | null
        }
        Insert: {
          code: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          organisation_id: string
          promotion_id?: string | null
          qr_payload?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["coupon_status"]
          store_id?: string | null
          title: string
          updated_at?: string
          usage_limit_per_user?: number | null
          usage_limit_total?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          organisation_id?: string
          promotion_id?: string | null
          qr_payload?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["coupon_status"]
          store_id?: string | null
          title?: string
          updated_at?: string
          usage_limit_per_user?: number | null
          usage_limit_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "coupons_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimal_digits: number
          name: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          decimal_digits?: number
          name: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          decimal_digits?: number
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      household_invites: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          household_id: string
          id?: string
          invited_by: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      languages: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          name: string
          native_name: string
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          name: string
          native_name: string
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          name?: string
          native_name?: string
        }
        Relationships: []
      }
      life_moments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          moment_date: string | null
          recurs_annually: boolean
          title: string
          type: Database["public"]["Enums"]["life_moment_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          moment_date?: string | null
          recurs_annually?: boolean
          title: string
          type: Database["public"]["Enums"]["life_moment_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          moment_date?: string | null
          recurs_annually?: boolean
          title?: string
          type?: Database["public"]["Enums"]["life_moment_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_accounts: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          organisation_id: string
          points: number
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          organisation_id: string
          points?: number
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          organisation_id?: string
          points?: number
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          balance_after: number
          created_at: string
          id: string
          metadata: Json
          organisation_id: string
          points: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          id?: string
          metadata?: Json
          organisation_id: string
          points: number
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          id?: string
          metadata?: Json
          organisation_id?: string
          points?: number
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai_model: string | null
          ai_run_id: string | null
          attachments: Json
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          parts: Json
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_run_id?: string | null
          attachments?: Json
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          parts?: Json
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_run_id?: string | null
          attachments?: Json
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          parts?: Json
          role?: Database["public"]["Enums"]["message_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          categories: Json
          email: boolean
          in_app: boolean
          push: boolean
          quiet_hours: Json
          sms: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: Json
          email?: boolean
          in_app?: boolean
          push?: boolean
          quiet_hours?: Json
          sms?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: Json
          email?: boolean
          in_app?: boolean
          push?: boolean
          quiet_hours?: Json
          sms?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          delivered_at: string | null
          id: string
          payload: Json
          read_at: string | null
          related_coupon_id: string | null
          related_promotion_id: string | null
          related_store_id: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          delivered_at?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          related_coupon_id?: string | null
          related_promotion_id?: string | null
          related_store_id?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          delivered_at?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          related_coupon_id?: string | null
          related_promotion_id?: string | null
          related_store_id?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_coupon_id_fkey"
            columns: ["related_coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_promotion_id_fkey"
            columns: ["related_promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_store_id_fkey"
            columns: ["related_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          brand_colors: Json
          contact_email: string | null
          contact_phone: string | null
          country_code: string
          created_at: string
          default_currency: string
          default_language: string
          deleted_at: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          metadata: Json
          name: string
          slug: string
          type: Database["public"]["Enums"]["organisation_type"]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          brand_colors?: Json
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          default_currency?: string
          default_language?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          metadata?: Json
          name: string
          slug: string
          type?: Database["public"]["Enums"]["organisation_type"]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          brand_colors?: Json
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          default_currency?: string
          default_language?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          metadata?: Json
          name?: string
          slug?: string
          type?: Database["public"]["Enums"]["organisation_type"]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisations_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "organisations_default_currency_fkey"
            columns: ["default_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "organisations_default_language_fkey"
            columns: ["default_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      pantry_items: {
        Row: {
          created_at: string
          expires_at: string | null
          household_id: string | null
          id: string
          metadata: Json
          name: string
          product_id: string | null
          purchased_at: string | null
          quantity: number | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          household_id?: string | null
          id?: string
          metadata?: Json
          name: string
          product_id?: string | null
          purchased_at?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          household_id?: string | null
          id?: string
          metadata?: Json
          name?: string
          product_id?: string | null
          purchased_at?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pantry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string
          currency_code: string | null
          external_id: string | null
          id: string
          metadata: Json
          organisation_id: string | null
          provider: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency_code?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json
          organisation_id?: string | null
          provider?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency_code?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json
          organisation_id?: string | null
          provider?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_syncs: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_sync_at: string | null
          organisation_id: string
          provider: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_sync_at?: string | null
          organisation_id: string
          provider: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_sync_at?: string | null
          organisation_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_syncs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_global: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_inventory: {
        Row: {
          id: string
          is_in_stock: boolean
          product_id: string
          quantity: number
          store_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          is_in_stock?: boolean
          product_id: string
          quantity?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          is_in_stock?: boolean
          product_id?: string
          quantity?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          created_at: string
          currency_code: string
          effective_from: string
          effective_to: string | null
          id: string
          price: number
          product_id: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          currency_code?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          price: number
          product_id: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          price?: number
          product_id?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          base_price: number | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          currency_code: string
          deleted_at: string | null
          description: string | null
          expiry_days_default: number | null
          id: string
          images: Json
          is_available: boolean
          metadata: Json
          name: string
          nutrition: Json
          organisation_id: string
          packaging: Json
          sku: string | null
          slug: string
          tags: string[]
          unit: string | null
          unit_amount: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          base_price?: number | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          expiry_days_default?: number | null
          id?: string
          images?: Json
          is_available?: boolean
          metadata?: Json
          name: string
          nutrition?: Json
          organisation_id: string
          packaging?: Json
          sku?: string | null
          slug: string
          tags?: string[]
          unit?: string | null
          unit_amount?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          base_price?: number | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          expiry_days_default?: number | null
          id?: string
          images?: Json
          is_available?: boolean
          metadata?: Json
          name?: string
          nutrition?: Json
          organisation_id?: string
          packaging?: Json
          sku?: string | null
          slug?: string
          tags?: string[]
          unit?: string | null
          unit_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          city: string | null
          communication_style: string | null
          country_code: string
          created_at: string
          currency_code: string
          deleted_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          locale: string
          onboarding_completed: boolean
          phone: string | null
          preferred_greeting: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          city?: string | null
          communication_style?: string | null
          country_code?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          locale?: string
          onboarding_completed?: boolean
          phone?: string | null
          preferred_greeting?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          city?: string | null
          communication_style?: string | null
          country_code?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          locale?: string
          onboarding_completed?: boolean
          phone?: string | null
          preferred_greeting?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      promotion_products: {
        Row: {
          product_id: string
          promotion_id: string
        }
        Insert: {
          product_id: string
          promotion_id: string
        }
        Update: {
          product_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          audience: Json
          created_at: string
          currency_code: string
          deleted_at: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          ends_at: string | null
          hero_image_url: string | null
          id: string
          is_published: boolean
          is_sponsored: boolean
          metadata: Json
          organisation_id: string
          original_price: number | null
          rules: Json
          sale_price: number | null
          sponsor_brand_id: string | null
          starts_at: string
          store_id: string | null
          title: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at: string
        }
        Insert: {
          audience?: Json
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          is_sponsored?: boolean
          metadata?: Json
          organisation_id: string
          original_price?: number | null
          rules?: Json
          sale_price?: number | null
          sponsor_brand_id?: string | null
          starts_at?: string
          store_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Update: {
          audience?: Json
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          is_sponsored?: boolean
          metadata?: Json
          organisation_id?: string
          original_price?: number | null
          rules?: Json
          sale_price?: number | null
          sponsor_brand_id?: string | null
          starts_at?: string
          store_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "promotions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_sponsor_brand_id_fkey"
            columns: ["sponsor_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          conversion_count: number
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          metadata: Json
          organisation_id: string
          scan_count: number
          slug: string
          target_id: string
          type: Database["public"]["Enums"]["qr_code_type"]
          updated_at: string
        }
        Insert: {
          conversion_count?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          metadata?: Json
          organisation_id: string
          scan_count?: number
          slug?: string
          target_id: string
          type: Database["public"]["Enums"]["qr_code_type"]
          updated_at?: string
        }
        Update: {
          conversion_count?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          metadata?: Json
          organisation_id?: string
          scan_count?: number
          slug?: string
          target_id?: string
          type?: Database["public"]["Enums"]["qr_code_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          is_sponsored: boolean
          name: string
          notes: string | null
          product_id: string | null
          quantity: number | null
          recipe_id: string
          sort_order: number
          unit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_sponsored?: boolean
          name: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          recipe_id: string
          sort_order?: number
          unit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_sponsored?: boolean
          name?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          recipe_id?: string
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cooking_time_minutes: number | null
          created_at: string
          cuisine_tags: string[]
          deleted_at: string | null
          description: string | null
          difficulty: string | null
          hero_image_url: string | null
          id: string
          instructions: Json
          is_published: boolean
          is_sponsored: boolean
          nutrition: Json
          organisation_id: string | null
          servings: number | null
          slug: string
          source: string | null
          sponsor_brand_id: string | null
          title: string
          updated_at: string
          user_id: string | null
          weather_tags: string[]
        }
        Insert: {
          cooking_time_minutes?: number | null
          created_at?: string
          cuisine_tags?: string[]
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          hero_image_url?: string | null
          id?: string
          instructions?: Json
          is_published?: boolean
          is_sponsored?: boolean
          nutrition?: Json
          organisation_id?: string | null
          servings?: number | null
          slug: string
          source?: string | null
          sponsor_brand_id?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
          weather_tags?: string[]
        }
        Update: {
          cooking_time_minutes?: number | null
          created_at?: string
          cuisine_tags?: string[]
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          hero_image_url?: string | null
          id?: string
          instructions?: Json
          is_published?: boolean
          is_sponsored?: boolean
          nutrition?: Json
          organisation_id?: string | null
          servings?: number | null
          slug?: string
          source?: string | null
          sponsor_brand_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
          weather_tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "recipes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_sponsor_brand_id_fkey"
            columns: ["sponsor_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          code: string
          created_at: string
          fulfilled_at: string | null
          id: string
          organisation_id: string
          points_spent: number
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          organisation_id: string
          points_spent: number
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          organisation_id?: string
          points_spent?: number
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          organisation_id: string
          points_cost: number
          stock: number | null
          terms: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          organisation_id: string
          points_cost: number
          stock?: number | null
          terms?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          organisation_id?: string
          points_cost?: number
          stock?: number | null
          terms?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          created_at: string
          estimated_price: number | null
          id: string
          is_checked: boolean
          list_id: string
          name: string
          notes: string | null
          product_id: string | null
          quantity: number | null
          sort_order: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_price?: number | null
          id?: string
          is_checked?: boolean
          list_id: string
          name: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_price?: number | null
          id?: string
          is_checked?: boolean
          list_id?: string
          name?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string
          currency_code: string
          estimated_savings: number | null
          estimated_total: number | null
          household_id: string | null
          id: string
          is_ai_generated: boolean
          metadata: Json
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          estimated_savings?: number | null
          estimated_total?: number | null
          household_id?: string | null
          id?: string
          is_ai_generated?: boolean
          metadata?: Json
          name?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          estimated_savings?: number | null
          estimated_total?: number | null
          household_id?: string | null
          id?: string
          is_ai_generated?: boolean
          metadata?: Json
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "shopping_lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      store_departments: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_departments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_onboarding_requests: {
        Row: {
          admin_notes: string | null
          brand_color: string | null
          business_email: string | null
          business_name: string
          business_type: string
          contact_phone: string | null
          created_at: string
          id: string
          logo_url: string | null
          organisation_id: string | null
          proposed_slug: string
          reviewed_at: string | null
          reviewed_by: string | null
          short_description: string | null
          status: string
          store_address: string | null
          store_city: string | null
          store_id: string | null
          store_name: string
          store_province: string | null
          trading_hours: Json
          trading_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          brand_color?: string | null
          business_email?: string | null
          business_name: string
          business_type?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          organisation_id?: string | null
          proposed_slug: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          short_description?: string | null
          status?: string
          store_address?: string | null
          store_city?: string | null
          store_id?: string | null
          store_name: string
          store_province?: string | null
          trading_hours?: Json
          trading_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          brand_color?: string | null
          business_email?: string | null
          business_name?: string
          business_type?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          organisation_id?: string | null
          proposed_slug?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          short_description?: string | null
          status?: string
          store_address?: string | null
          store_city?: string | null
          store_id?: string | null
          store_name?: string
          store_province?: string | null
          trading_hours?: Json
          trading_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_onboarding_requests_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_onboarding_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_staff: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          store_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          store_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_staff_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          brand_colors: Json
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country_code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          hero_image_url: string | null
          id: string
          is_public: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          manager_id: string | null
          metadata: Json
          name: string
          organisation_id: string
          postal_code: string | null
          qr_slug: string
          region: string | null
          slug: string
          status: Database["public"]["Enums"]["store_status"]
          subscription_settings: Json
          timezone: string
          trading_hours: Json
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          brand_colors?: Json
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_public?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          manager_id?: string | null
          metadata?: Json
          name: string
          organisation_id: string
          postal_code?: string | null
          qr_slug?: string
          region?: string | null
          slug: string
          status?: Database["public"]["Enums"]["store_status"]
          subscription_settings?: Json
          timezone?: string
          trading_hours?: Json
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          brand_colors?: Json
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_public?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          manager_id?: string | null
          metadata?: Json
          name?: string
          organisation_id?: string
          postal_code?: string | null
          qr_slug?: string
          region?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["store_status"]
          subscription_settings?: Json
          timezone?: string
          trading_hours?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stores_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_memory: {
        Row: {
          consent: Json
          conversation: Json
          created_at: string
          food: Json
          lifestyle: Json
          personal: Json
          shopping: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          consent?: Json
          conversation?: Json
          created_at?: string
          food?: Json
          lifestyle?: Json
          personal?: Json
          shopping?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          consent?: Json
          conversation?: Json
          created_at?: string
          food?: Json
          lifestyle?: Json
          personal?: Json
          shopping?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriber_store_subs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          source: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["subscription_target"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          source?: string | null
          target_id: string
          target_type?: Database["public"]["Enums"]["subscription_target"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          source?: string | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["subscription_target"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      taylor_knowledge: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          source_url: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          source_url?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          source_url?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      taylor_settings: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          personality_traits: string | null
          singleton: boolean
          system_prompt_addon: string | null
          tagline: string | null
          temperature: number
          updated_at: string
          voice: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          personality_traits?: string | null
          singleton?: boolean
          system_prompt_addon?: string | null
          tagline?: string | null
          temperature?: number
          updated_at?: string
          voice?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          personality_traits?: string | null
          singleton?: boolean
          system_prompt_addon?: string | null
          tagline?: string | null
          temperature?: number
          updated_at?: string
          voice?: string
        }
        Relationships: []
      }
      taylor_training_examples: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          ideal_response: string
          is_active: boolean
          prompt: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ideal_response: string
          is_active?: boolean
          prompt: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ideal_response?: string
          is_active?: boolean
          prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string
          id: string
          key: string
          language_code: string
          namespace: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          language_code: string
          namespace: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          language_code?: string
          namespace?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organisation_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organisation_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organisation_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_fk"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_scans: {
        Row: {
          created_at: string
          detected: Json
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          detected?: Json
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          detected?: Json
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_bindings: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          phone_e164: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          phone_e164: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          phone_e164?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      account_type: "user" | "store_owner"
      app_role:
        | "super_admin"
        | "retailer_admin"
        | "store_manager"
        | "staff"
        | "subscriber"
      campaign_scope: "store" | "brand" | "promotion" | "push"
      catalogue_type: "weekly_flyer" | "monthly" | "seasonal" | "campaign"
      coupon_status: "draft" | "active" | "paused" | "expired" | "archived"
      life_moment_type:
        | "birthday"
        | "anniversary"
        | "school_term"
        | "festive"
        | "custom"
      message_role: "user" | "assistant" | "system" | "tool"
      notification_category:
        | "promotion"
        | "coupon"
        | "expiry_alert"
        | "weather"
        | "recipe"
        | "reminder"
        | "campaign"
        | "life_moment"
        | "system"
      notification_channel: "in_app" | "push" | "email" | "sms"
      notification_status: "queued" | "sent" | "delivered" | "failed" | "read"
      organisation_type:
        | "retail_group"
        | "brand"
        | "franchise"
        | "independent"
        | "partner"
      promotion_type:
        | "weekly_special"
        | "flash_sale"
        | "discount"
        | "bundle"
        | "seasonal"
        | "sponsored"
      qr_code_type:
        | "store_invite"
        | "campaign"
        | "promotion"
        | "coupon"
        | "catalogue"
      store_status: "draft" | "pending" | "active" | "paused" | "archived"
      subscription_target:
        | "store"
        | "department"
        | "brand"
        | "category"
        | "campaign"
        | "region"
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
      account_type: ["user", "store_owner"],
      app_role: [
        "super_admin",
        "retailer_admin",
        "store_manager",
        "staff",
        "subscriber",
      ],
      campaign_scope: ["store", "brand", "promotion", "push"],
      catalogue_type: ["weekly_flyer", "monthly", "seasonal", "campaign"],
      coupon_status: ["draft", "active", "paused", "expired", "archived"],
      life_moment_type: [
        "birthday",
        "anniversary",
        "school_term",
        "festive",
        "custom",
      ],
      message_role: ["user", "assistant", "system", "tool"],
      notification_category: [
        "promotion",
        "coupon",
        "expiry_alert",
        "weather",
        "recipe",
        "reminder",
        "campaign",
        "life_moment",
        "system",
      ],
      notification_channel: ["in_app", "push", "email", "sms"],
      notification_status: ["queued", "sent", "delivered", "failed", "read"],
      organisation_type: [
        "retail_group",
        "brand",
        "franchise",
        "independent",
        "partner",
      ],
      promotion_type: [
        "weekly_special",
        "flash_sale",
        "discount",
        "bundle",
        "seasonal",
        "sponsored",
      ],
      qr_code_type: [
        "store_invite",
        "campaign",
        "promotion",
        "coupon",
        "catalogue",
      ],
      store_status: ["draft", "pending", "active", "paused", "archived"],
      subscription_target: [
        "store",
        "department",
        "brand",
        "category",
        "campaign",
        "region",
      ],
    },
  },
} as const
