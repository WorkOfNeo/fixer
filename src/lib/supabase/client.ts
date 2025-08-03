import { createClient } from '@supabase/supabase-js'

// Database types for type safety
export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Record<string, any>
          spy_credentials?: {
            username?: string
            encrypted_password?: string
          }
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Record<string, any>
          spy_credentials?: {
            username?: string
            encrypted_password?: string
          }
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Record<string, any>
          spy_credentials?: {
            username?: string
            encrypted_password?: string
          }
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          tenant_id: string
          spy_customer_id: string
          name: string
          edit_url: string
          email?: string
          phone?: string
          address?: Record<string, any>
          country?: string
          status: 'active' | 'inactive'
          metadata: Record<string, any>
          last_sync: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          spy_customer_id: string
          name: string
          edit_url: string
          email?: string
          phone?: string
          address?: Record<string, any>
          country?: string
          status?: 'active' | 'inactive'
          metadata?: Record<string, any>
          last_sync?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          spy_customer_id?: string
          name?: string
          edit_url?: string
          email?: string
          phone?: string
          address?: Record<string, any>
          country?: string
          status?: 'active' | 'inactive'
          metadata?: Record<string, any>
          last_sync?: string
          updated_at?: string
        }
      }
      sales_orders: {
        Row: {
          id: string
          tenant_id: string
          customer_id: string
          order_number: string
          items: Record<string, any>[]
          total_pieces: number
          status: string
          spy_order_data?: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          customer_id: string
          order_number: string
          items: Record<string, any>[]
          total_pieces: number
          status?: string
          spy_order_data?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          customer_id?: string
          order_number?: string
          items?: Record<string, any>[]
          total_pieces?: number
          status?: string
          spy_order_data?: Record<string, any>
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          tenant_id?: string
          full_name?: string
          role: 'owner' | 'admin' | 'user'
          avatar_url?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id?: string
          full_name?: string
          role?: 'owner' | 'admin' | 'user'
          avatar_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          full_name?: string
          role?: 'owner' | 'admin' | 'user'
          avatar_url?: string
          updated_at?: string
        }
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
  }
}

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey)
}

/**
 * Get or create Supabase client
 * Returns null if not configured
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null
  }

  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}

/**
 * Client-side Supabase client for browser usage
 * Only available if properly configured
 */
export const supabase = getSupabaseClient() 