import Papa from 'papaparse'

export interface CustomerMapping {
  id: string
  customerName: string
  customerId: string
  country: string
  countryId: string
  aliases?: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CustomerMatch {
  customer: CustomerMapping
  confidence: number
  matchType: 'exact' | 'contains' | 'word' | 'partial'
}

// In-memory storage (in production, this would be a database)
let customerMappings: CustomerMapping[] = []

// Function to detect CSV delimiter
function detectDelimiter(csvContent: string): string {
  const firstLine = csvContent.split('\n')[0]
  const delimiters = [',', ';', '\t', '|']
  
  for (const delimiter of delimiters) {
    const parts = firstLine.split(delimiter)
    if (parts.length > 1) {
      return delimiter
    }
  }
  
  return ',' // Default fallback
}

// Function to parse CSV and create customer mappings
export function parseCustomerCSV(csvContent: string): CustomerMapping[] {
  const delimiter = detectDelimiter(csvContent)
  console.log(`🔍 Detected delimiter: "${delimiter}"`)
  
  const result = Papa.parse(csvContent, {
    delimiter,
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase()
  })
  
  if (result.errors.length > 0) {
    console.warn('⚠️ CSV parsing warnings:', result.errors)
  }
  
  const mappings: CustomerMapping[] = []
  
  result.data.forEach((row: any, index: number) => {
    try {
      // Handle different possible column names
      const customerName = row.customername || row.customer_name || row.name || row.customer || ''
      const customerId = row.customerid || row.customer_id || row.id || ''
      const country = row.country || row.countryname || row.country_name || ''
      const countryId = row.countryid || row.country_id || ''
      const aliases = row.aliases || row.alias || row.alternativenames || ''
      
      if (!customerName || !customerId || !country) {
        console.warn(`⚠️ Skipping row ${index + 1}: Missing required fields`, row)
        return
      }
      
      const mapping: CustomerMapping = {
        id: `${Date.now()}-${index}`,
        customerName: customerName.trim(),
        customerId: customerId.trim(),
        country: country.trim(),
        countryId: countryId.trim(),
        aliases: aliases ? aliases.split(',').map((alias: string) => alias.trim()) : [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mappings.push(mapping)
    } catch (error) {
      console.error(`❌ Error processing row ${index + 1}:`, error)
    }
  })
  
  console.log(`✅ Parsed ${mappings.length} customer mappings from CSV`)
  return mappings
}

// Function to upload and store customer mappings
export function uploadCustomerMappings(csvContent: string): {
  success: boolean
  message: string
  mappings: CustomerMapping[]
  errors?: string[]
} {
  try {
    const newMappings = parseCustomerCSV(csvContent)
    
    if (newMappings.length === 0) {
      return {
        success: false,
        message: 'No valid customer mappings found in CSV',
        mappings: []
      }
    }
    
    // Replace existing mappings (in production, you might want to merge instead)
    customerMappings = newMappings
    
    return {
      success: true,
      message: `Successfully uploaded ${newMappings.length} customer mappings`,
      mappings: newMappings
    }
  } catch (error) {
    console.error('❌ Error uploading customer mappings:', error)
    return {
      success: false,
      message: 'Failed to upload customer mappings',
      mappings: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

// Function to find customer by name and country
export function findCustomer(searchName: string, country?: string): CustomerMatch | null {
  const searchLower = searchName.toLowerCase()
  let bestMatch: CustomerMatch | null = null
  let highestConfidence = 0
  
  console.log(`🔍 Searching for customer: "${searchName}" in country: "${country}"`)
  
  for (const customer of customerMappings) {
    if (!customer.isActive) continue
    
    // If country is specified, filter by country
    if (country && customer.country.toLowerCase() !== country.toLowerCase()) {
      continue
    }
    
    let confidence = 0
    let matchType: 'exact' | 'contains' | 'word' | 'partial' = 'partial'
    
    // Check exact match
    if (customer.customerName.toLowerCase() === searchLower) {
      confidence = 1.0
      matchType = 'exact'
    }
    // Check aliases for exact match
    else if (customer.aliases?.some(alias => alias.toLowerCase() === searchLower)) {
      confidence = 0.95
      matchType = 'exact'
    }
    // Check contains match
    else if (customer.customerName.toLowerCase().includes(searchLower) ||
             searchLower.includes(customer.customerName.toLowerCase())) {
      confidence = 0.8
      matchType = 'contains'
    }
    // Check aliases for contains match
    else if (customer.aliases?.some(alias => 
      alias.toLowerCase().includes(searchLower) || 
      searchLower.includes(alias.toLowerCase())
    )) {
      confidence = 0.75
      matchType = 'contains'
    }
    // Check word match
    else {
      const searchWords = searchLower.split(/\s+/).filter(word => word.length > 2)
      const customerWords = customer.customerName.toLowerCase().split(/\s+/)
      
      const matchingWords = searchWords.filter(searchWord =>
        customerWords.some(customerWord => customerWord.includes(searchWord))
      )
      
      if (matchingWords.length > 0) {
        confidence = 0.6 + (matchingWords.length / searchWords.length) * 0.2
        matchType = 'word'
      }
      // Check aliases for word match
      else if (customer.aliases?.some(alias => {
        const aliasWords = alias.toLowerCase().split(/\s+/)
        return searchWords.some(searchWord =>
          aliasWords.some(aliasWord => aliasWord.includes(searchWord))
        )
      })) {
        confidence = 0.5
        matchType = 'word'
      }
    }
    
    if (confidence > highestConfidence) {
      highestConfidence = confidence
      bestMatch = {
        customer,
        confidence,
        matchType
      }
    }
  }
  
  if (bestMatch) {
    console.log(`✅ Found customer: ${bestMatch.customer.customerName} (confidence: ${bestMatch.confidence}, type: ${bestMatch.matchType})`)
  } else {
    console.log('❌ No customer match found')
  }
  
  return bestMatch
}

// Function to get all customer mappings
export function getAllCustomerMappings(): CustomerMapping[] {
  return customerMappings.filter(mapping => mapping.isActive)
}

// Function to get customer mappings by country
export function getCustomerMappingsByCountry(country: string): CustomerMapping[] {
  return customerMappings.filter(mapping => 
    mapping.isActive && mapping.country.toLowerCase() === country.toLowerCase()
  )
}

// Function to add a single customer mapping
export function addCustomerMapping(mapping: Omit<CustomerMapping, 'id' | 'createdAt' | 'updatedAt'>): CustomerMapping {
  const newMapping: CustomerMapping = {
    ...mapping,
    id: `${Date.now()}-${Math.random()}`,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  customerMappings.push(newMapping)
  return newMapping
}

// Function to update a customer mapping
export function updateCustomerMapping(id: string, updates: Partial<CustomerMapping>): CustomerMapping | null {
  const index = customerMappings.findIndex(mapping => mapping.id === id)
  if (index === -1) return null
  
  customerMappings[index] = {
    ...customerMappings[index],
    ...updates,
    updatedAt: new Date()
  }
  
  return customerMappings[index]
}

// Function to delete a customer mapping
export function deleteCustomerMapping(id: string): boolean {
  const index = customerMappings.findIndex(mapping => mapping.id === id)
  if (index === -1) return false
  
  customerMappings.splice(index, 1)
  return true
}

// Function to export customer mappings as CSV
export function exportCustomerMappings(): string {
  const headers = ['Customer Name', 'Customer ID', 'Country', 'Country ID', 'Aliases', 'Is Active']
  const rows = customerMappings.map(mapping => [
    mapping.customerName,
    mapping.customerId,
    mapping.country,
    mapping.countryId,
    mapping.aliases?.join(', ') || '',
    mapping.isActive ? 'Yes' : 'No'
  ])
  
  return Papa.unparse({
    fields: headers,
    data: rows
  })
} 