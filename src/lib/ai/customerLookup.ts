import { CustomerStorage } from '../data/customerStorage'
import { Customer } from '../spy/customerSync'

interface CustomerLookupResult {
  exactMatch?: Customer
  suggestions: Customer[]
  confidence: number
  query: string
  searchTime: number
}

interface CustomerValidationResult {
  isValid: boolean
  customer?: Customer
  error?: string
}

/**
 * Smart customer lookup system for AI-powered sales order creation
 * Integrates with the existing intent classification system
 */
export class CustomerLookup {
  private storage: CustomerStorage
  
  constructor(dataDir?: string) {
    this.storage = new CustomerStorage(dataDir || 'data')
  }
  
  /**
   * Main customer lookup function for AI integration
   * Returns ranked customer suggestions with confidence scoring
   */
  async findCustomer(query: string): Promise<CustomerLookupResult> {
    const startTime = Date.now()
    
    console.log('🔍 Looking up customer:', query)
    
    if (!query || query.trim().length === 0) {
      return {
        suggestions: [],
        confidence: 0,
        query,
        searchTime: Date.now() - startTime
      }
    }
    
    try {
      const searchResult = await this.storage.searchCustomers(query.trim())
      const searchTime = Date.now() - startTime
      
      console.log(`🎯 Customer lookup completed in ${searchTime}ms`)
      console.log(`📊 Found ${searchResult.suggestions.length} suggestions with confidence ${searchResult.confidence.toFixed(2)}`)
      
      return {
        exactMatch: searchResult.exactMatch,
        suggestions: searchResult.suggestions,
        confidence: searchResult.confidence,
        query: query.trim(),
        searchTime
      }
      
    } catch (error) {
      console.error('❌ Error during customer lookup:', error)
      
      return {
        suggestions: [],
        confidence: 0,
        query: query.trim(),
        searchTime: Date.now() - startTime
      }
    }
  }
  
