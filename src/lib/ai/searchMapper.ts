// Search parameter mapping system
export interface SearchMapping {
  query: string
  queryBy: 'no' | 'name'
  rowType: 'Stock' | 'Available' | 'PO Available'
  description: string
}

// Season code detection patterns
export const SEASON_PATTERNS = {
  // Common season prefixes
  prefixes: ['ea', 'es', 'hs', 'ss', 'fw', 'aw', 'sp', 'su', 'fa', 'wi'],
  // Year patterns (2-digit years like 24, 25, 26, etc.)
  yearPattern: /^\d{2}$/
}

// Sales order detection patterns
export const SALES_ORDER_PATTERNS = {
  // Action patterns
  create: ['create', 'make', 'start', 'begin', 'initiate', 'open', 'new'],
  order: ['order', 'sales order', 'purchase order', 'buy', 'purchase'],
  
  // Customer patterns
  customer: ['for customer', 'customer', 'client', 'buyer', 'for', 'to'],
  
  // Country patterns
  country: ['in', 'from', 'country', 'location', 'region'],
  
  // Style patterns
  style: ['style', 'item', 'product', 'article', 'model'],
  
  // Quantity patterns
  quantity: ['quantity', 'amount', 'number', 'how many', 'qty', 'pieces', 'units']
}

// Natural language to system parameter mappings
export const SEARCH_MAPPINGS: Record<string, SearchMapping[]> = {
  // Stock-related queries
  'stock': [
    { query: '', queryBy: 'name', rowType: 'Stock', description: 'Current stock levels' },
    { query: '', queryBy: 'name', rowType: 'Available', description: 'Available stock for sale' },
    { query: '', queryBy: 'name', rowType: 'PO Available', description: 'Stock available on purchase orders' }
  ],
  'inventory': [
    { query: '', queryBy: 'name', rowType: 'Stock', description: 'Current inventory levels' },
    { query: '', queryBy: 'name', rowType: 'Available', description: 'Available inventory' },
    { query: '', queryBy: 'name', rowType: 'PO Available', description: 'Inventory on purchase orders' }
  ],
  'available': [
    { query: '', queryBy: 'name', rowType: 'Available', description: 'Available stock for sale' }
  ],
  'po': [
    { query: '', queryBy: 'name', rowType: 'PO Available', description: 'Stock available on purchase orders' }
  ],
  'purchase order': [
    { query: '', queryBy: 'name', rowType: 'PO Available', description: 'Stock available on purchase orders' }
  ],
  'on order': [
    { query: '', queryBy: 'name', rowType: 'PO Available', description: 'Stock on purchase orders' }
  ],
  'ordered': [
    { query: '', queryBy: 'name', rowType: 'PO Available', description: 'Stock that has been ordered' }
  ],
  'current': [
    { query: '', queryBy: 'name', rowType: 'Stock', description: 'Current stock levels' }
  ],
  'total': [
    { query: '', queryBy: 'name', rowType: 'Stock', description: 'Total stock levels' }
  ]
}

// Function to detect season codes in style identifiers
export function detectSeasonCode(query: string): { hasSeason: boolean; seasonCode?: string; baseStyle?: string } {
  console.log('🌱 Detecting season code in:', query)
  
  const cleanQuery = query.trim().toLowerCase()
  
  // Look for patterns like "naomi.ea25", "style.es24", etc.
  const seasonPattern = /^([a-zA-Z0-9]+)\.([a-z]{2})(\d{2})$/i
  
  const match = cleanQuery.match(seasonPattern)
  if (match) {
    const [, baseStyle, seasonPrefix, year] = match
    
    // Check if the season prefix is valid
    if (SEASON_PATTERNS.prefixes.includes(seasonPrefix.toLowerCase())) {
      const seasonCode = `${seasonPrefix}${year}`
      console.log('✅ Detected season code:', seasonCode, 'for base style:', baseStyle)
      return {
        hasSeason: true,
        seasonCode,
        baseStyle
      }
    }
  }
  
  // Also check for patterns without dots: "naomiesa25", "stylees24", etc.
  // We need to be more careful here to avoid false positives
  for (const prefix of SEASON_PATTERNS.prefixes) {
    const noDotPattern = new RegExp(`^([a-zA-Z0-9]+)${prefix}(\\d{2})$`, 'i')
    const noDotMatch = cleanQuery.match(noDotPattern)
    if (noDotMatch) {
      const [, baseStyle, year] = noDotMatch
      const seasonCode = `${prefix}${year}`
      console.log('✅ Detected season code (no dot):', seasonCode, 'for base style:', baseStyle)
      return {
        hasSeason: true,
        seasonCode,
        baseStyle
      }
    }
  }
  
  console.log('❌ No season code detected')
  return { hasSeason: false }
}

