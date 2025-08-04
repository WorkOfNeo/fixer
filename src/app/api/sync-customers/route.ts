import { NextRequest, NextResponse } from 'next/server'
import { 
  runCustomerSync, 
  runQuickCustomerSync, 
  runFullCustomerSync, 
  runPreviewCustomerSync,
  runEnhancedSpyCustomerSync,
  healthCheckCustomerSync 
} from '@/lib/commands/syncCustomers'

export async function GET(request: NextRequest) {
  console.log('📋 GET /api/sync-customers - Health check request')
  
  try {
    const healthCheck = await healthCheckCustomerSync()
    
    return NextResponse.json({
      success: healthCheck.isHealthy,
      message: healthCheck.isHealthy ? 'Customer sync system is healthy' : 'Customer sync system has issues',
      health: healthCheck,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error in sync-customers health check:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`🔄 POST /api/sync-customers [${requestId}] - Sync request initiated`)
  
  try {
    const body = await request.json().catch(() => ({}))
    const { action = 'quick' } = body
    
    console.log(`🔄 [${requestId}] Action requested: ${action}`)
    console.log(`🔄 [${requestId}] Request body:`, body)
    
    // Enhanced logging for environment check
    console.log(`🔄 [${requestId}] Environment check:`)
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`)
    console.log(`   SPY_USER exists: ${!!process.env.SPY_USER}`)
    console.log(`   SPY_PASS exists: ${!!process.env.SPY_PASS}`)
    
    let syncResult
    
    // Check if running on Vercel (serverless environment)
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
    const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME || isVercel
    
    if (isServerless) {
      console.log(`🔄 [${requestId}] Running on serverless - delegating to browser automation server`)
      
      // Call external browser automation server
      const browserServerUrl = process.env.BROWSER_SERVER_URL
      if (!browserServerUrl) {
        console.log(`❌ [${requestId}] Browser automation server URL not configured`)
        syncResult = {
          success: false,
          customersFound: 0,
          customersSaved: 0,
          errors: [
            'Browser automation server URL not configured',
            'Set BROWSER_SERVER_URL environment variable to your deployed browser automation server'
          ],
          lastSync: new Date().toISOString(),
          operation: 'sync_external_server_missing',
          duration: 0,
          credentialsProvided: true
        }
      } else {
        try {
          console.log(`🔄 [${requestId}] Calling browser automation server: ${browserServerUrl}`)
          
          const response = await fetch(`${browserServerUrl}/sync-customers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action })
          })
          
          if (!response.ok) {
            throw new Error(`Browser server responded with ${response.status}: ${response.statusText}`)
          }
          
          syncResult = await response.json()
          console.log(`✅ [${requestId}] Browser automation server completed: ${syncResult.success}`)
          
          // Add metadata about delegation
          syncResult = {
            ...syncResult,
            operation: `external_${syncResult.operation}`,
            delegatedTo: browserServerUrl
          }
          
        } catch (error: any) {
          console.error(`❌ [${requestId}] Browser automation server error:`, error.message)
          
          syncResult = {
            success: false,
            customersFound: 0,
            customersSaved: 0,
            errors: [
              `Failed to connect to browser automation server: ${error.message}`,
              'Make sure the browser automation server is running and accessible'
            ],
            lastSync: new Date().toISOString(),
            operation: 'sync_external_server_error',
            duration: 0,
            credentialsProvided: true
          }
        }
      }
    } else {
      // Running locally - use the original sync functions
      switch (action) {
        case 'quick':
          console.log(`🔄 [${requestId}] Running quick customer sync...`)
          syncResult = await runQuickCustomerSync()
          break
          
        case 'full':
          console.log(`🔄 [${requestId}] Running full customer sync with pagination...`)
          syncResult = await runFullCustomerSync()
          break
          
        case 'preview':
          console.log(`🔄 [${requestId}] Running preview customer sync (dry run)...`)
          syncResult = await runPreviewCustomerSync()
          break
          
        case 'enhanced':
          console.log(`🔄 [${requestId}] Running enhanced SPY-specific customer sync...`)
          syncResult = await runEnhancedSpyCustomerSync()
          break
          
        default:
          console.log(`❌ [${requestId}] Invalid action: ${action}`)
          return NextResponse.json(
            { 
              success: false, 
              message: `Invalid action: ${action}. Use 'quick', 'full', 'preview', or 'enhanced'`,
              requestId 
            },
            { status: 400 }
          )
      }
    }
    
    console.log(`🔄 [${requestId}] Sync completed:`)
    console.log(`   Success: ${syncResult.success}`)
    console.log(`   Customers found: ${syncResult.customersFound}`)
    console.log(`   Customers saved: ${syncResult.customersSaved}`)
    console.log(`   Duration: ${syncResult.duration}ms`)
    console.log(`   Operation: ${syncResult.operation}`)
    console.log(`   Errors: ${syncResult.errors.length}`)
    
    if (syncResult.errors.length > 0) {
      console.log(`❌ [${requestId}] Sync errors:`)
      syncResult.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    }
    
    // Enhanced response with detailed debug information
    const response = {
      success: syncResult.success,
      message: syncResult.success 
        ? `${action} sync completed successfully`
        : `${action} sync failed`,
      action,
      requestId,
      customersFound: syncResult.customersFound,
      customersSaved: syncResult.customersSaved,
      errors: syncResult.errors,
      lastSync: syncResult.lastSync,
      duration: syncResult.duration,
      operation: syncResult.operation,
      credentialsProvided: syncResult.credentialsProvided,
      timestamp: new Date().toISOString(),
      
      // Include storage stats if available
      ...(syncResult.storageStats && { storageStats: syncResult.storageStats }),
      
      // Include debug info for troubleshooting (but limit size for API response)
      debugInfo: syncResult.debugInfo ? {
        pageTitle: syncResult.debugInfo.pageTitle,
        currentUrl: syncResult.debugInfo.currentUrl,
        error: syncResult.debugInfo.error,
        previewMode: syncResult.debugInfo.previewMode,
        wouldHaveSaved: syncResult.debugInfo.wouldHaveSaved,
        totalPages: syncResult.debugInfo.totalPages,
        uniqueCustomers: syncResult.debugInfo.uniqueCustomers,
        logCount: syncResult.debugInfo.logs?.length || 0,
        customerSampleCount: syncResult.debugInfo.customerSample?.length || 0,
        // Include first few log entries for debugging
        recentLogs: syncResult.debugInfo.logs?.slice(-10) || []
      } : undefined
    }
    
    console.log(`✅ [${requestId}] API response prepared with ${Object.keys(response).length} fields`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ [${requestId}] API Error:`, errorMessage)
    
    if (error instanceof Error && error.stack) {
      console.error(`❌ [${requestId}] Stack trace:`, error.stack)
    }
    
    return NextResponse.json(
      {
        success: false,
        message: 'Customer sync failed',
        error: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
        debugInfo: {
          error: errorMessage,
          errorStack: error instanceof Error ? error.stack : undefined
        }
      },
      { status: 500 }
    )
  }
} 