  /**
   * Validate if a customer exists and is accessible
   */
  async validateCustomerExists(customerId: string): Promise<CustomerValidationResult> {
    console.log(`🔍 Validating customer ID: ${customerId}`)
    
    try {
      const customer = await this.storage.getCustomerById(customerId)
      
      if (customer) {
        console.log(`✅ Customer validation successful: ${customer.name}`)
        return {
          isValid: true,
          customer
        }
      } else {
        console.log(`❌ Customer validation failed: ID not found`)
        return {
          isValid: false,
          error: `Customer with ID ${customerId} not found`
        }
      }
      
    } catch (error) {
      console.error('❌ Error validating customer:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      }
    }
  }
  
  /**
   * Enhanced customer lookup with business context
   * Considers factors like country, previous orders, etc.
   */
  async findCustomerWithContext(query: string, context?: {
    country?: string
    orderHistory?: string[]
    preferredCustomers?: string[]
  }): Promise<CustomerLookupResult> {
    
    console.log('🔍 Looking up customer with context:', { query, context })
    
    // Start with basic lookup
    const basicResult = await this.findCustomer(query)
    
    if (!context || basicResult.suggestions.length === 0) {
      return basicResult
    }
    
    // Apply context-based scoring improvements
    const contextualSuggestions = basicResult.suggestions.map(customer => {
      let contextScore = 0
      
      // Country matching boost
      if (context.country && customer.metadata.country) {
        if (customer.metadata.country.toLowerCase() === context.country.toLowerCase()) {
          contextScore += 0.15
        }
      }
      
      // Preferred customer boost
      if (context.preferredCustomers?.includes(customer.id)) {
        contextScore += 0.1
      }
      
      // Order history boost (if we had this data)
      if (context.orderHistory?.includes(customer.id)) {
        contextScore += 0.05
      }
      
      return {
        customer,
        originalScore: basicResult.confidence,
        contextScore,
        finalScore: Math.min(basicResult.confidence + contextScore, 1.0)
      }
    })
    
    // Re-sort by final score
    contextualSuggestions.sort((a, b) => b.finalScore - a.finalScore)
    
    const enhancedSuggestions = contextualSuggestions.map(item => item.customer)
    const enhancedConfidence = contextualSuggestions.length > 0 ? contextualSuggestions[0].finalScore : basicResult.confidence
    
    console.log(`🎯 Context-enhanced lookup improved confidence from ${basicResult.confidence.toFixed(2)} to ${enhancedConfidence.toFixed(2)}`)
    
    return {
      exactMatch: enhancedConfidence >= 0.95 ? enhancedSuggestions[0] : basicResult.exactMatch,
      suggestions: enhancedSuggestions,
      confidence: enhancedConfidence,
      query: basicResult.query,
      searchTime: basicResult.searchTime
    }
  }
  
  /**
   * Get top customer suggestions for autocomplete/dropdown
   */
  async getCustomerSuggestions(partialQuery: string, limit = 5): Promise<Customer[]> {
    console.log(`🔍 Getting customer suggestions for: "${partialQuery}"`)
    
    if (!partialQuery || partialQuery.length < 2) {
      // Return most recently synced customers for empty/short queries
      const allCustomers = await this.storage.loadCustomers()
      return allCustomers
        .sort((a, b) => b.metadata.lastSync.localeCompare(a.metadata.lastSync))
        .slice(0, limit)
    }
    
    const result = await this.findCustomer(partialQuery)
    return result.suggestions.slice(0, limit)
  }
  
  /**
   * Extract customer entity from natural language query
   * Designed to work with the existing intent classification system
   */
  async extractCustomerFromQuery(userQuery: string): Promise<{
    detectedCustomer?: string
    confidence: number
    suggestions: Customer[]
    extractionMethod: 'exact_match' | 'fuzzy_match' | 'pattern_extraction' | 'none'
  }> {
    
    console.log(`🔍 Extracting customer from query: "${userQuery}"`)
    
    // Strategy 1: Look for common customer patterns
    const customerPatterns = [
      /(?:for|customer|client)\s+(.+?)(?:\s|$|in|,)/i,
      /(?:order\s+for|create\s+order\s+for)\s+(.+?)(?:\s|$|in|,)/i,
      /(?:company|corp|ltd|inc|ab|as|gmbh)\s*(.+?)(?:\s|$|in|,)/i,
      /(.+?)\s+(?:company|corp|ltd|inc|ab|as|gmbh)/i
    ]
    
    let extractedName = ''
    let extractionMethod: 'exact_match' | 'fuzzy_match' | 'pattern_extraction' | 'none' = 'none'
    
    // Try pattern extraction first
    for (const pattern of customerPatterns) {
      const match = userQuery.match(pattern)
      if (match && match[1]) {
        extractedName = match[1].trim()
        extractionMethod = 'pattern_extraction'
        console.log(`🎯 Pattern extracted customer: "${extractedName}"`)
        break
      }
    }
    
    // If no pattern match, look for quoted strings or capitalized words
    if (!extractedName) {
      const quotedMatch = userQuery.match(/"([^"]+)"|'([^']+)'/i)
      if (quotedMatch) {
        extractedName = (quotedMatch[1] || quotedMatch[2]).trim()
        extractionMethod = 'pattern_extraction'
        console.log(`🎯 Quoted string extracted: "${extractedName}"`)
      }
    }
    
    // If still no match, look for words that might be company names
    if (!extractedName) {
      const words = userQuery.split(/\s+/)
      const potentialCompanyWords = words.filter(word => 
        word.length > 2 && 
        /^[A-Z]/.test(word) && // Starts with capital
        !['Create', 'Order', 'For', 'Company', 'Customer', 'Client', 'Make', 'New'].includes(word)
      )
      
      if (potentialCompanyWords.length > 0) {
        extractedName = potentialCompanyWords.join(' ')
        extractionMethod = 'pattern_extraction'
        console.log(`🎯 Capitalized words extracted: "${extractedName}"`)
      }
    }
    
    // Now lookup the extracted customer name
    if (extractedName) {
      const lookupResult = await this.findCustomer(extractedName)
      
      if (lookupResult.exactMatch) {
        extractionMethod = 'exact_match'
      } else if (lookupResult.confidence > 0.7) {
        extractionMethod = 'fuzzy_match'
      }
      
      return {
        detectedCustomer: extractedName,
        confidence: lookupResult.confidence,
        suggestions: lookupResult.suggestions,
        extractionMethod
      }
    }
    
    console.log('❌ No customer pattern detected in query')
    return {
      confidence: 0,
      suggestions: [],
      extractionMethod: 'none'
    }
  }
  