// Function to detect if user wants to filter out zero values
export function detectZeroFilter(userQuery: string): boolean {
  const query = userQuery.toLowerCase()
  
  // Phrases that indicate user wants to exclude zero values
  const zeroFilterPhrases = [
    'not the colors that are 0',
    'not colors that are 0',
    'not the ones that are 0',
    'not ones that are 0',
    'only show colors with stock',
    'only colors with stock',
    'only show ones with stock',
    'only ones with stock',
    'exclude zero',
    'exclude zeros',
    'filter out zero',
    'filter out zeros',
    'hide zero',
    'hide zeros',
    'no zero',
    'no zeros',
    'with stock only',
    'that have stock',
    'that has stock',
    'with values',
    'with actual stock',
    'with actual values',
    'non-zero',
    'non zero',
    '1 or more',
    'one or more',
    'more than 0',
    'greater than 0',
    'at least 1',
    'at least one',
    'with quantity',
    'with items',
    'with stock',
    'only those with',
    'only with',
    'just those with',
    'just with',
    'that have',
    'that has',
    'with any',
    'with some',
    'with stock',
    'with inventory',
    'with items',
    'with quantity',
    'with stock levels',
    'with stock levels',
    'with stock levels',
    'with stock levels'
  ]
  
  const hasZeroFilter = zeroFilterPhrases.some(phrase => query.includes(phrase))
  
  if (hasZeroFilter) {
    console.log('🎯 Detected zero filter request')
  }
  
  return hasZeroFilter
}

// Function to determine multiple row types from natural language
export function determineMultipleRowTypes(userQuery: string): ('Stock' | 'Available' | 'PO Available')[] {
  const query = userQuery.toLowerCase()
  
  console.log('🔍 Determining multiple row types from query:', userQuery)
  
  const requestedTypes: Set<'Stock' | 'Available' | 'PO Available'> = new Set()
  
  // Check for combined queries first
  if (query.includes('stock') && (query.includes('po') || query.includes('purchase order') || query.includes('pos'))) {
    console.log('📊 Detected combined stock + PO query')
    requestedTypes.add('Stock')
    requestedTypes.add('PO Available')
  }
  
  if (query.includes('stock') && query.includes('available')) {
    console.log('📊 Detected combined stock + available query')
    requestedTypes.add('Stock')
    requestedTypes.add('Available')
  }
  
  if (query.includes('available') && (query.includes('po') || query.includes('purchase order') || query.includes('pos'))) {
    console.log('📊 Detected combined available + PO query')
    requestedTypes.add('Available')
    requestedTypes.add('PO Available')
  }
  
  // Check for individual types if no combinations found
  if (requestedTypes.size === 0) {
    // Check for PO-related terms (including "pos")
    if (query.includes('po') || 
        query.includes('purchase order') || 
        query.includes('pos') ||
        query.includes('on order') || 
        query.includes('ordered') ||
        query.includes('po available')) {
      console.log('📦 Detected PO Available row type')
      requestedTypes.add('PO Available')
    }
    
    // Check for available stock
    if (query.includes('available') || 
        query.includes('for sale') || 
        query.includes('sellable') ||
        query.includes('ready to ship')) {
      console.log('✅ Detected Available row type')
      requestedTypes.add('Available')
    }
    
    // Check for current stock
    if (query.includes('stock') || 
        query.includes('inventory') || 
        query.includes('current') ||
        query.includes('total')) {
      console.log('📊 Detected Stock row type')
      requestedTypes.add('Stock')
    }
  }
  
  // If still nothing found, default to current stock
  if (requestedTypes.size === 0) {
    console.log('📊 Defaulting to Stock row type')
    requestedTypes.add('Stock')
  }
  
  const result = Array.from(requestedTypes)
  console.log('🎯 Final row types:', result)
  return result
}

// Function to determine row type from natural language (backward compatibility)
export function determineRowType(userQuery: string): 'Stock' | 'Available' | 'PO Available' {
  const types = determineMultipleRowTypes(userQuery)
  return types[0] // Return first type for backward compatibility
}

