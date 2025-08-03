import { classifyIntent } from './intentClassifier'
import { openStylePage } from '../openStylePage'
import { parseStock } from '../parseStock'
import { extractSearchParams, extractMultipleSearchParams, determineRowType, suggestAlternatives, detectSalesOrderRequest, extractSalesOrderParams } from './searchMapper'
import { recordQueryAttempt } from './feedbackSystem'
import { createSalesOrder } from '../createSalesOrder'

export interface ActionResponse {
  success: boolean
  message: string
  data?: any
  requiresClarification?: boolean
  clarificationQuestions?: string[]
  suggestions?: string[]
  feedbackId?: string // Add feedback ID for user ratings
  error?: string // Add error field for detailed error information
}

export interface StockCheckParams {
  styleNumber?: string
  styleName?: string
  color?: string
  size?: string
  rowType?: 'Stock' | 'Available' | 'PO Available'
}

export interface SalesOrderParams {
  country?: string
  customer?: string
  styleNumber?: string
  styleName?: string
  color?: string
  size?: string
  quantity?: number
  orderType?: 'Pre-order' | 'Stock'
}

// Helper function to filter out zero values from stock data
function filterZeroValues(stockData: any): any {
  const filtered: any = {}
  
  Object.entries(stockData).forEach(([color, colorData]: [string, any]) => {
    if (colorData.Total > 0) {
      filtered[color] = colorData
    }
  })
  
  return filtered
}

