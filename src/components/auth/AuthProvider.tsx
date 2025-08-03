'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/client'

type Profile = Database['public']['Tables']['profiles']['Row']
type Tenant = Database['public']['Tables']['tenants']['Row']

interface AuthContextType {
  user: User | null
  profile: Profile | null
  tenant: Tenant | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>
  createTenant: (name: string, slug: string) => Promise<{ error: any, tenant?: Tenant }>
  refreshTenant: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // If Supabase is not configured, don't provide auth functionality
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('⚠️ Supabase not configured - authentication disabled')
    
    // Return a basic provider with no auth functionality
    const noAuthValue: AuthContextType = {
      user: null,
      profile: null,
      tenant: null,
      session: null,
      loading: false,
      signUp: async () => ({ error: { message: 'Supabase not configured' } }),
      signIn: async () => ({ error: { message: 'Supabase not configured' } }),
      signOut: async () => {},
      updateProfile: async () => ({ error: { message: 'Supabase not configured' } }),
      createTenant: async () => ({ error: { message: 'Supabase not configured' } }),
      refreshTenant: async () => {}
    }

    return (
      <AuthContext.Provider value={noAuthValue}>
        {children}
      </AuthContext.Provider>
    )
  }

  // At this point, we know supabase is configured and not null
  const supabaseClient = supabase!

  // Load user profile and tenant data
  const loadUserData = async (user: User) => {
    try {
      console.log('👤 Loading user data for:', user.email)
      
      // Get user profile
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        console.error('❌ Error loading profile:', profileError)
        return
      }

      setProfile(profileData)
      console.log('✅ Profile loaded:', profileData?.full_name || profileData?.user_id)

      // Get tenant if user has one
      if (profileData?.tenant_id) {
        const { data: tenantData, error: tenantError } = await supabaseClient
          .from('tenants')
          .select('*')
          .eq('id', profileData.tenant_id)
          .single()

        if (tenantError) {
          console.error('❌ Error loading tenant:', tenantError)
        } else {
          setTenant(tenantData)
          console.log('🏢 Tenant loaded:', tenantData?.name)
        }
      } else {
        console.log('⚠️ User has no tenant assigned')
        setTenant(null)
      }
    } catch (error) {
      console.error('❌ Error in loadUserData:', error)
    }
  }

  // Initialize auth state
  useEffect(() => {
    console.log('🔐 Initializing auth state...')
    
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        loadUserData(session.user)
      } else {
        console.log('👻 No active session found')
      }
      
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event)
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserData(session.user)
        } else {
          setProfile(null)
          setTenant(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Sign up new user
  const signUp = async (email: string, password: string, metadata?: any) => {
    console.log('📝 Attempting sign up for:', email)
    
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {}
      }
    })

    if (error) {
      console.error('❌ Sign up error:', error)
    } else {
      console.log('✅ Sign up successful for:', email)
    }

    return { error }
  }

  // Sign in existing user
  const signIn = async (email: string, password: string) => {
    console.log('🔑 Attempting sign in for:', email)
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('❌ Sign in error:', error)
    } else {
      console.log('✅ Sign in successful for:', email)
    }

    return { error }
  }

  // Sign out user
  const signOut = async () => {
    console.log('👋 Signing out user')
    
    const { error } = await supabaseClient.auth.signOut()
    
    if (error) {
      console.error('❌ Sign out error:', error)
    } else {
      console.log('✅ Sign out successful')
      setUser(null)
      setProfile(null)
      setTenant(null)
      setSession(null)
    }
  }

  // Update user profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: { message: 'No user logged in' } }
    }

    console.log('🔄 Updating profile for:', user.email)
    
    const { data, error } = await supabaseClient
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Profile update error:', error)
    } else {
      console.log('✅ Profile updated successfully')
      setProfile(data)
    }

    return { error }
  }

  // Create new tenant for user
  const createTenant = async (name: string, slug: string) => {
    if (!user) {
      return { error: { message: 'No user logged in' } }
    }

    console.log('🏢 Creating tenant:', name, slug)
    
    try {
      // Create tenant
      const { data: tenantData, error: tenantError } = await supabaseClient
        .from('tenants')
        .insert({
          name,
          slug,
          settings: {}
        })
        .select()
        .single()

      if (tenantError) {
        console.error('❌ Tenant creation error:', tenantError)
        return { error: tenantError }
      }

      console.log('✅ Tenant created:', tenantData.name)

      // Update user profile with tenant
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          tenant_id: tenantData.id,
          role: 'owner'
        })
        .eq('user_id', user.id)

      if (profileError) {
        console.error('❌ Profile tenant update error:', profileError)
        return { error: profileError }
      }

      // Refresh user data
      await loadUserData(user)
      
      console.log('✅ User assigned to tenant as owner')
      
      return { error: null, tenant: tenantData }
    } catch (error) {
      console.error('❌ Unexpected error creating tenant:', error)
      return { error }
    }
  }

  // Refresh tenant data
  const refreshTenant = async () => {
    if (user && profile?.tenant_id) {
      const { data: tenantData } = await supabaseClient
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single()
      
      if (tenantData) {
        setTenant(tenantData)
      }
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    tenant,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    createTenant,
    refreshTenant
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hooks for specific auth states
export function useUser() {
  const { user, loading } = useAuth()
  return { user, loading }
}

export function useProfile() {
  const { profile, loading } = useAuth()
  return { profile, loading }
}

export function useTenant() {
  const { tenant, loading, refreshTenant } = useAuth()
  return { tenant, loading, refreshTenant }
} 