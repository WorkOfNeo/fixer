import { syncCustomers, syncCustomersWithPagination, enhancedSyncCustomers, SyncResult } from '@/lib/spy/customerSync'
import { CustomerStorage } from '@/lib/data/customerStorage'

interface EnhancedSyncResult extends SyncResult {
  operation: string
  duration: number
  credentialsProvided: boolean
  storageStats?: {
    beforeSync: number
    afterSync: number
    newCustomers: number
  }
}

/**
 * Enhanced customer sync command with detailed logging
 */
export async function runCustomerSync(): Promise<EnhancedSyncResult> {
  console.log('🔄 ===== SYNC COMMAND STARTING =====')
  const startTime = Date.now()
  
  // Enhanced logging for environment and credentials
  console.log('🔍 Environment check:')
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`)
  console.log(`  SPY_USER: ${process.env.SPY_USER ? '***PROVIDED***' : '***MISSING***'}`)
  console.log(`  SPY_PASS: ${process.env.SPY_PASS ? '***PROVIDED***' : '***MISSING***'}`)
  
  try {
    // Check if running on Vercel (serverless environment)
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
    const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME || isVercel
    
    if (isServerless) {
      console.log('🚫 Browser automation not available in serverless environment (Vercel/Lambda)')
      console.log('💡 Use a local environment or dedicated server for customer sync functionality')
      
      return {
        success: false,
        customersFound: 0,
        customersSaved: 0,
        errors: [
          'Browser automation is not supported in serverless environments (Vercel/Lambda)',
          'Please run customer sync from a local environment or dedicated server'
        ],
        lastSync: new Date().toISOString(),
        operation: 'sync_serverless_limitation',
        duration: Date.now() - startTime,
        credentialsProvided: true
      }
    }
    
    // Check credentials
    const spyUser = process.env.SPY_USER
    const spyPass = process.env.SPY_PASS
    
    if (!spyUser || !spyPass) {
      console.error('❌ Missing SPY credentials in environment variables')
      console.error('   Required: SPY_USER and SPY_PASS')
      console.error('   Make sure your .env.local file contains these values')
      
      return {
        success: false,
        customersFound: 0,
        customersSaved: 0,
        errors: ['Missing SPY_USER or SPY_PASS environment variables'],
        lastSync: new Date().toISOString(),
        operation: 'credential_check',
        duration: Date.now() - startTime,
        credentialsProvided: false,
        debugInfo: {
          error: 'Missing credentials',
          environment: {
            SPY_USER: !!spyUser,
            SPY_PASS: !!spyPass,
            NODE_ENV: process.env.NODE_ENV
          }
        }
      }
    }
    
    console.log('✅ Credentials found in environment')
    
    // Check storage before sync
    console.log('📊 Checking storage before sync...')
    const storage = new CustomerStorage()
    const customersBefore = await storage.loadCustomers().catch(() => [])
    console.log(`📊 Customers in storage before sync: ${customersBefore.length}`)
    
    // Run the sync with detailed credentials
    console.log('🚀 Starting SPY system sync...')
    const syncResult = await syncCustomers({
      username: spyUser,
      password: spyPass
    })
    
    console.log('📊 Sync completed, checking results...')
    console.log(`   Success: ${syncResult.success}`)
    console.log(`   Customers found: ${syncResult.customersFound}`)
    console.log(`   Errors: ${syncResult.errors.length}`)
    
    if (syncResult.errors.length > 0) {
      console.log('❌ Sync errors:')
      syncResult.errors.forEach((error, index) => {
        console.log(`   Error ${index + 1}: ${error}`)
      })
    }
    
    // Check storage after sync
    const customersAfter = await storage.loadCustomers().catch(() => [])
    console.log(`📊 Customers in storage after sync: ${customersAfter.length}`)
    
    const duration = Date.now() - startTime
    console.log(`⏱️ Total sync duration: ${duration}ms`)
    
    // If sync succeeded but no customers found, log debug info
    if (syncResult.success && syncResult.customersFound === 0) {
      console.log('⚠️ WARNING: Sync succeeded but no customers found')
      console.log('   This might indicate:')
      console.log('   - Empty customer database')
      console.log('   - Different page structure than expected')
      console.log('   - Parsing issues with customer data')
      
      if (syncResult.debugInfo) {
        console.log('🔍 Debug information available:')
        console.log(`   Debug logs: ${syncResult.debugInfo.logs?.length || 0} entries`)
        console.log(`   Page title: ${syncResult.debugInfo.pageTitle || 'unknown'}`)
        console.log(`   Current URL: ${syncResult.debugInfo.currentUrl || 'unknown'}`)
      }
    }
    
    // Enhanced result with additional metadata
    const enhancedResult: EnhancedSyncResult = {
      ...syncResult,
      operation: 'sync_customers',
      duration,
      credentialsProvided: true,
      storageStats: {
        beforeSync: customersBefore.length,
        afterSync: customersAfter.length,
        newCustomers: customersAfter.length - customersBefore.length
      }
    }
    
    console.log('🔄 ===== SYNC COMMAND COMPLETED =====')
    return enhancedResult
    
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('❌ SYNC COMMAND FAILED:')
    console.error(`   Error: ${errorMessage}`)
    console.error(`   Duration: ${duration}ms`)
    
    if (error instanceof Error && error.stack) {
      console.error(`   Stack trace: ${error.stack}`)
    }
    
    return {
      success: false,
      customersFound: 0,
      customersSaved: 0,
      errors: [errorMessage],
      lastSync: new Date().toISOString(),
      operation: 'sync_command_error',
      duration,
      credentialsProvided: !!process.env.SPY_USER && !!process.env.SPY_PASS,
      debugInfo: {
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined
      }
    }
  }
}

/**
 * Enhanced quick sync (single page) with logging
 */
export async function runQuickCustomerSync(): Promise<EnhancedSyncResult> {
  console.log('🔄 ===== QUICK SYNC STARTING =====')
  console.log('📋 Quick sync will fetch customers from the first page only')
  
  // Use the main sync function but with logging indicating it's quick mode
  const result = await runCustomerSync()
  
  return {
    ...result,
    operation: 'quick_sync'
  }
}

/**
 * Enhanced full sync (with pagination) with logging
 */
export async function runFullCustomerSync(): Promise<EnhancedSyncResult> {
  console.log('🔄 ===== FULL SYNC STARTING =====')
  console.log('📋 Full sync will fetch customers from all pages (with pagination)')
  const startTime = Date.now()
  
  try {
    // Check credentials first
    const spyUser = process.env.SPY_USER
    const spyPass = process.env.SPY_PASS
    
    if (!spyUser || !spyPass) {
      console.error('❌ Missing SPY credentials for full sync')
      return {
        success: false,
        customersFound: 0,
        customersSaved: 0,
        errors: ['Missing SPY_USER or SPY_PASS environment variables'],
        lastSync: new Date().toISOString(),
        operation: 'full_sync_credentials_error',
        duration: Date.now() - startTime,
        credentialsProvided: false
      }
    }
    
    // Check storage before sync
    const storage = new CustomerStorage()
    const customersBefore = await storage.loadCustomers().catch(() => [])
    console.log(`📊 Customers before full sync: ${customersBefore.length}`)
    
    // Run paginated sync
    const syncResult = await syncCustomersWithPagination({
      username: spyUser,
      password: spyPass
    })
    
    // Check storage after sync
    const customersAfter = await storage.loadCustomers().catch(() => [])
    console.log(`📊 Customers after full sync: ${customersAfter.length}`)
    
    const duration = Date.now() - startTime
    console.log(`⏱️ Full sync duration: ${duration}ms`)
    
    // Log pagination-specific info
    if (syncResult.debugInfo) {
      console.log('📄 Pagination details:')
      console.log(`   Total pages processed: ${syncResult.debugInfo.totalPages || 'unknown'}`)
      console.log(`   Unique customers: ${syncResult.debugInfo.uniqueCustomers || 'unknown'}`)
    }
    
    const enhancedResult: EnhancedSyncResult = {
      ...syncResult,
      operation: 'full_sync_with_pagination',
      duration,
      credentialsProvided: true,
      storageStats: {
        beforeSync: customersBefore.length,
        afterSync: customersAfter.length,
        newCustomers: customersAfter.length - customersBefore.length
      }
    }
    
    console.log('🔄 ===== FULL SYNC COMPLETED =====')
    return enhancedResult
    
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('❌ FULL SYNC FAILED:')
    console.error(`   Error: ${errorMessage}`)
    console.error(`   Duration: ${duration}ms`)
    
    return {
      success: false,
      customersFound: 0,
      customersSaved: 0,
      errors: [errorMessage],
      lastSync: new Date().toISOString(),
      operation: 'full_sync_error',
      duration,
      credentialsProvided: !!process.env.SPY_USER && !!process.env.SPY_PASS,
      debugInfo: {
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined
      }
    }
  }
}

/**
 * Preview sync (dry run) with extensive logging
 */
export async function runPreviewCustomerSync(): Promise<EnhancedSyncResult> {
  console.log('🔄 ===== PREVIEW SYNC STARTING =====')
  console.log('👁️ Preview mode: Will analyze SPY system but not save data')
  const startTime = Date.now()
  
  try {
    // Check credentials
    const spyUser = process.env.SPY_USER
    const spyPass = process.env.SPY_PASS
    
    if (!spyUser || !spyPass) {
      console.error('❌ Missing SPY credentials for preview')
      return {
        success: false,
        customersFound: 0,
        customersSaved: 0,
        errors: ['Missing SPY_USER or SPY_PASS environment variables'],
        lastSync: new Date().toISOString(),
        operation: 'preview_credentials_error',
        duration: Date.now() - startTime,
        credentialsProvided: false
      }
    }
    
    // Run sync but don't save to storage
    console.log('👁️ Running preview sync (no data will be saved)...')
    const syncResult = await syncCustomers({
      username: spyUser,
      password: spyPass
    })
    
    const duration = Date.now() - startTime
    
    // Log preview results
    console.log('👁️ Preview Results:')
    console.log(`   Would have found: ${syncResult.customersFound} customers`)
    console.log(`   Success: ${syncResult.success}`)
    console.log(`   Errors: ${syncResult.errors.length}`)
    console.log(`   Duration: ${duration}ms`)
    
    if (syncResult.debugInfo) {
      console.log('🔍 Preview Debug Info:')
      console.log(`   Page title: ${syncResult.debugInfo.pageTitle || 'unknown'}`)
      console.log(`   Page URL: ${syncResult.debugInfo.currentUrl || 'unknown'}`)
      
      if (syncResult.debugInfo.customerSample) {
        console.log('👥 Sample customers that would be imported:')
        syncResult.debugInfo.customerSample.forEach((customer: any, index: number) => {
          console.log(`   ${index + 1}. ${customer.name} (ID: ${customer.id})`)
        })
      }
    }
    
    // Return result but indicate no customers were actually saved
    const enhancedResult: EnhancedSyncResult = {
      ...syncResult,
      customersSaved: 0, // Override - nothing saved in preview mode
      operation: 'preview_sync',
      duration,
      credentialsProvided: true,
      debugInfo: {
        ...syncResult.debugInfo,
        previewMode: true,
        wouldHaveSaved: syncResult.customersFound
      }
    }
    
    console.log('🔄 ===== PREVIEW SYNC COMPLETED =====')
    return enhancedResult
    
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('❌ PREVIEW SYNC FAILED:')
    console.error(`   Error: ${errorMessage}`)
    console.error(`   Duration: ${duration}ms`)
    
    return {
      success: false,
      customersFound: 0,
      customersSaved: 0,
      errors: [errorMessage],
      lastSync: new Date().toISOString(),
      operation: 'preview_error',
      duration,
      credentialsProvided: !!process.env.SPY_USER && !!process.env.SPY_PASS,
      debugInfo: {
        error: errorMessage,
        previewMode: true
      }
    }
  }
}

/**
 * Enhanced SPY-specific customer sync with detailed page structure handling
 */
export async function runEnhancedSpyCustomerSync(): Promise<EnhancedSyncResult> {
  console.log('🔄 ===== ENHANCED SPY SYNC STARTING =====')
  console.log('📋 Using SPY-specific page structure and workflow')
  const startTime = Date.now()
  
  try {
    // Check if running on Vercel (serverless environment)
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
    const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME || isVercel
    
    if (isServerless) {
      console.log('🚫 Browser automation not available in serverless environment (Vercel/Lambda)')
      console.log('💡 Use a local environment or dedicated server for customer sync functionality')
      
      return {
        success: false,
        customersFound: 0,
        customersSaved: 0,
        errors: [
          'Browser automation is not supported in serverless environments (Vercel/Lambda)',
          'Please run customer sync from a local environment or dedicated server',
          'Alternative: Use a headless browser service like Browserless or ScrapingBee'
        ],
        lastSync: new Date().toISOString(),
        operation: 'enhanced_spy_sync_serverless_limitation',
        duration: Date.now() - startTime,
        credentialsProvided: true,
        debugInfo: {
          environment: isVercel ? 'vercel' : 'other_serverless',
          limitation: 'browser_automation_not_supported',
          suggestion: 'run_from_local_environment_or_dedicated_server'
        }
      }
    }
    
    // Check credentials first
    const spyUser = process.env.SPY_USER
    const spyPass = process.env.SPY_PASS
    
    if (!spyUser || !spyPass) {
      console.error('❌ Missing SPY credentials for enhanced sync')
      return {
        success: false,
        customersFound: 0,
        customersSaved: 0,
        errors: ['Missing SPY_USER or SPY_PASS environment variables'],
        lastSync: new Date().toISOString(),
        operation: 'enhanced_spy_sync_credentials_error',
        duration: Date.now() - startTime,
        credentialsProvided: false
      }
    }
    
    // Check storage before sync
    const storage = new CustomerStorage()
    const customersBefore = await storage.loadCustomers().catch(() => [])
    console.log(`📊 Customers before enhanced SPY sync: ${customersBefore.length}`)
    
    // Run the enhanced SPY-specific sync
    console.log('🚀 Starting enhanced SPY customer sync...')
    const syncResult = await enhancedSyncCustomers({
      username: spyUser,
      password: spyPass
    })
    
    // Check storage after sync
    const customersAfter = await storage.loadCustomers().catch(() => [])
    console.log(`📊 Customers after enhanced SPY sync: ${customersAfter.length}`)
    
    const duration = Date.now() - startTime
    console.log(`⏱️ Enhanced SPY sync duration: ${duration}ms`)
    
    // Log SPY-specific details
    if (syncResult.debugInfo) {
      console.log('🔍 Enhanced SPY sync details:')
      console.log(`   Show All button clicked: ${syncResult.debugInfo.showAllButtonFound}`)
      console.log(`   Successful URL: ${syncResult.debugInfo.successfulUrl}`)
      console.log(`   Customers extracted: ${syncResult.debugInfo.totalExtracted}`)
      console.log(`   Customers validated: ${syncResult.debugInfo.validatedCount}`)
    }
    
    const enhancedResult: EnhancedSyncResult = {
      ...syncResult,
      operation: 'enhanced_spy_sync',
      duration,
      credentialsProvided: true,
      debugInfo: {
        ...syncResult.debugInfo,
        customersBefore: customersBefore.length,
        customersAfter: customersAfter.length,
        newCustomers: Math.max(0, customersAfter.length - customersBefore.length)
      }
    }
    
    if (syncResult.success) {
      console.log(`✅ Enhanced SPY sync completed successfully`)
      console.log(`   Customers found: ${syncResult.customersFound}`)
      console.log(`   Customers saved: ${syncResult.customersSaved}`)
      console.log(`   New customers: ${enhancedResult.debugInfo?.newCustomers}`)
    } else {
      console.error(`❌ Enhanced SPY sync failed`)
      console.error(`   Errors: ${syncResult.errors.join(', ')}`)
    }
    
    return enhancedResult
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ Enhanced SPY sync fatal error: ${errorMessage}`)
    
    return {
      success: false,
      customersFound: 0,
      customersSaved: 0,
      errors: [errorMessage],
      lastSync: new Date().toISOString(),
      operation: 'enhanced_spy_sync_error',
      duration: Date.now() - startTime,
      credentialsProvided: !!process.env.SPY_USER && !!process.env.SPY_PASS,
      debugInfo: {
        error: errorMessage,
        environment: {
          SPY_USER: !!process.env.SPY_USER,
          SPY_PASS: !!process.env.SPY_PASS,
          NODE_ENV: process.env.NODE_ENV
        }
      }
    }
  }
}

