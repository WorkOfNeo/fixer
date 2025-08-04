import { Customer } from '../spy/customerSync'
import { supabase, Database } from '../supabase/client'
import { createServerSupabaseClient, ensureTenantAccess } from '../supabase/server'

interface CustomerSearchResult {
  exactMatch?: Customer
  suggestions: Customer[]
  confidence: number
}

interface StorageMetadata {
  lastSync?: string
  totalCustomers: number
  lastUpdated: string
  version: string
}

/**
 * Supabase-based customer storage with multi-tenant support
 * Maintains the same interface as CustomerStorage for seamless migration
 */
export class SupabaseCustomerStorage {
  private supabase: ReturnType<typeof createServerSupabaseClient>
  private tenantId?: string

  constructor() {
    this.supabase = createServerSupabaseClient()
  }

  /**
   * Initialize with tenant context - must be called before other operations
   */
  async initialize(): Promise<void> {
    const auth = await ensureTenantAccess(this.supabase)
    this.tenantId = auth.tenantId

    if (!this.tenantId) {
      throw new Error('No tenant associated with user. Please set up your organization first.')
    }
  }

  /**
   * Save customers to Supabase with tenant isolation
   */
  async saveCustomers(customers: Customer[]): Promise<void> {
    await this.initialize()
    
    console.log('💾 Saving customers to Supabase...')
    
    try {
      // Convert Customer format to database format
      const dbCustomers = customers.map(customer => ({
        tenant_id: this.tenantId!,
        spy_customer_id: customer.id,
        name: customer.name,
        edit_url: customer.editUrl,
        email: customer.metadata.email || null,
        phone: customer.metadata.phone || null,
        address: customer.metadata.address ? { address: customer.metadata.address } : null,
        country: customer.metadata.country || null,
        status: 'active' as const,
        metadata: customer.metadata,
        last_sync: customer.metadata.lastSync
      }))

      // Use upsert to handle both inserts and updates
      const { error } = await this.supabase
        .from('customers')
        .upsert(dbCustomers, {
          onConflict: 'tenant_id,spy_customer_id',
          ignoreDuplicates: false
        })

      if (error) {
        throw new Error(`Failed to save customers: ${error.message}`)
      }

      // Log the sync operation
      await this.logSync(customers.length, customers.length, Date.now(), true)

      console.log(`✅ Successfully saved ${customers.length} customers to Supabase`)
      
    } catch (error) {
      console.error('❌ Error saving customers to Supabase:', error)
      await this.logSync(customers.length, 0, Date.now(), false, [(error as Error).message])
      throw new Error(`Failed to save customers: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Load customers from Supabase with tenant isolation
   */
  async loadCustomers(): Promise<Customer[]> {
    await this.initialize()
    
    console.log('📂 Loading customers from Supabase...')
    
    try {
      const { data: dbCustomers, error } = await this.supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', this.tenantId!)
        .eq('status', 'active')
        .order('name')

      if (error) {
        throw new Error(`Failed to load customers: ${error.message}`)
      }

      if (!dbCustomers) {
        console.log('📝 No customers found in database')
        return []
      }

      // Convert database format to Customer format
      const customers: Customer[] = dbCustomers.map(dbCustomer => ({
        id: dbCustomer.spy_customer_id,
        name: dbCustomer.name,
        editUrl: dbCustomer.edit_url,
        metadata: {
          ...dbCustomer.metadata,
          email: dbCustomer.email || undefined,
          phone: dbCustomer.phone || undefined,
          address: dbCustomer.address?.address || undefined,
          country: dbCustomer.country || undefined,
          status: dbCustomer.status as 'active' | 'inactive',
          lastSync: dbCustomer.last_sync,
          uuid: dbCustomer.metadata?.uuid
        }
      }))

      console.log(`✅ Loaded ${customers.length} customers from Supabase`)
      return customers
      
    } catch (error) {
      console.error('❌ Error loading customers from Supabase:', error)
      return []
    }
  }

  /**
   * Search customers with fuzzy matching using Supabase function
   */
  async searchCustomers(query: string): Promise<CustomerSearchResult> {
    await this.initialize()
    
    console.log(`🔍 Searching customers in Supabase for query: "${query}"`)
    
    try {
      // Use the custom search function from the database
      const { data: searchResults, error } = await this.supabase
        .rpc('search_customers', {
          search_tenant_id: this.tenantId!,
          search_query: query,
          similarity_threshold: 0.3,
          max_results: 10
        })

      if (error) {
        throw new Error(`Search failed: ${error.message}`)
      }

      if (!searchResults || searchResults.length === 0) {
        console.log('📝 No customers found matching query')
        return {
          suggestions: [],
          confidence: 0
        }
      }

      // Convert search results to Customer format
      const suggestions: Customer[] = []
      let exactMatch: Customer | undefined
      let topConfidence = 0

      for (const result of searchResults) {
        // Get full customer data
        const { data: dbCustomer } = await this.supabase
          .from('customers')
          .select('*')
          .eq('id', result.id)
          .single()

        if (dbCustomer) {
          const customer: Customer = {
            id: dbCustomer.spy_customer_id,
            name: dbCustomer.name,
            editUrl: dbCustomer.edit_url,
            metadata: {
              ...dbCustomer.metadata,
              email: dbCustomer.email || undefined,
              phone: dbCustomer.phone || undefined,
              country: dbCustomer.country || undefined,
              status: dbCustomer.status as 'active' | 'inactive',
              lastSync: dbCustomer.last_sync
            }
          }

          suggestions.push(customer)

          // Check for exact match
          if (result.similarity >= 0.95) {
            exactMatch = customer
          }

          if (result.similarity > topConfidence) {
            topConfidence = result.similarity
          }
        }
      }

      console.log(`🎯 Found ${suggestions.length} customers (best confidence: ${topConfidence.toFixed(2)})`)

      return {
        exactMatch,
        suggestions,
        confidence: topConfidence
      }
      
    } catch (error) {
      console.error('❌ Error searching customers:', error)
      return {
        suggestions: [],
        confidence: 0
      }
    }
  }

  /**
   * Get customer by SPY customer ID
   */
  async getCustomerById(spyCustomerId: string): Promise<Customer | null> {
    await this.initialize()
    
    console.log(`🔍 Looking up customer by SPY ID: ${spyCustomerId}`)
    
    try {
      const { data: dbCustomer, error } = await this.supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', this.tenantId!)
        .eq('spy_customer_id', spyCustomerId)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw new Error(`Failed to get customer: ${error.message}`)
      }

      if (!dbCustomer) {
        console.log(`❌ No customer found with SPY ID: ${spyCustomerId}`)
        return null
      }

      const customer: Customer = {
        id: dbCustomer.spy_customer_id,
        name: dbCustomer.name,
        editUrl: dbCustomer.edit_url,
        metadata: {
          ...dbCustomer.metadata,
          email: dbCustomer.email || undefined,
          phone: dbCustomer.phone || undefined,
          country: dbCustomer.country || undefined,
          status: dbCustomer.status as 'active' | 'inactive',
          lastSync: dbCustomer.last_sync
        }
      }

      console.log(`✅ Found customer: ${customer.name}`)
      return customer
      
    } catch (error) {
      console.error('❌ Error getting customer by ID:', error)
      return null
    }
  }

  /**
   * Get last sync time from sync logs
   */
  async getLastSyncTime(): Promise<Date | null> {
    await this.initialize()
    
    try {
      const { data: lastSync, error } = await this.supabase
        .from('customer_sync_logs')
        .select('created_at')
        .eq('tenant_id', this.tenantId!)
        .eq('success', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to get last sync time: ${error.message}`)
      }

      return lastSync ? new Date(lastSync.created_at) : null
      
    } catch (error) {
      console.warn('⚠️ Could not read last sync time:', error)
      return null
    }
  }

  /**
   * Get storage metadata
   */
  async getMetadata(): Promise<StorageMetadata | null> {
    await this.initialize()
    
    try {
      // Get customer count
      const { count: customerCount, error: countError } = await this.supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId!)
        .eq('status', 'active')

      if (countError) {
        throw new Error(`Failed to get customer count: ${countError.message}`)
      }

      // Get last sync time
      const lastSyncTime = await this.getLastSyncTime()

      return {
        totalCustomers: customerCount || 0,
        lastSync: lastSyncTime?.toISOString(),
        lastUpdated: new Date().toISOString(),
        version: '2.0-supabase'
      }
      
    } catch (error) {
      console.warn('⚠️ Could not read metadata:', error)
      return null
    }
  }

  /**
   * Add or update a single customer
   */
  async upsertCustomer(customer: Customer): Promise<void> {
    await this.initialize()
    
    console.log(`💾 Upserting customer: ${customer.name}`)
    
    try {
      const dbCustomer = {
        tenant_id: this.tenantId!,
        spy_customer_id: customer.id,
        name: customer.name,
        edit_url: customer.editUrl,
        email: customer.metadata.email || null,
        phone: customer.metadata.phone || null,
        country: customer.metadata.country || null,
        status: 'active' as const,
        metadata: {
          ...customer.metadata,
          lastSync: new Date().toISOString()
        },
        last_sync: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('customers')
        .upsert(dbCustomer, {
          onConflict: 'tenant_id,spy_customer_id'
        })

      if (error) {
        throw new Error(`Failed to upsert customer: ${error.message}`)
      }

      console.log(`✅ Successfully upserted customer: ${customer.name}`)
      
    } catch (error) {
      console.error('❌ Error upserting customer:', error)
      throw new Error(`Failed to upsert customer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Remove a customer by SPY customer ID
   */
  async removeCustomer(spyCustomerId: string): Promise<boolean> {
    await this.initialize()
    
    console.log(`🗑️ Removing customer with SPY ID: ${spyCustomerId}`)
    
    try {
      const { error } = await this.supabase
        .from('customers')
        .delete()
        .eq('tenant_id', this.tenantId!)
        .eq('spy_customer_id', spyCustomerId)

      if (error) {
        throw new Error(`Failed to remove customer: ${error.message}`)
      }

      console.log(`✅ Removed customer with SPY ID: ${spyCustomerId}`)
      return true
      
    } catch (error) {
      console.error('❌ Error removing customer:', error)
      return false
    }
  }

  /**
   * Log sync operation for monitoring
   */
  private async logSync(
    customersFound: number, 
    customersSaved: number, 
    durationMs: number, 
    success: boolean, 
    errors?: string[]
  ): Promise<void> {
    try {
      await this.supabase
        .from('customer_sync_logs')
        .insert({
          tenant_id: this.tenantId!,
          customers_found: customersFound,
          customers_saved: customersSaved,
          duration_ms: durationMs,
          success,
          errors: errors || null,
          sync_type: 'manual'
        })
    } catch (error) {
      console.warn('⚠️ Failed to log sync operation:', error)
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalSyncs: number
    successfulSyncs: number
    lastSync?: Date
    averageDuration: number
  }> {
    await this.initialize()
    
    try {
      const { data: logs, error } = await this.supabase
        .from('customer_sync_logs')
        .select('success, duration_ms, created_at')
        .eq('tenant_id', this.tenantId!)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw new Error(`Failed to get sync stats: ${error.message}`)
      }

      if (!logs || logs.length === 0) {
        return {
          totalSyncs: 0,
          successfulSyncs: 0,
          averageDuration: 0
        }
      }

      const totalSyncs = logs.length
      const successfulSyncs = logs.filter(log => log.success).length
      const averageDuration = logs.reduce((sum, log) => sum + log.duration_ms, 0) / totalSyncs
      const lastSync = logs[0] ? new Date(logs[0].created_at) : undefined

      return {
        totalSyncs,
        successfulSyncs,
        lastSync,
        averageDuration
      }
      
    } catch (error) {
      console.error('❌ Error getting sync stats:', error)
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        averageDuration: 0
      }
    }
  }
} 