export async function handleStockCheck(params: StockCheckParams, originalQuery?: string): Promise<ActionResponse> {
  const startTime = Date.now()
  let feedbackId: string | undefined
  
  console.log('🔍 Stock Check Handler Starting...')
  console.log('📋 Input Parameters:', JSON.stringify(params, null, 2))
  console.log('💬 Original Query:', originalQuery)
  
  try {
    // Validate required parameters
    if (!params.styleNumber && !params.styleName) {
      console.log('❌ No style information provided')
      const response = {
        success: false,
        message: 'Please provide either a style number or style name to check stock.',
        requiresClarification: true,
        clarificationQuestions: [
          'What is the style number or name you want to check?',
          'Do you have a specific color or size in mind?'
        ]
      }
      
      // Record the failed attempt
      feedbackId = recordQueryAttempt(
        originalQuery || '',
        null,
        params,
        false,
        Date.now() - startTime,
        'No style information provided'
      )
      
      return { ...response, feedbackId }
    }

    // Check if this is a multi-type query (e.g., "stock and POs")
    const multiParams = extractMultipleSearchParams(
      originalQuery || '', 
      {
        styleNumber: params.styleNumber,
        styleName: params.styleName,
        color: params.color,
        size: params.size
      }
    )
    
    // Override with explicit rowType if provided
    if (params.rowType) {
      multiParams.rowTypes = [params.rowType]
      console.log('🎯 Using explicit row type:', params.rowType)
    }

    console.log('🚀 Final search parameters:', multiParams)
    console.log('🎯 Target row types for parsing:', multiParams.rowTypes)
    console.log('🎯 Zero filter enabled:', multiParams.filterZeros)
    
    // If multiple row types requested, fetch all of them
    if (multiParams.rowTypes.length > 1) {
      console.log('🔄 Multi-type query detected, fetching all requested data types...')
      return await handleMultiTypeStockCheck(multiParams, originalQuery, startTime)
    }
    
    // Single type query - use existing logic
    const searchParams = {
      searchQuery: multiParams.searchQuery,
      queryBy: multiParams.queryBy,
      rowType: multiParams.rowTypes[0],
      color: multiParams.color,
      size: multiParams.size,
      filterZeros: multiParams.filterZeros
    }
    
    console.log('🎯 Single type query, target row type:', searchParams.rowType)
    
    // Call the scraper with the determined parameters
    const html = await openStylePage({
      query: searchParams.searchQuery,
      queryBy: searchParams.queryBy,
      credentials: {
        username: process.env.SPY_USER || '',
        password: process.env.SPY_PASS || ''
      }
    })

    if (!html) {
      console.log('❌ No HTML content returned from scraper')
      const suggestions = suggestAlternatives(originalQuery || '')
      const response = {
        success: false,
        message: `No results found for "${searchParams.searchQuery}". Please check the style ${searchParams.queryBy === 'no' ? 'number' : 'name'} and try again.`,
        suggestions
      }
      
      // Record the failed attempt
      feedbackId = recordQueryAttempt(
        originalQuery || '',
        null,
        searchParams,
        false,
        Date.now() - startTime,
        'No HTML content returned from scraper'
      )
      
      return { ...response, feedbackId }
    }

    console.log('✅ HTML content received, parsing stock data...')
    console.log('🎯 Parsing with row type:', searchParams.rowType)

    // Parse the stock data with the determined row type
    const stockData = parseStock(html, searchParams.rowType)

    if (!stockData || Object.keys(stockData).length === 0) {
      console.log('❌ No stock data parsed from HTML')
      const suggestions = suggestAlternatives(originalQuery || '')
      const response = {
        success: false,
        message: `No ${searchParams.rowType.toLowerCase()} data found for "${searchParams.searchQuery}". Please check the style ${searchParams.queryBy === 'no' ? 'number' : 'name'} and try again.`,
        suggestions
      }
      
      // Record the failed attempt
      feedbackId = recordQueryAttempt(
        originalQuery || '',
        null,
        searchParams,
        false,
        Date.now() - startTime,
        'No stock data parsed from HTML'
      )
      
      return { ...response, feedbackId }
    }

    console.log('📊 Raw Stock Data:', JSON.stringify(stockData, null, 2))

    // Apply zero filter if requested
    let processedData = stockData
    if (searchParams.filterZeros) {
      console.log('🎯 Applying zero filter...')
      processedData = filterZeroValues(stockData)
      console.log(`✅ Filtered from ${Object.keys(stockData).length} to ${Object.keys(processedData).length} colors`)
    }

    // If a specific color was requested, filter the results
    let filteredData = processedData
    if (searchParams.color) {
      console.log('🎨 Filtering by color:', searchParams.color)
      const colorKey = Object.keys(processedData).find(color => 
        color.toLowerCase().includes(searchParams.color!.toLowerCase())
      )
      
      if (colorKey) {
        filteredData = { [colorKey]: processedData[colorKey] }
        console.log('✅ Color found:', colorKey)
      } else {
        console.log('❌ Color not found, available colors:', Object.keys(processedData))
        const suggestions = suggestAlternatives(originalQuery || '')
        const response = {
          success: false,
          message: `Color "${searchParams.color}" not found for style "${searchParams.searchQuery}". Available colors: ${Object.keys(processedData).join(', ')}`,
          data: processedData, // Still return all data so user can see available colors
          suggestions
        }
        
        // Record the failed attempt
        feedbackId = recordQueryAttempt(
          originalQuery || '',
          null,
          searchParams,
          false,
          Date.now() - startTime,
          'Color not found'
        )
        
        return { ...response, feedbackId }
      }
    }

    // Create a more descriptive message based on the row type
    const rowTypeDescriptions = {
      'Stock': 'current stock levels',
      'Available': 'available stock for sale',
      'PO Available': 'stock available on purchase orders'
    }
    
    const rowDescription = rowTypeDescriptions[searchParams.rowType]
    let resultMessage = searchParams.color 
      ? `Found ${rowDescription} for "${searchParams.searchQuery}" in color "${searchParams.color}":`
      : `Found ${rowDescription} for "${searchParams.searchQuery}":`
    
    // Add zero filter info to message
    if (searchParams.filterZeros) {
      resultMessage += ' (showing only colors with stock)'
    }

    console.log('✅ Stock Check Complete:', { resultMessage, dataKeys: Object.keys(filteredData) })

    // Record the successful attempt
    feedbackId = recordQueryAttempt(
      originalQuery || '',
      null,
      searchParams,
      true,
      Date.now() - startTime,
      undefined,
      filteredData
    )

    return {
      success: true,
      message: resultMessage,
      data: filteredData,
      feedbackId
    }
  } catch (error) {
    console.error('❌ Error in stock check:', error)
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to check stock. Please try again or contact support.'
    
    if (error instanceof Error) {
      if (error.message.includes('row type')) {
        errorMessage = `The requested stock type is not available. ${error.message}`
      } else if (error.message.includes('timeout')) {
        errorMessage = 'The system took too long to respond. Please try again.'
      } else if (error.message.includes('not found')) {
        errorMessage = `No results found. ${error.message}`
      }
    }
    
    const suggestions = suggestAlternatives(originalQuery || '')
    
    // Record the failed attempt
    feedbackId = recordQueryAttempt(
      originalQuery || '',
      null,
      params,
      false,
      Date.now() - startTime,
      errorMessage
    )
    
    return {
      success: false,
      message: errorMessage,
      suggestions,
      feedbackId
    }
  }
}