/**
 * Customer sync health check with enhanced logging
 */
export async function healthCheckCustomerSync(): Promise<{
  isHealthy: boolean
  issues: string[]
  recommendations: string[]
}> {
  console.log('🏥 Running customer sync health check...')
  const issues: string[] = []
  const recommendations: string[] = []
  
  try {
    // Check credentials with detailed logging
    console.log('🔍 Checking SPY credentials...')
    const spyUser = process.env.SPY_USER
    const spyPass = process.env.SPY_PASS
    
    if (!spyUser || !spyPass) {
      console.log('❌ SPY credentials missing')
      issues.push('Missing or invalid SPY credentials')
      recommendations.push('Set SPY_USER and SPY_PASS environment variables in .env.local')
    } else {
      console.log('✅ SPY credentials found')
    }
    
    // Check storage
    console.log('🔍 Checking customer storage...')
    const storage = new CustomerStorage()
    const customers = await storage.loadCustomers()
    
    if (customers.length === 0) {
      console.log('⚠️ No customer data found')
      issues.push('No customer data found')
      recommendations.push('Run initial customer sync to populate database')
    } else {
      console.log(`✅ Found ${customers.length} customers in storage`)
    }
    
    // Check sync age
    console.log('🔍 Checking sync freshness...')
    const status = await getCustomerSyncStatus()
    if (status.syncAge.isStale) {
      console.log(`⚠️ Customer data is stale (${status.syncAge.hours.toFixed(1)} hours old)`)
      issues.push(`Customer data is stale (${status.syncAge.hours.toFixed(1)} hours old)`)
      recommendations.push('Run customer sync to refresh data')
    } else {
      console.log(`✅ Customer data is fresh (${status.syncAge.hours.toFixed(1)} hours old)`)
    }
    
    // Check data directory and metadata
    console.log('🔍 Checking storage metadata...')
    try {
      const metadata = await storage.getMetadata()
      if (!metadata) {
        console.log('⚠️ Customer storage metadata is missing')
        issues.push('Customer storage metadata is missing')
        recommendations.push('Re-run customer sync to fix storage structure')
      } else {
        console.log(`✅ Storage metadata valid (version: ${metadata.version || 'unknown'})`)
      }
    } catch (error) {
      console.log('❌ Cannot access customer storage')
      issues.push('Cannot access customer storage')
      recommendations.push('Check file system permissions for data directory')
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Health check failed:', errorMessage)
    issues.push(`Health check failed: ${errorMessage}`)
    recommendations.push('Check system configuration and try again')
  }
  
  const isHealthy = issues.length === 0
  console.log(`🏥 Health check completed: ${isHealthy ? '✅ HEALTHY' : '❌ ISSUES FOUND'}`)
  
  if (issues.length > 0) {
    console.log('❌ Issues found:')
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`)
    })
    console.log('💡 Recommendations:')
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`)
    })
  }
  
  return {
    isHealthy,
    issues,
    recommendations
  }
}

