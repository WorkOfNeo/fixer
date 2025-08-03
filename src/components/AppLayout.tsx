'use client'

import { AuthProvider, useAuth } from './auth/AuthProvider'
import { AuthForm } from './auth/AuthForm'
import { TenantSetup } from './auth/TenantSetup'
import { UserHeader } from './auth/UserHeader'
import { CustomerStorageFactory } from '@/lib/data/customerStorageFactory'

interface AppLayoutProps {
  children: React.ReactNode
}

function AppContent({ children }: AppLayoutProps) {
  const { user, profile, tenant, loading } = useAuth()

  // Show loading spinner while authentication state is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading 2-BIZ Stock Checker</h2>
          <p className="text-gray-600">Please wait while we set up your workspace...</p>
        </div>
      </div>
    )
  }

  // Show authentication form if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AuthForm />
          
          {/* Development mode notice */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Development Mode</h4>
              <div className="text-xs text-yellow-700 space-y-1">
                <p>Storage: {CustomerStorageFactory.getStorageType().toUpperCase()}</p>
                <p>
                  {CustomerStorageFactory.getStorageType() === 'json' 
                    ? 'Using local JSON storage - no authentication required for API calls'
                    : 'Using Supabase - full multi-tenant authentication'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show tenant setup if user is logged in but has no tenant
  if (user && profile && !tenant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserHeader />
        <div className="flex items-center justify-center p-4 pt-20">
          <TenantSetup />
        </div>
      </div>
    )
  }

  // Show main application if user is logged in and has a tenant
  if (user && profile && tenant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserHeader />
        <main className="max-w-7xl mx-auto py-6 px-4">
          {children}
        </main>
      </div>
    )
  }

  // Fallback state - should not normally reach here
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Setting up your account...</h2>
        <p className="text-gray-600">Please wait while we complete your setup.</p>
      </div>
    </div>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  // Only render AuthProvider if Supabase is configured
  const isSupabaseMode = CustomerStorageFactory.getStorageType() === 'supabase'
  
  if (!isSupabaseMode) {
    // In JSON mode, skip authentication entirely
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Simple header for JSON mode */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">2-BIZ Stock Checker</h1>
              <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">
                Development Mode (JSON Storage)
              </span>
            </div>
          </div>
        </div>
        
        <main className="max-w-7xl mx-auto py-6 px-4">
          {children}
        </main>
      </div>
    )
  }

  // In Supabase mode, use full authentication
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  )
} 