// New function to handle multi-type stock checks
async function handleMultiTypeStockCheck(
  multiParams: {
    searchQuery: string
    queryBy: 'no' | 'name'
    rowTypes: ('Stock' | 'Available' | 'PO Available')[]
    color?: string
    size?: string
    filterZeros?: boolean
  },
  originalQuery?: string,
  startTime?: number
): Promise<ActionResponse> {
  const actualStartTime = startTime || Date.now()
  let feedbackId: string | undefined
  
  console.log('🔄 Handling multi-type stock check for:', multiParams.rowTypes)
  
  try {
    // Fetch the HTML once (since it's the same page for all row types)
    const html = await openStylePage({
      query: multiParams.searchQuery,
      queryBy: multiParams.queryBy,
      credentials: {
        username: process.env.SPY_USER || '',
        password: process.env.SPY_PASS || ''
      }
    })

    if (!html) {
      console.log('❌ No HTML content returned from scraper')
      const suggestions = suggestAlternatives(originalQuery || '')
      const response = {
        success: false,
        message: `No results found for "${multiParams.searchQuery}". Please check the style ${multiParams.queryBy === 'no' ? 'number' : 'name'} and try again.`,
        suggestions
      }
      
      // Record the failed attempt
      feedbackId = recordQueryAttempt(
        originalQuery || '',
        null,
        multiParams,
        false,
        Date.now() - actualStartTime,
        'No HTML content returned from scraper'
      )
      
      return { ...response, feedbackId }
    }

    console.log('✅ HTML content received, parsing multiple data types...')

    // Parse data for each requested row type
    const allData: Record<string, any> = {}
    const successfulTypes: string[] = []
    const failedTypes: string[] = []

    for (const rowType of multiParams.rowTypes) {
      try {
        console.log(`🎯 Parsing ${rowType} data...`)
        const stockData = parseStock(html, rowType)
        
        if (stockData && Object.keys(stockData).length > 0) {
          // Apply zero filter if requested
          let processedData = stockData
          if (multiParams.filterZeros) {
            console.log(`🎯 Applying zero filter to ${rowType}...`)
            processedData = filterZeroValues(stockData)
            console.log(`✅ Filtered ${rowType} from ${Object.keys(stockData).length} to ${Object.keys(processedData).length} colors`)
          }
          
          allData[rowType] = processedData
          successfulTypes.push(rowType)
          console.log(`✅ Successfully parsed ${rowType} data`)
        } else {
          failedTypes.push(rowType)
          console.log(`⚠️ No data found for ${rowType}`)
        }
      } catch (error) {
        console.log(`❌ Error parsing ${rowType} data:`, error)
        failedTypes.push(rowType)
      }
    }

    if (Object.keys(allData).length === 0) {
      console.log('❌ No data could be parsed for any requested types')
      const suggestions = suggestAlternatives(originalQuery || '')
      const response = {
        success: false,
        message: `No data found for any of the requested types (${multiParams.rowTypes.join(', ')}) for "${multiParams.searchQuery}".`,
        suggestions
      }
      
      // Record the failed attempt
      feedbackId = recordQueryAttempt(
        originalQuery || '',
        null,
        multiParams,
        false,
        Date.now() - actualStartTime,
        'No data could be parsed for any requested types'
      )
      
      return { ...response, feedbackId }
    }

    console.log('📊 Multi-type data collected:', Object.keys(allData))

    // Create a comprehensive message
    const rowTypeDescriptions: Record<string, string> = {
      'Stock': 'current stock',
      'Available': 'available stock',
      'PO Available': 'purchase order stock'
    }
    
    const successfulDescriptions = successfulTypes.map(type => rowTypeDescriptions[type])
    let resultMessage = `Found ${successfulDescriptions.join(' and ')} for "${multiParams.searchQuery}":`
    
    // Add zero filter info to message
    if (multiParams.filterZeros) {
      resultMessage += ' (showing only colors with stock)'
    }

    if (failedTypes.length > 0) {
      console.log(`⚠️ Some types failed: ${failedTypes.join(', ')}`)
    }

    console.log('✅ Multi-type Stock Check Complete:', { 
      resultMessage, 
      successfulTypes, 
      failedTypes,
      dataKeys: Object.keys(allData) 
    })

    // Record the successful attempt
    feedbackId = recordQueryAttempt(
      originalQuery || '',
      null,
      multiParams,
      true,
      Date.now() - actualStartTime,
      undefined,
      allData
    )

    return {
      success: true,
      message: resultMessage,
      data: allData,
      feedbackId
    }
  } catch (error) {
    console.error('❌ Error in multi-type stock check:', error)
    const suggestions = suggestAlternatives(originalQuery || '')
    
    // Record the failed attempt
    feedbackId = recordQueryAttempt(
      originalQuery || '',
      null,
      multiParams,
      false,
      Date.now() - actualStartTime,
      'Error in multi-type stock check'
    )
    
    return {
      success: false,
      message: 'Failed to check multiple stock types. Please try again or contact support.',
      suggestions,
      feedbackId
    }
  }
}