/**
 * Get comprehensive customer sync status with detailed logging
 */
export async function getCustomerSyncStatus(): Promise<{
  hasData: boolean
  customerCount: number
  lastSync: Date | null
  syncAge: {
    hours: number
    isStale: boolean
  }
  metadata: any
}> {
  console.log('📊 Getting customer sync status...')
  
  try {
    const storage = new CustomerStorage()
    
    // Get customer data
    const customers = await storage.loadCustomers()
    console.log(`📊 Customer count: ${customers.length}`)
    
    // Get last sync time
    const lastSync = await storage.getLastSyncTime()
    console.log(`📊 Last sync: ${lastSync ? lastSync.toISOString() : 'Never'}`)
    
    // Calculate sync age
    const syncAgeHours = lastSync ? (Date.now() - lastSync.getTime()) / (1000 * 60 * 60) : Infinity
    const isStale = syncAgeHours > 24 // Consider stale after 24 hours
    
    console.log(`📊 Sync age: ${syncAgeHours === Infinity ? 'Never synced' : `${syncAgeHours.toFixed(1)} hours`}`)
    console.log(`📊 Is stale: ${isStale}`)
    
    // Get metadata
    const metadata = await storage.getMetadata()
    console.log(`📊 Metadata: ${metadata ? 'Available' : 'Missing'}`)
    
    return {
      hasData: customers.length > 0,
      customerCount: customers.length,
      lastSync,
      syncAge: {
        hours: syncAgeHours,
        isStale
      },
      metadata
    }
    
  } catch (error) {
    console.error('❌ Error getting sync status:', error)
    throw error
  }
} 