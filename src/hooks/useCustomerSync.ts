import { useState } from 'react'

interface SyncStatus {
  isRunning: boolean
  progress: number
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed'
  currentStep: string
  customersFound: number
  customersSaved: number
  errors: string[]
  success: boolean
  duration: number
}

interface SyncLog {
  timestamp: string
  message: string
}

export function useCustomerSync(onComplete?: () => void) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isRunning: false,
    progress: 0,
    status: 'idle',
    currentStep: '',
    customersFound: 0,
    customersSaved: 0,
    errors: [],
    success: false,
    duration: 0
  })

  const [logs, setLogs] = useState<SyncLog[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message }])
    console.log(`🔄 Sync: ${message}`)
  }

  const runSync = async (action: 'quick' | 'full' | 'preview' | 'enhanced' = 'enhanced') => {
    setSyncStatus(prev => ({ 
      ...prev, 
      isRunning: true, 
      progress: 0, 
      errors: [], 
      status: 'starting',
      success: false
    }))
    setLogs([])
    
    const startTime = Date.now()
    
    try {
      addLog(`Starting ${action} customer sync...`)
      setSyncStatus(prev => ({ 
        ...prev, 
        currentStep: 'Connecting to SPY system', 
        progress: 10,
        status: 'running'
      }))
      
      // Simulate progress updates during the API call
      const progressInterval = setInterval(() => {
        setSyncStatus(prev => {
          if (prev.progress < 90 && prev.isRunning) {
            return { ...prev, progress: prev.progress + 5 }
          }
          return prev
        })
      }, 1000)

      const response = await fetch('/api/sync-customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action })
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const duration = Date.now() - startTime

      if (result.success) {
        addLog(`✅ Sync completed successfully`)
        addLog(`📊 Found ${result.customersFound} customers`)
        addLog(`💾 Saved ${result.customersSaved} customers`)
        addLog(`⏱️ Duration: ${(duration / 1000).toFixed(1)}s`)
        
        setSyncStatus({
          isRunning: false,
          progress: 100,
          status: 'completed',
          currentStep: 'Sync completed',
          customersFound: result.customersFound || 0,
          customersSaved: result.customersSaved || 0,
          errors: result.errors || [],
          success: true,
          duration
        })
        
        onComplete?.()
      } else {
        throw new Error(result.message || 'Sync failed')
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      addLog(`❌ Sync failed: ${errorMessage}`)
      
      setSyncStatus({
        isRunning: false,
        progress: 0,
        status: 'failed',
        currentStep: 'Sync failed',
        customersFound: 0,
        customersSaved: 0,
        errors: [errorMessage],
        success: false,
        duration
      })
    }
  }

  const reset = () => {
    setSyncStatus({
      isRunning: false,
      progress: 0,
      status: 'idle',
      currentStep: '',
      customersFound: 0,
      customersSaved: 0,
      errors: [],
      success: false,
      duration: 0
    })
    setLogs([])
  }

  return {
    syncStatus,
    logs,
    runSync,
    reset,
    addLog
  }
} 