export async function handleSalesOrder(params: SalesOrderParams, originalQuery?: string): Promise<ActionResponse> {
  const startTime = Date.now()
  let feedbackId: string | undefined
  
  console.log('🛒 Sales Order Handler Starting...')
  console.log('📋 Input Parameters:', JSON.stringify(params, null, 2))
  console.log('💬 Original Query:', originalQuery)
  
  try {
    // Enhanced customer validation with lookup support
    const { findCustomer } = await import('./customerLookup')
    
    // Validate required parameters with enhanced customer handling
    const missingFields = []
    if (!params.country) missingFields.push('country')
    
    // Customer validation with smart lookup
    let validatedCustomer = params.customer
    let customerSuggestions: Array<{id: string, name: string, confidence: number}> = []
    
    if (!params.customer) {
      missingFields.push('customer')
    } else {
      // Validate customer exists in our database
      console.log('🔍 Validating customer in database...')
      
      try {
        const customerLookup = await findCustomer(params.customer)
        
        if (customerLookup.exactMatch) {
          validatedCustomer = customerLookup.exactMatch.name
          console.log(`✅ Exact customer match found: ${validatedCustomer}`)
        } else if (customerLookup.confidence > 0.7 && customerLookup.suggestions.length > 0) {
          validatedCustomer = customerLookup.suggestions[0].name
          customerSuggestions = customerLookup.suggestions.slice(0, 3).map((customer, index) => ({
            id: customer.id,
            name: customer.name,
            confidence: customerLookup.confidence - (index * 0.1)
          }))
          console.log(`🎯 High confidence customer match: ${validatedCustomer}`)
        } else if (customerLookup.suggestions.length > 0) {
          // Lower confidence - ask for clarification
          customerSuggestions = customerLookup.suggestions.slice(0, 5).map((customer, index) => ({
            id: customer.id,
            name: customer.name,
            confidence: Math.max(0.5 - (index * 0.1), 0.1)
          }))
          
          const suggestionsList = customerSuggestions.map((c, i) => `${i + 1}. ${c.name}`).join('\n')
          
          const response = {
            success: false,
            message: `I found multiple customers similar to "${params.customer}". Which one did you mean?`,
            requiresClarification: true,
            clarificationQuestions: [
              suggestionsList,
              'Please specify which customer you meant, or provide the exact customer name.'
            ],
            suggestions: customerSuggestions.map(c => c.name)
          }
          
          feedbackId = recordQueryAttempt(
            originalQuery || '',
            'sales_order',
            params,
            false,
            Date.now() - startTime,
            'Customer ambiguous - multiple matches found'
          )
          
          return { ...response, feedbackId }
        } else {
          console.log(`❌ No customer found matching "${params.customer}"`)
          missingFields.push('valid customer name')
        }
      } catch (lookupError) {
        console.warn('⚠️ Customer lookup failed, proceeding with original value:', lookupError)
      }
    }

    if (missingFields.length > 0) {
      const clarificationQuestions = []
      
      if (missingFields.includes('country')) {
        clarificationQuestions.push('What country should the order be for?')
      }
      
      if (missingFields.includes('customer')) {
        clarificationQuestions.push('What customer should the order be for?')
      } else if (missingFields.includes('valid customer name')) {
        clarificationQuestions.push(`I couldn't find a customer named "${params.customer}". Please provide the exact customer name or run a customer sync to update the database.`)
      }
      
      const response = {
        success: false,
        message: `Please provide the following information: ${missingFields.join(', ')}`,
        requiresClarification: true,
        clarificationQuestions
      }
      
      // Record the failed attempt
      feedbackId = recordQueryAttempt(
        originalQuery || '',
        'sales_order',
        params,
        false,
        Date.now() - startTime,
        `Missing required fields: ${missingFields.join(', ')}`
      )
      
      return { ...response, feedbackId }
    }

    // Get credentials from environment
    const username = process.env.SPY_USER
    const password = process.env.SPY_PASS
    
    if (!username || !password) {
      const response = {
        success: false,
        message: 'System credentials not configured. Please create a .env.local file with SPY_USER and SPY_PASS environment variables. See env.example for the required format.'
      }
      
      feedbackId = recordQueryAttempt(
        originalQuery || '',
        'sales_order',
        params,
        false,
        Date.now() - startTime,
        'System credentials not configured'
      )
      
      return { ...response, feedbackId }
    }

    console.log('🚀 Creating sales order...')
    
    // Create the sales order with validated parameters
    const salesOrderParams = {
      country: params.country!,
      customer: validatedCustomer!, // Use the validated customer name
      styleNumber: params.styleNumber,
      styleName: params.styleName,
      color: params.color,
      size: params.size,
      quantity: params.quantity,
      orderType: params.orderType
    }
    
    console.log(`📋 Using validated customer: "${validatedCustomer}"`)
    if (customerSuggestions.length > 0) {
      console.log(`🎯 Customer suggestions available: ${customerSuggestions.length}`)
    }
    
    const result = await createSalesOrder(salesOrderParams, { username, password })
    
    if (result.success) {
      console.log('✅ Sales order creation successful')
      
      // Record the successful attempt
      feedbackId = recordQueryAttempt(
        originalQuery || '',
        'sales_order',
        params,
        true,
        Date.now() - startTime,
        undefined,
        result
      )
      
      return {
        success: true,
        message: result.message,
        data: {
          orderType: result.orderType,
          styleMapping: result.styleMapping,
          nextStep: 'Order type selection dialog reached successfully'
        },
        feedbackId
      }
    } else {
      console.log('❌ Sales order creation failed:', result.error)
      
      // Record the failed attempt
      feedbackId = recordQueryAttempt(
        originalQuery || '',
        'sales_order',
        params,
        false,
        Date.now() - startTime,
        result.error
      )
      
      return {
        success: false,
        message: result.message,
        error: result.error,
        feedbackId
      }
    }

  } catch (error) {
    console.error('❌ Error in sales order creation:', error)
    
    // Record the failed attempt
    feedbackId = recordQueryAttempt(
      originalQuery || '',
      'sales_order',
      params,
      false,
      Date.now() - startTime,
      'Error in sales order creation'
    )
    
    return {
      success: false,
      message: 'Failed to create sales order. Please try again or contact support.',
      error: error instanceof Error ? error.message : 'Unknown error',
      feedbackId
    }
  }
}