// Function to intelligently detect if a query is a style number or style name
export function detectQueryType(query: string): 'no' | 'name' {
  console.log('🔍 Detecting query type for:', query)
  const cleanQuery = query.trim()
  
  // First, check for season codes
  const seasonDetection = detectSeasonCode(cleanQuery)
  if (seasonDetection.hasSeason) {
    console.log('🌱 Season code detected, treating as style name with season context')
    return 'name'
  }
  
  // Style number: all digits and length > 6, OR alphanumeric codes that look like style numbers
  if (/^\d+$/.test(cleanQuery) && cleanQuery.length > 6) {
    console.log('🔢 Detected as style number (all digits):', cleanQuery)
    return 'no'
  }
  
  // Check for alphanumeric style numbers (like ABC123, ST1010161, etc.)
  if (/^[A-Z0-9]{6,}$/i.test(cleanQuery) && !/\s/.test(cleanQuery)) {
    console.log('🔢 Detected as style number (alphanumeric):', cleanQuery)
    return 'no'
  }
  
  // Otherwise, treat as style name
  console.log('📝 Detected as style name:', cleanQuery)
  return 'name'
}

// Function to extract search parameters from user query
export function extractSearchParams(userQuery: string, entities: any): {
  searchQuery: string
  queryBy: 'no' | 'name'
  rowType: 'Stock' | 'Available' | 'PO Available'
  color?: string
  size?: string
  filterZeros?: boolean
} {
  console.log('🔍 Extracting search parameters from:', userQuery)
  console.log('📋 Entities:', entities)
  
  // Determine search query and type
  let searchQuery = ''
  let queryBy: 'no' | 'name' = 'name'
  
  if (entities.styleNumber) {
    searchQuery = entities.styleNumber
    queryBy = 'no'
    console.log('�� Using style number from entities:', searchQuery)
  } else if (entities.styleName) {
    searchQuery = entities.styleName
    queryBy = 'name'
    console.log('📝 Using style name from entities:', searchQuery)
  } else {
    // If no clear entities, try to extract from the query itself
    const words = userQuery.split(' ').filter(word => word.length > 0)
    
    // Look for potential style identifiers (words that could be style numbers or names)
    const potentialStyles = words.filter(word => {
      const clean = word.replace(/[^\w]/g, '') // Remove punctuation
      return clean.length >= 3 && clean.length <= 20 // Reasonable length for style identifiers
    })
    
    if (potentialStyles.length > 0) {
      // Use the first potential style identifier
      searchQuery = potentialStyles[0]
      queryBy = detectQueryType(searchQuery)
      console.log(`🔍 Extracted style from query: "${searchQuery}" (detected as ${queryBy === 'no' ? 'style number' : 'style name'})`)
    } else {
      // Fallback: use the entire query as a style name
      searchQuery = userQuery.trim()
      queryBy = 'name'
      console.log('📝 Using entire query as style name (fallback):', searchQuery)
    }
  }
  
  // Determine row type from the query context
  const rowType = determineRowType(userQuery)
  
  // Check for zero filter
  const filterZeros = detectZeroFilter(userQuery)
  
  const result = {
    searchQuery,
    queryBy,
    rowType,
    color: entities.color,
    size: entities.size,
    filterZeros
  }
  
  console.log('✅ Extracted search params:', result)
  return result
}

// Function to extract multiple search parameters for combined queries
export function extractMultipleSearchParams(userQuery: string, entities: any): {
  searchQuery: string
  queryBy: 'no' | 'name'
  rowTypes: ('Stock' | 'Available' | 'PO Available')[]
  color?: string
  size?: string
  filterZeros?: boolean
} {
  console.log('🔍 Extracting multiple search parameters from:', userQuery)
  console.log('📋 Entities:', entities)
  
  // Determine search query and type
  let searchQuery = ''
  let queryBy: 'no' | 'name' = 'name'
  
  if (entities.styleNumber) {
    searchQuery = entities.styleNumber
    queryBy = 'no'
    console.log('�� Using style number from entities:', searchQuery)
  } else if (entities.styleName) {
    searchQuery = entities.styleName
    queryBy = 'name'
    console.log('📝 Using style name from entities:', searchQuery)
  } else {
    // If no clear entities, try to extract from the query itself
    const words = userQuery.split(' ').filter(word => word.length > 0)
    
    // Look for potential style identifiers (words that could be style numbers or names)
    const potentialStyles = words.filter(word => {
      const clean = word.replace(/[^\w]/g, '') // Remove punctuation
      return clean.length >= 3 && clean.length <= 20 // Reasonable length for style identifiers
    })
    
    if (potentialStyles.length > 0) {
      // Use the first potential style identifier
      searchQuery = potentialStyles[0]
      queryBy = detectQueryType(searchQuery)
      console.log(`🔍 Extracted style from query: "${searchQuery}" (detected as ${queryBy === 'no' ? 'style number' : 'style name'})`)
    } else {
      // Fallback: use the entire query as a style name
      searchQuery = userQuery.trim()
      queryBy = 'name'
      console.log('📝 Using entire query as style name (fallback):', searchQuery)
    }
  }
  
  // Determine multiple row types from the query context
  const rowTypes = determineMultipleRowTypes(userQuery)
  
  // Check for zero filter
  const filterZeros = detectZeroFilter(userQuery)
  
  const result = {
    searchQuery,
    queryBy,
    rowTypes,
    color: entities.color,
    size: entities.size,
    filterZeros
  }
  
  console.log('✅ Extracted multiple search params:', result)
  return result
}

