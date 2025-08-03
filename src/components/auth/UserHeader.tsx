'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCustomerSync } from '@/hooks/useCustomerSync'
import { RefreshCw } from 'lucide-react'

export function UserHeader() {
  const { user, profile, tenant, signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { syncStatus, runSync } = useCustomerSync()

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    await signOut()
    setIsLoggingOut(false)
  }

  if (!user) {
    return null
  }

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 hover:bg-purple-200'
      case 'admin':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      case 'user':
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }
  }

  const formatRole = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'Owner'
      case 'admin':
        return 'Admin'
      case 'user':
        return 'User'
      default:
        return 'User'
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left side - User and tenant info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {/* User avatar placeholder */}
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            
            {/* User info */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {profile?.full_name || user.email}
              </span>
              <div className="flex items-center gap-2">
                {tenant ? (
                  <>
                    <span className="text-xs text-gray-500">{tenant.name}</span>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getRoleColor(profile?.role)}`}
                    >
                      {formatRole(profile?.role)}
                    </Badge>
                  </>
                ) : (
                  <span className="text-xs text-orange-600">No organization</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {/* Storage type indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>
              {process.env.CUSTOMER_STORAGE_TYPE === 'supabase' ? 'Database' : 'JSON Storage'}
            </span>
          </div>

          {/* Sync status (if we have tenant) */}
          {tenant && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={syncStatus.isRunning}
              onClick={async () => {
                console.log('🔄 Enhanced sync triggered from UserHeader...')
                await runSync('enhanced')
              }}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${syncStatus.isRunning ? 'animate-spin' : ''}`} />
              {syncStatus.isRunning ? 'Syncing...' : 'Sync Customers'}
            </Button>
          )}

          {/* Sign out button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="text-gray-600 hover:text-gray-900"
          >
            {isLoggingOut ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                <span className="text-xs">Signing out...</span>
              </div>
            ) : (
              <span className="text-xs">Sign Out</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 