export async function handleB2BLogin(params: any): Promise<ActionResponse> {
  // TODO: Implement B2B login management
  return {
    success: false,
    message: 'B2B login management is not yet implemented.',
    requiresClarification: false
  }
}

export async function handleInventoryUpdate(params: any): Promise<ActionResponse> {
  // TODO: Implement inventory updates
  return {
    success: false,
    message: 'Inventory updates are not yet implemented.',
    requiresClarification: false
  }
}

export async function handleReportGeneration(params: any): Promise<ActionResponse> {
  // TODO: Implement report generation
  return {
    success: false,
    message: 'Report generation is not yet implemented.',
    requiresClarification: false
  }
}

export async function handleUnknownAction(intent: any, originalQuery?: string): Promise<ActionResponse> {
  console.log('❓ Unknown action type detected:', intent.type)
  console.log('📋 Intent data:', JSON.stringify(intent, null, 2))
  
  // Try to interpret as stock check if it seems like a stock-related query
  const query = originalQuery?.toLowerCase() || ''
  if (query.includes('stock') || query.includes('inventory') || query.includes('available') || query.includes('po') || query.includes('purchase')) {
    console.log('🔄 Attempting to handle as stock check...')
    return await handleStockCheck(intent.entities, originalQuery)
  }
  
  return {
    success: false,
    message: `I'm not sure how to handle "${intent.type}". Please try rephrasing your request.`,
    suggestions: [
      'Try: "Check stock for [style]"',
      'Try: "Show available stock for [style]"', 
      'Try: "Check PO available for [style]"',
      'Try: "Create order for [style]"'
    ]
  }
}

export async function executeAction(intent: any, originalQuery?: string): Promise<ActionResponse> {
  console.log('🎯 Executing action:', intent.type)
  
  switch (intent.type) {
    case 'stock_check':
      return await handleStockCheck(intent.entities, originalQuery)
    case 'sales_order':
      return await handleSalesOrder(intent.entities, originalQuery)
    case 'b2b_login':
      return await handleB2BLogin(intent.entities)
    case 'inventory_update':
      return await handleInventoryUpdate(intent.entities)
    case 'report_generate':
      return await handleReportGeneration(intent.entities)
    default:
      return await handleUnknownAction(intent, originalQuery)
  }
} 