  /**
   * Generate clarification questions when customer is ambiguous
   */
  generateCustomerClarificationQuestions(lookupResult: CustomerLookupResult): string[] {
    const questions: string[] = []
    
    if (lookupResult.suggestions.length === 0) {
      questions.push(`I couldn't find a customer matching "${lookupResult.query}". Please provide the exact customer name.`)
      questions.push('Is this a new customer, or should I search by a different name?')
    } else if (lookupResult.suggestions.length === 1 && lookupResult.confidence < 0.9) {
      const suggestion = lookupResult.suggestions[0]
      questions.push(`Did you mean "${suggestion.name}"?`)
    } else if (lookupResult.suggestions.length > 1) {
      const topSuggestions = lookupResult.suggestions.slice(0, 3)
      const suggestionList = topSuggestions.map((c, i) => `${i + 1}. ${c.name}`).join('\n')
      questions.push(`I found multiple customers matching "${lookupResult.query}":`)
      questions.push(suggestionList)
      questions.push('Which customer did you mean?')
    }
    
    return questions
  }
  
  /**
   * Get customer statistics for admin/debugging
   */
  async getCustomerStats(): Promise<{
    totalCustomers: number
    lastSyncTime?: Date
    customersByCountry: Record<string, number>
    recentlyUpdated: Customer[]
  }> {
    
    const metadata = await this.storage.getMetadata()
    const customers = await this.storage.loadCustomers()
    
    const customersByCountry: Record<string, number> = {}
    customers.forEach((customer: Customer) => {
      const country = customer.metadata.country || 'Unknown'
      customersByCountry[country] = (customersByCountry[country] || 0) + 1
    })
    
    const recentlyUpdated = customers
      .filter((c: Customer) => c.metadata.lastSync)
      .sort((a: Customer, b: Customer) => b.metadata.lastSync.localeCompare(a.metadata.lastSync))
      .slice(0, 10)
    
    const lastSyncTime = await this.storage.getLastSyncTime()
    
    return {
      totalCustomers: customers.length,
      lastSyncTime: lastSyncTime || undefined,
      customersByCountry,
      recentlyUpdated
    }
  }
  
  /**
   * Refresh customer data by triggering a sync
   * This will be called by the sync command
   */
  async refreshCustomerData(): Promise<void> {
    console.log('🔄 Customer data refresh requested...')
    // This method will be called by the sync command
    // For now, just log that a refresh was requested
    console.log('💡 To refresh customer data, run the customer sync command')
  }
}

// Global instance for easy import
export const customerLookup = new CustomerLookup()

// Convenience functions for direct use
export async function findCustomer(query: string): Promise<CustomerLookupResult> {
  return customerLookup.findCustomer(query)
}

export async function validateCustomerExists(customerId: string): Promise<CustomerValidationResult> {
  return customerLookup.validateCustomerExists(customerId)
}

export async function extractCustomerFromQuery(userQuery: string) {
  return customerLookup.extractCustomerFromQuery(userQuery)
}

export async function getCustomerSuggestions(partialQuery: string, limit?: number): Promise<Customer[]> {
  return customerLookup.getCustomerSuggestions(partialQuery, limit)
} 