// Function to suggest alternative queries
export function suggestAlternatives(userQuery: string): string[] {
  const query = userQuery.toLowerCase()
  const suggestions: string[] = []
  
  if (query.includes('stock') || query.includes('inventory')) {
    suggestions.push('Try asking for "available stock" or "PO available stock"')
  }
  
  if (query.includes('available')) {
    suggestions.push('Try asking for "current stock" or "PO available stock"')
  }
  
  if (query.includes('po') || query.includes('purchase order')) {
    suggestions.push('Try asking for "current stock" or "available stock"')
  }
  
  return suggestions
}

// Function to detect if user wants to create a sales order
export function detectSalesOrderRequest(userQuery: string): boolean {
  const query = userQuery.toLowerCase()
  
  // Check for sales order creation patterns
  const hasCreateAction = SALES_ORDER_PATTERNS.create.some(word => query.includes(word))
  const hasOrderAction = SALES_ORDER_PATTERNS.order.some(word => query.includes(word))
  const hasCustomer = SALES_ORDER_PATTERNS.customer.some(word => query.includes(word))
  
  // Must have at least one create/order action and customer reference
  const isSalesOrderRequest = (hasCreateAction || hasOrderAction) && hasCustomer
  
  if (isSalesOrderRequest) {
    console.log('🛒 Detected sales order creation request')
  }
  
  return isSalesOrderRequest
}

// Function to extract sales order parameters from user query
export function extractSalesOrderParams(userQuery: string, entities: any): {
  country?: string
  customer?: string
  styleNumber?: string
  styleName?: string
  color?: string
  size?: string
  quantity?: number
} {
  const query = userQuery.toLowerCase()
  const params: any = {}
  
  console.log('🛒 Extracting sales order parameters from:', userQuery)
  console.log('📋 Entities:', entities)
  
  // Extract country from entities or query
  if (entities.country) {
    params.country = entities.country
  } else {
    // Try to find country in query
    const countries = ['denmark', 'norway', 'sweden', 'finland', 'germany', 'france', 'netherlands', 'united kingdom']
    const foundCountry = countries.find(country => query.includes(country))
    if (foundCountry) {
      params.country = foundCountry
    }
  }
  
  // Extract customer from entities or query
  if (entities.customer) {
    params.customer = entities.customer
  } else {
    // Try to find customer after "for" or "customer"
    const customerPatterns = ['for ', 'customer ', 'client ', 'buyer ']
    for (const pattern of customerPatterns) {
      const index = query.indexOf(pattern)
      if (index !== -1) {
        const afterPattern = query.substring(index + pattern.length)
        const words = afterPattern.split(' ').slice(0, 3) // Take up to 3 words
        if (words.length > 0) {
          params.customer = words.join(' ')
          break
        }
      }
    }
  }
  
  // Extract style information
  if (entities.style_number) {
    params.styleNumber = entities.style_number
  } else if (entities.style_name) {
    params.styleName = entities.style_name
  }
  
  // Extract color
  if (entities.color) {
    params.color = entities.color
  }
  
  // Extract size
  if (entities.size) {
    params.size = entities.size
  }
  
  // Extract quantity
  if (entities.quantity) {
    params.quantity = parseInt(entities.quantity)
  } else {
    // Try to find quantity in query
    const quantityMatch = query.match(/(\d+)\s*(pieces?|units?|qty|quantity|amount)/)
    if (quantityMatch) {
      params.quantity = parseInt(quantityMatch[1])
    }
  }
  
  console.log('🛒 Extracted sales order params:', params)
  return params
} 