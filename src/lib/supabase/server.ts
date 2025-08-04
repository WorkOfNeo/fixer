import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Database } from './client'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.')
}

// Type assertion since we've validated they exist
const SUPABASE_URL = supabaseUrl as string
const SUPABASE_ANON_KEY = supabaseAnonKey as string

/**
 * Server-side Supabase client for API routes and server components
 * Handles cookies automatically for authentication
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Cookie setting might fail in middleware
            console.warn('Failed to set cookie:', error)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Cookie removal might fail in middleware
            console.warn('Failed to remove cookie:', error)
          }
        }
      }
    }
  )
}

/**
 * Middleware Supabase client for handling authentication in middleware
 */
export function createMiddlewareSupabaseClient(request: NextRequest, response: NextResponse) {
  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        }
      }
    }
  )
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(supabaseClient: ReturnType<typeof createServerSupabaseClient>) {
  const { data: { user } } = await supabaseClient.auth.getUser()
  return user
}

/**
 * Get the current user's tenant information
 * This is crucial for multi-tenant data isolation
 */
export async function getCurrentTenant(supabaseClient: ReturnType<typeof createServerSupabaseClient>) {
  const { data: { user } } = await supabaseClient.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return null
  }

  const { data: tenant } = await supabaseClient
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single()

  return tenant
}

/**
 * Helper to ensure user has access to a tenant
 * Used in API routes for authorization
 */
export async function ensureTenantAccess(
  supabaseClient: ReturnType<typeof createServerSupabaseClient>,
  tenantId?: string
) {
  const { data: { user } } = await supabaseClient.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    throw new Error('User profile not found')
  }

  // If tenantId is specified, ensure user has access to it
  if (tenantId && profile.tenant_id !== tenantId) {
    throw new Error('Access denied to tenant')
  }

  return {
    user,
    profile,
    tenantId: profile.tenant_id
  }
} 