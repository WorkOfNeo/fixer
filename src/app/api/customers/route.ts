import { NextRequest, NextResponse } from 'next/server'
import { CustomerStorage } from '@/lib/data/customerStorage'

export async function GET(request: NextRequest) {
  console.log('📋 GET /api/customers - Customer data request')
  
  try {
    const storage = new CustomerStorage()
    
    // Load customers from storage
    const customers = await storage.loadCustomers()
    const metadata = await storage.getMetadata()
    
    console.log(`📊 Loaded ${customers.length} customers for API response`)
    
    return NextResponse.json({
      success: true,
      customers,
      metadata: {
        totalCustomers: customers.length,
        lastSync: metadata?.lastSync || null,
        lastUpdated: metadata?.lastUpdated || null,
        version: metadata?.version || '1.0'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error loading customers for API:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load customers',
        error: error instanceof Error ? error.message : 'Unknown error',
        customers: [],
        metadata: null,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'refresh') {
      // Force refresh of customer data
      console.log('🔄 API: Refreshing customer data...')
      
      const storage = new CustomerStorage()
      const customers = await storage.loadCustomers()
      const metadata = await storage.getMetadata()
      const lastSyncTime = await storage.getLastSyncTime()
      
      const enhancedMetadata = {
        ...metadata,
        totalCustomers: customers.length,
        lastSync: lastSyncTime?.toISOString(),
        lastUpdated: new Date().toISOString(),
        version: metadata?.version || '1.0-json'
      }
      
      return NextResponse.json({
        success: true,
        customers,
        metadata: enhancedMetadata,
        message: 'Customer data refreshed successfully'
      })
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('❌ API: Error in customer POST:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process request',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 