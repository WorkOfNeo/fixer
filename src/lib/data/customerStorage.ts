import fs from 'fs/promises'
import path from 'path'
import { Customer } from '../spy/customerSync'

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

interface CustomerDatabase {
  metadata: StorageMetadata
  customers: Customer[]
}

export class CustomerStorage {
  private customersFile: string
  private dataDir: string
  
  constructor(dataDir = 'data') {
    this.dataDir = dataDir
    this.customersFile = path.join(dataDir, 'customers.json')
  }
  
  /**
   * Save customers to persistent storage
   */
  async saveCustomers(customers: Customer[]): Promise<void> {
    console.log('💾 Saving customers to storage...')
    
    try {
      // Ensure data directory exists
      await this.ensureDataDirectory()
      
      // Prepare database structure
      const database: CustomerDatabase = {
        metadata: {
          lastSync: customers.length > 0 ? customers[0].metadata.lastSync : new Date().toISOString(),
          totalCustomers: customers.length,
          lastUpdated: new Date().toISOString(),
          version: '1.0'
        },
        customers: customers.sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
      }
      
      // Write to file with proper formatting
      const jsonData = JSON.stringify(database, null, 2)
      await fs.writeFile(this.customersFile, jsonData, 'utf8')
      
      console.log(`✅ Successfully saved ${customers.length} customers to ${this.customersFile}`)
      
    } catch (error) {
      console.error('❌ Error saving customers:', error)
      throw new Error(`Failed to save customers: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Load customers from persistent storage
   */
  async loadCustomers(): Promise<Customer[]> {
    console.log('📂 Loading customers from storage...')
    
    try {
      // Check if file exists
      if (!await this.fileExists(this.customersFile)) {
        console.log('📝 No customer data file found, returning empty array')
        return []
      }
      
      // Read and parse file
      const fileContent = await fs.readFile(this.customersFile, 'utf8')
      const database: CustomerDatabase = JSON.parse(fileContent)
      
      // Validate database structure
      if (!database.customers || !Array.isArray(database.customers)) {
        console.warn('⚠️ Invalid customer database structure, returning empty array')
        return []
      }
      
      console.log(`✅ Loaded ${database.customers.length} customers from storage`)
      console.log(`📊 Last sync: ${database.metadata.lastSync || 'Unknown'}`)
      
      return database.customers
      
    } catch (error) {
      console.error('❌ Error loading customers:', error)
      
      // If file is corrupted, log error but don't crash
      if (error instanceof SyntaxError) {
        console.warn('⚠️ Customer data file is corrupted, returning empty array')
        return []
      }
      
      throw new Error(`Failed to load customers: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Search customers with fuzzy matching
   */
  async searchCustomers(query: string): Promise<CustomerSearchResult> {
    console.log(`🔍 Searching customers for query: "${query}"`)
    
    const customers = await this.loadCustomers()
    
    if (customers.length === 0) {
      console.log('📝 No customers in database')
      return {
        suggestions: [],
        confidence: 0
      }
    }
    
    const normalizedQuery = this.normalizeSearchQuery(query)
    
    // Step 1: Look for exact matches
    const exactMatch = customers.find(customer => 
      this.normalizeSearchQuery(customer.name) === normalizedQuery
    )
    
    if (exactMatch) {
      console.log(`✅ Exact match found: ${exactMatch.name}`)
      return {
        exactMatch,
        suggestions: [exactMatch],
        confidence: 1.0
      }
    }
    
    // Step 2: Fuzzy search with scoring
    const searchResults = customers
      .map(customer => ({
        customer,
        score: this.calculateSimilarityScore(normalizedQuery, customer.name)
      }))
      .filter(result => result.score > 0.3) // Minimum threshold
      .sort((a, b) => b.score - a.score) // Sort by best match first
      .slice(0, 10) // Limit to top 10 results
    
    const suggestions = searchResults.map(result => result.customer)
    const topScore = searchResults.length > 0 ? searchResults[0].score : 0
    
    console.log(`🎯 Found ${suggestions.length} similar customers (best score: ${topScore.toFixed(2)})`)
    
    return {
      suggestions,
      confidence: topScore
    }
  }
  
  /**
   * Get customer by ID
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    console.log(`🔍 Looking up customer by ID: ${id}`)
    
    const customers = await this.loadCustomers()
    const customer = customers.find(c => c.id === id)
    
    if (customer) {
      console.log(`✅ Found customer: ${customer.name}`)
    } else {
      console.log(`❌ No customer found with ID: ${id}`)
    }
    
    return customer || null
  }
  
  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<Date | null> {
    try {
      if (!await this.fileExists(this.customersFile)) {
        return null
      }
      
      const fileContent = await fs.readFile(this.customersFile, 'utf8')
      const database: CustomerDatabase = JSON.parse(fileContent)
      
      return database.metadata.lastSync ? new Date(database.metadata.lastSync) : null
      
    } catch (error) {
      console.warn('⚠️ Could not read last sync time:', error)
      return null
    }
  }
  
  /**
   * Get storage metadata
   */
  async getMetadata(): Promise<StorageMetadata | null> {
    try {
      if (!await this.fileExists(this.customersFile)) {
        return null
      }
      
      const fileContent = await fs.readFile(this.customersFile, 'utf8')
      const database: CustomerDatabase = JSON.parse(fileContent)
      
      return database.metadata
      
    } catch (error) {
      console.warn('⚠️ Could not read metadata:', error)
      return null
    }
  }
  
  /**
   * Add or update a single customer
   */
  async upsertCustomer(customer: Customer): Promise<void> {
    console.log(`💾 Upserting customer: ${customer.name}`)
    
    const customers = await this.loadCustomers()
    const existingIndex = customers.findIndex(c => c.id === customer.id)
    
    if (existingIndex >= 0) {
      // Update existing customer
      customers[existingIndex] = {
        ...customers[existingIndex],
        ...customer,
        metadata: {
          ...customers[existingIndex].metadata,
          ...customer.metadata,
          lastSync: new Date().toISOString()
        }
      }
      console.log(`✅ Updated existing customer: ${customer.name}`)
    } else {
      // Add new customer
      customers.push({
        ...customer,
        metadata: {
          ...customer.metadata,
          lastSync: new Date().toISOString()
        }
      })
      console.log(`✅ Added new customer: ${customer.name}`)
    }
    
    await this.saveCustomers(customers)
  }
  
  /**
   * Remove a customer by ID
   */
  async removeCustomer(id: string): Promise<boolean> {
    console.log(`🗑️ Removing customer with ID: ${id}`)
    
    const customers = await this.loadCustomers()
    const initialLength = customers.length
    const filteredCustomers = customers.filter(c => c.id !== id)
    
    if (filteredCustomers.length < initialLength) {
      await this.saveCustomers(filteredCustomers)
      console.log(`✅ Removed customer with ID: ${id}`)
      return true
    } else {
      console.log(`❌ No customer found with ID: ${id}`)
      return false
    }
  }
  
  // Private helper methods
  
  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.access(this.dataDir)
    } catch {
      console.log(`📁 Creating data directory: ${this.dataDir}`)
      await fs.mkdir(this.dataDir, { recursive: true })
    }
  }
  
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
  
  private normalizeSearchQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
  }
  
