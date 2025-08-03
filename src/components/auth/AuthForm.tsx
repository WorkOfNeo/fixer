'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AuthFormProps {
  onSuccess?: () => void
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const { signIn, signUp, loading } = useAuth()
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form states
  const [signInForm, setSignInForm] = useState({
    email: '',
    password: ''
  })

  const [signUpForm, setSignUpForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    console.log('🔑 Attempting sign in...')

    const { error } = await signIn(signInForm.email, signInForm.password)

    if (error) {
      setError(error.message || 'Failed to sign in')
      console.error('❌ Sign in failed:', error)
    } else {
      console.log('✅ Sign in successful')
      setSuccess('Successfully signed in!')
      onSuccess?.()
    }

    setFormLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    // Validate form
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setError('Passwords do not match')
      setFormLoading(false)
      return
    }

    if (signUpForm.password.length < 6) {
      setError('Password must be at least 6 characters')
      setFormLoading(false)
      return
    }

    console.log('📝 Attempting sign up...')

    const { error } = await signUp(
      signUpForm.email, 
      signUpForm.password,
      { full_name: signUpForm.fullName }
    )

    if (error) {
      setError(error.message || 'Failed to create account')
      console.error('❌ Sign up failed:', error)
    } else {
      console.log('✅ Sign up successful')
      setSuccess('Account created successfully! Please check your email to verify your account.')
    }

    setFormLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">2-BIZ Stock Checker</CardTitle>
        <CardDescription>
          Sign in to your account or create a new one to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          {/* Error/Success Messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <TabsContent value="signin" className="mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signInForm.email}
                  onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                  required
                  disabled={formLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={signInForm.password}
                  onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                  required
                  disabled={formLoading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={formLoading || !signInForm.email || !signInForm.password}
              >
                {formLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={signUpForm.fullName}
                  onChange={(e) => setSignUpForm({ ...signUpForm, fullName: e.target.value })}
                  required
                  disabled={formLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signUpForm.email}
                  onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                  required
                  disabled={formLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={signUpForm.password}
                  onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                  required
                  disabled={formLoading}
                  minLength={6}
                />
                <p className="text-xs text-gray-500">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={signUpForm.confirmPassword}
                  onChange={(e) => setSignUpForm({ ...signUpForm, confirmPassword: e.target.value })}
                  required
                  disabled={formLoading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={
                  formLoading || 
                  !signUpForm.email || 
                  !signUpForm.password || 
                  !signUpForm.confirmPassword ||
                  !signUpForm.fullName
                }
              >
                {formLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            By signing up, you'll create your own organization space with isolated customer data.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 