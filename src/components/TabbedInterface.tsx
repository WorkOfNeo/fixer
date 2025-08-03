'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CustomerList } from './CustomerList'
import { SyncManager } from './SyncManager'
import { SyncedCustomerData } from './SyncedCustomerData'
import { Bot, Users, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useCustomerSync } from '@/hooks/useCustomerSync'

interface TabbedInterfaceProps {
  children: React.ReactNode  // The AI chat interface
}

export function TabbedInterface({ children }: TabbedInterfaceProps) {
  const [refreshCustomers, setRefreshCustomers] = useState(0)

  const handleSyncComplete = () => {
    // Trigger refresh of customer list
    setRefreshCustomers(prev => prev + 1)
  }

  // Use the custom sync hook with progress tracking
  const { syncStatus, runSync } = useCustomerSync(handleSyncComplete)

  const handleTriggerSync = async () => {
    if (syncStatus.isRunning) {
      console.log('⏸️ Sync already running, ignoring trigger...')
      return
    }
    console.log('🔄 Triggering enhanced customer sync with progress tracking...')
    await runSync('enhanced')
  }

  return (
    <div className="w-full h-full">
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Sync Manager
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AI Assistant</h2>
                <p className="text-gray-600">
                  Chat with your AI assistant for stock checking, sales orders, and more
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Online
              </Badge>
            </div>
            {children}
          </div>
        </TabsContent>

        <TabsContent value="customers" className="mt-6">
          <div className="space-y-4">
            {/* Sync Progress Indicator */}
            {syncStatus.isRunning && (
              <Alert>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{syncStatus.currentStep}</span>
                      <span>{syncStatus.progress}%</span>
                    </div>
                    <Progress value={syncStatus.progress} className="w-full" />
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Sync Success/Error Results */}
            {!syncStatus.isRunning && syncStatus.status === 'completed' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Sync completed successfully! Found {syncStatus.customersFound} customers, 
                  saved {syncStatus.customersSaved} to database. 
                  Duration: {(syncStatus.duration / 1000).toFixed(1)}s
                </AlertDescription>
              </Alert>
            )}

            {!syncStatus.isRunning && syncStatus.status === 'failed' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Sync failed: {syncStatus.errors.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            <CustomerList 
              key={refreshCustomers} // Force refresh when sync completes
              onTriggerSync={handleTriggerSync} 
              isSyncing={syncStatus.isRunning}
            />

            {/* Customer Data Verification */}
            <SyncedCustomerData refreshTrigger={refreshCustomers} />
          </div>
        </TabsContent>

        <TabsContent value="sync" className="mt-6">
          <SyncManager onSyncComplete={handleSyncComplete} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 