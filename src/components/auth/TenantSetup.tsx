'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface TenantSetupProps {
  onComplete?: () => void
}

export function TenantSetup({ onComplete }: TenantSetupProps) {
  const { createTenant, user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    organizationName: '',
    slug: ''
  })

  // Auto-generate slug from organization name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }

  const handleNameChange = (name: string) => {
    setForm({
      organizationName: name,
      slug: generateSlug(name)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate form
    if (!form.organizationName.trim()) {
      setError('Organization name is required')
      setLoading(false)
      return
    }

    if (!form.slug.trim()) {
      setError('Organization slug is required')
      setLoading(false)
      return
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setError('Organization URL can only contain lowercase letters, numbers, and hyphens')
      setLoading(false)
      return
    }

    if (form.slug.length < 3) {
      setError('Organization URL must be at least 3 characters')
      setLoading(false)
      return
    }

    console.log('🏢 Creating tenant:', form.organizationName, form.slug)

    const { error } = await createTenant(form.organizationName.trim(), form.slug.trim())

    if (error) {
      if (error.code === '23505') {
        setError('This organization URL is already taken. Please choose a different one.')
      } else {
        setError(error.message || 'Failed to create organization')
      }
      console.error('❌ Tenant creation failed:', error)
    } else {
      console.log('✅ Tenant created successfully')
      setSuccess(true)
      
      // Complete setup after a brief delay to show success
      setTimeout(() => {
        onComplete?.()
      }, 1500)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Organization Created!</h3>
            <p className="text-gray-600 mb-4">
              Your organization "{form.organizationName}" has been successfully created.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to your dashboard...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Set Up Your Organization</CardTitle>
        <CardDescription>
          Create your organization to start managing customers and orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Welcome message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">Welcome, {profile?.full_name || user?.email}!</h4>
            <p className="text-sm text-blue-700">
              You're almost ready to start using the 2-BIZ Stock Checker. Just set up your organization to get started.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              type="text"
              placeholder="Acme Corporation"
              value={form.organizationName}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              This will be displayed in your dashboard and customer communications
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug">Organization URL</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                app.com/
              </span>
              <Input
                id="org-slug"
                type="text"
                placeholder="acme-corp"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                required
                disabled={loading}
                className="rounded-l-none"
                pattern="[a-z0-9-]+"
                minLength={3}
              />
            </div>
            <p className="text-xs text-gray-500">
              Used for your organization's unique URL. Only lowercase letters, numbers, and hyphens allowed.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !form.organizationName.trim() || !form.slug.trim()}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating organization...
              </div>
            ) : (
              'Create Organization'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-700 mb-2">What you'll get:</h4>
            <ul className="text-left space-y-1">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Isolated customer database</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>AI-powered stock checking</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Sales order automation</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Team collaboration</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 