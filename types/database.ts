// Hand-written from schema.sql. Replace with:
//   npx supabase gen types typescript --project-id <ref>
// once a real Supabase project is provisioned.

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          phone: string | null
          role: 'user' | 'provider_owner' | 'admin'
          status: 'active' | 'suspended' | 'deleted'
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          role?: 'user' | 'provider_owner' | 'admin'
          status?: 'active' | 'suspended' | 'deleted'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: []
      }

      provider_categories: {
        Row: {
          id: string
          name: string
          slug: string
          parent_category_id: string | null
          icon: string | null
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          parent_category_id?: string | null
          icon?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['provider_categories']['Insert']>
        Relationships: []
      }

      providers: {
        Row: {
          id: string
          owner_user_id: string | null
          business_name: string
          slug: string
          description: string | null
          contact_email: string
          contact_phone: string | null
          website_url: string | null
          instagram_url: string | null
          price_range_low: number | null
          price_range_high: number | null
          price_unit: 'event' | 'hour' | 'person' | 'package' | 'day' | null
          currency: string
          status: 'pending' | 'approved' | 'rejected' | 'suspended'
          is_claimed: boolean
          is_verified: boolean
          rejection_reason: string | null
          requested_category_text: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          owner_user_id?: string | null
          business_name: string
          slug: string
          description?: string | null
          contact_email: string
          contact_phone?: string | null
          website_url?: string | null
          instagram_url?: string | null
          price_range_low?: number | null
          price_range_high?: number | null
          price_unit?: 'event' | 'hour' | 'person' | 'package' | 'day' | null
          currency?: string
          status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          is_claimed?: boolean
          is_verified?: boolean
          rejection_reason?: string | null
          requested_category_text?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['providers']['Insert']>
        Relationships: []
      }

      provider_category_map: {
        Row: {
          provider_id: string
          category_id: string
        }
        Insert: {
          provider_id: string
          category_id: string
        }
        Update: Partial<Database['public']['Tables']['provider_category_map']['Insert']>
        Relationships: []
      }

      provider_locations: {
        Row: {
          id: string
          provider_id: string
          address_line1: string | null
          address_line2: string | null
          city: string
          state: string
          postal_code: string | null
          country: string
          latitude: number | null
          longitude: number | null
          service_radius_miles: number | null
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          address_line1?: string | null
          address_line2?: string | null
          city: string
          state: string
          postal_code?: string | null
          country?: string
          latitude?: number | null
          longitude?: number | null
          service_radius_miles?: number | null
          is_primary?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['provider_locations']['Insert']>
        Relationships: []
      }

      provider_media: {
        Row: {
          id: string
          provider_id: string
          media_type: 'image' | 'video'
          storage_path: string
          alt_text: string | null
          caption: string | null
          sort_order: number
          status: 'active' | 'pending_review' | 'rejected' | 'deleted'
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          media_type: 'image' | 'video'
          storage_path: string
          alt_text?: string | null
          caption?: string | null
          sort_order?: number
          status?: 'active' | 'pending_review' | 'rejected' | 'deleted'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['provider_media']['Insert']>
        Relationships: []
      }

      category_requests: {
        Row: {
          id: string
          provider_id: string
          requested_name: string
          status: 'pending' | 'merged' | 'created' | 'rejected'
          resolved_category_id: string | null
          admin_notes: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          provider_id: string
          requested_name: string
          status?: 'pending' | 'merged' | 'created' | 'rejected'
          resolved_category_id?: string | null
          admin_notes?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['category_requests']['Insert']>
        Relationships: []
      }

      event_types: {
        Row: {
          id: string
          name: string
          slug: string
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['event_types']['Insert']>
        Relationships: []
      }

      event_templates: {
        Row: {
          id: string
          event_type_id: string
          name: string
          description: string | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_type_id: string
          name: string
          description?: string | null
          is_default?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['event_templates']['Insert']>
        Relationships: []
      }

      event_template_items: {
        Row: {
          id: string
          template_id: string
          category_id: string | null
          item_name: string
          default_budget_percent: number | null
          default_cost_min: number | null
          default_cost_max: number | null
          currency: string
          sort_order: number
        }
        Insert: {
          id?: string
          template_id: string
          category_id?: string | null
          item_name: string
          default_budget_percent?: number | null
          default_cost_min?: number | null
          default_cost_max?: number | null
          currency?: string
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['event_template_items']['Insert']>
        Relationships: []
      }

      user_event_plans: {
        Row: {
          id: string
          user_id: string | null
          share_token: string
          event_type_id: string | null
          name: string
          event_date: string | null
          event_timezone: string | null
          guest_count: number | null
          budget_min: number | null
          budget_max: number | null
          currency: string
          city: string | null
          state: string | null
          status: 'active' | 'archived' | 'deleted'
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          share_token?: string
          event_type_id?: string | null
          name: string
          event_date?: string | null
          event_timezone?: string | null
          guest_count?: number | null
          budget_min?: number | null
          budget_max?: number | null
          currency?: string
          city?: string | null
          state?: string | null
          status?: 'active' | 'archived' | 'deleted'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['user_event_plans']['Insert']>
        Relationships: []
      }

      user_event_plan_items: {
        Row: {
          id: string
          event_plan_id: string
          category_id: string | null
          item_name: string
          estimated_cost: number | null
          actual_cost: number | null
          currency: string
          selected_provider_id: string | null
          status: 'planned' | 'shortlisted' | 'booked' | 'skipped'
          notes: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_plan_id: string
          category_id?: string | null
          item_name: string
          estimated_cost?: number | null
          actual_cost?: number | null
          currency?: string
          selected_provider_id?: string | null
          status?: 'planned' | 'shortlisted' | 'booked' | 'skipped'
          notes?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_event_plan_items']['Insert']>
        Relationships: []
      }

      inquiries: {
        Row: {
          id: string
          user_id: string | null
          guest_name: string | null
          guest_email: string | null
          guest_phone: string | null
          provider_id: string
          event_plan_id: string | null
          event_type_id: string | null
          event_date: string | null
          event_timezone: string | null
          guest_count: number | null
          budget_min: number | null
          budget_max: number | null
          currency: string
          city: string | null
          state: string | null
          message: string
          reply_token: string
          status: 'sent' | 'delivered' | 'viewed' | 'responded' | 'closed' | 'spam'
          vendor_first_viewed_at: string | null
          vendor_first_responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          guest_name?: string | null
          guest_email?: string | null
          guest_phone?: string | null
          provider_id: string
          event_plan_id?: string | null
          event_type_id?: string | null
          event_date?: string | null
          event_timezone?: string | null
          guest_count?: number | null
          budget_min?: number | null
          budget_max?: number | null
          currency?: string
          city?: string | null
          state?: string | null
          message: string
          reply_token?: string
          status?: 'sent' | 'delivered' | 'viewed' | 'responded' | 'closed' | 'spam'
          vendor_first_viewed_at?: string | null
          vendor_first_responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['inquiries']['Insert']>
        Relationships: []
      }

      inquiry_messages: {
        Row: {
          id: string
          inquiry_id: string
          sender_role: 'user' | 'guest' | 'vendor' | 'system'
          sender_user_id: string | null
          body: string
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          inquiry_id: string
          sender_role: 'user' | 'guest' | 'vendor' | 'system'
          sender_user_id?: string | null
          body: string
          created_at?: string
          read_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['inquiry_messages']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience aliases
export type DbProvider = Database['public']['Tables']['providers']['Row']
export type DbInquiry = Database['public']['Tables']['inquiries']['Row']
export type DbProviderLocation = Database['public']['Tables']['provider_locations']['Row']
export type DbProviderCategory = Database['public']['Tables']['provider_categories']['Row']
export type DbEventType = Database['public']['Tables']['event_types']['Row']
export type DbInquiryMessage = Database['public']['Tables']['inquiry_messages']['Row']
export type DbProviderMedia = Database['public']['Tables']['provider_media']['Row']
export type DbUserEventPlan = Database['public']['Tables']['user_event_plans']['Row']
