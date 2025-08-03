'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCustomerSync } from '@/hooks/useCustomerSync'
import { SyncedCustomerData } from './SyncedCustomerData'
import { 
  RefreshCw, 
  Database, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Play,
  Download,
  Eye,
  Settings,
  Users
} from 'lucide-react'

interface SyncManagerProps {
  onSyncComplete?: () => void
}

interface SyncStatus {
  isRunning: boolean
  progress: number
  status: string
  currentStep: string
  customersFound: number
  customersSaved: number
  errors: string[]
  success: boolean
  duration: number
}

export function SyncManager({ onSyncComplete }: SyncManagerProps) {
  // Use the shared sync hook for consistent state
  const { syncStatus, logs, runSync: hookRunSync } = useCustomerSync(onSyncComplete)
  
  const runSync = async (action: 'quick' | 'full' | 'preview' | 'enhanced') => {
    await hookRunSync(action)
  }

  const getStatusIcon = () => {
    if (syncStatus.isRunning) {
      return <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
    } else if (syncStatus.success) {
      return <CheckCircle className="w-5 h-5 text-green-600" />
    } else if (syncStatus.errors.length > 0) {
      return <AlertCircle className="w-5 h-5 text-red-600" />
    } else {
      return <Database className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = () => {
    if (syncStatus.isRunning) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Running</Badge>
    } else if (syncStatus.success) {
      return <Badge variant="secondary" className="bg-green-100 text-green-700">Success</Badge>
    } else if (syncStatus.errors.length > 0) {
      return <Badge variant="secondary" className="bg-red-100 text-red-700">Failed</Badge>
    } else {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Idle</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sync Management</h2>
        <p className="text-gray-600">Manage customer data synchronization from your SPY system</p>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="manual">Manual Sync</TabsTrigger>
          <TabsTrigger value="status">Sync Status</TabsTrigger>
          <TabsTrigger value="data">Customer Data</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Enhanced Sync - NEW AND RECOMMENDED */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <RefreshCw className="w-5 h-5" />
                  Enhanced Sync
                </CardTitle>
                <CardDescription className="text-green-700">
                  <strong>🎯 RECOMMENDED:</strong> Smart SPY sync with improved row detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => runSync('enhanced')}
                  disabled={syncStatus.isRunning}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {syncStatus.isRunning ? 'Syncing...' : 'Start Enhanced Sync'}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Sync */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Quick Sync
                </CardTitle>
                <CardDescription>
                  Legacy: Basic sync (may have loading issues)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => runSync('quick')}
                  disabled={syncStatus.isRunning}
                  variant="outline"
                  className="w-full"
                >
                  {syncStatus.isRunning ? 'Syncing...' : 'Start Quick Sync'}
                </Button>
              </CardContent>
            </Card>

            {/* Full Sync */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Full Sync
                </CardTitle>
                <CardDescription>
                  Legacy: Paginated sync (may have loading issues)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => runSync('full')}
                  disabled={syncStatus.isRunning}
                  variant="outline"
                  className="w-full"
                >
                  {syncStatus.isRunning ? 'Syncing...' : 'Start Full Sync'}
                </Button>
              </CardContent>
            </Card>

            {/* Preview Sync */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview
                </CardTitle>
                <CardDescription>
                  Test sync without saving data (dry run)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => runSync('preview')}
                  disabled={syncStatus.isRunning}
                  variant="outline"
                  className="w-full"
                >
                  {syncStatus.isRunning ? 'Previewing...' : 'Preview Sync'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sync Progress */}
          {syncStatus.isRunning && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon()}
                      <span className="font-medium">{syncStatus.currentStep}</span>
                    </div>
                    {getStatusBadge()}
                  </div>
                  
                  <Progress value={syncStatus.progress} className="w-full" />
                  
                  <div className="text-sm text-gray-600">
                    {syncStatus.progress}% complete
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Results */}
          {!syncStatus.isRunning && (syncStatus.success || syncStatus.errors.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon()}
                  Last Sync Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syncStatus.success ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Sync completed successfully! Found {syncStatus.customersFound} customers, 
                        saved {syncStatus.customersSaved} to database. 
                        Duration: {(syncStatus.duration / 1000).toFixed(1)}s
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Sync failed: {syncStatus.errors.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{syncStatus.customersFound}</div>
                      <div className="text-xs text-gray-500">Found</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{syncStatus.customersSaved}</div>
                      <div className="text-xs text-gray-500">Saved</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{(syncStatus.duration / 1000).toFixed(1)}s</div>
                      <div className="text-xs text-gray-500">Duration</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
              <CardDescription>Real-time sync status and progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span className="font-medium">
                    {syncStatus.isRunning ? 'Sync in Progress' : 'Sync Idle'}
                  </span>
                </div>
                {getStatusBadge()}
              </div>

              {syncStatus.isRunning && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{syncStatus.progress}%</span>
                    </div>
                    <Progress value={syncStatus.progress} />
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Current Step: {syncStatus.currentStep}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div>
                  <div className="text-sm text-gray-500">Customers Found</div>
                  <div className="text-xl font-semibold">{syncStatus.customersFound}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Customers Saved</div>
                  <div className="text-xl font-semibold">{syncStatus.customersSaved}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <SyncedCustomerData refreshTrigger={syncStatus.success ? Date.now() : 0} />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Logs</CardTitle>
              <CardDescription>Detailed logs from sync operations</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No sync logs yet. Run a sync to see detailed logs here.</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="font-mono text-sm space-y-1">
                    {logs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`${
                          log.message.includes('✅') ? 'text-green-600' :
                          log.message.includes('❌') ? 'text-red-600' :
                          log.message.includes('📊') ? 'text-blue-600' :
                          'text-gray-600'
                        }`}
                      >
                        <span className="text-gray-500 mr-2">[{log.timestamp}]</span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {logs.length > 0 && (
                <div className="mt-4 text-sm text-gray-500">
                  {logs.length} log entries
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 