  /**
   * Calculate similarity score between query and customer name
   * Uses multiple algorithms for comprehensive matching
   */
  private calculateSimilarityScore(query: string, customerName: string): number {
    const normalizedName = this.normalizeSearchQuery(customerName)
    
    // Algorithm 1: Exact substring match
    if (normalizedName.includes(query)) {
      return 0.9
    }
    
    // Algorithm 2: Word-based matching
    const queryWords = query.split(' ').filter(w => w.length > 0)
    const nameWords = normalizedName.split(' ').filter(w => w.length > 0)
    
    let wordMatches = 0
    for (const queryWord of queryWords) {
      for (const nameWord of nameWords) {
        if (nameWord.includes(queryWord) || queryWord.includes(nameWord)) {
          wordMatches++
          break
        }
      }
    }
    
    const wordScore = queryWords.length > 0 ? wordMatches / queryWords.length : 0
    
    // Algorithm 3: Levenshtein distance (simplified)
    const levenshteinScore = this.levenshteinSimilarity(query, normalizedName)
    
    // Algorithm 4: Common character ratio
    const charScore = this.commonCharacterRatio(query, normalizedName)
    
    // Combine scores with weights
    const combinedScore = (
      wordScore * 0.4 +
      levenshteinScore * 0.3 +
      charScore * 0.3
    )
    
    return Math.min(combinedScore, 0.95) // Cap at 0.95 to reserve 1.0 for exact matches
  }
  
  private levenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    return maxLength === 0 ? 1 : 1 - (distance / maxLength)
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }
  
  private commonCharacterRatio(str1: string, str2: string): number {
    const chars1 = new Set(str1.split(''))
    const chars2 = new Set(str2.split(''))
    
    const intersection = new Set(Array.from(chars1).filter(char => chars2.has(char)))
    const union = new Set([...Array.from(chars1), ...Array.from(chars2)])
    
    return union.size === 0 ? 0 : intersection.size / union.size
  }
} 