import OpenAI from 'openai'
import { extractCustomerFromQuery, findCustomer } from './customerLookup'

interface Intent {
  type: 'stock_check' | 'sales_order' | 'b2b_login' | 'inventory_update' | 'report_generate'
  confidence: number
  entities: {
    styleNumber?: string
    styleName?: string
    color?: string
    size?: string
    customer?: string
    customerSuggestions?: Array<{id: string, name: string, confidence: number}>
    country?: string
    quantity?: number
    [key: string]: any
  }
  action: string
  parameters: Record<string, any>
  analysis?: {
    reasoning: string
    context: string
  }
}

interface ConversationHistory {
  userQuery: string
  aiResponse: any
  timestamp: Date
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function classifyIntent(
  userQuery: string, 
  conversationHistory: ConversationHistory[] = []
): Promise<Intent> {
  
  console.log('🤖 AI Intent Classification Starting...')
  console.log('📝 User Query:', userQuery)
  
  const historyContext = conversationHistory
    .slice(-5) // Last 5 conversations
    .map(c => `User: "${c.userQuery}" → AI: ${JSON.stringify(c.aiResponse)}`)
    .join('\n')

  const prompt = `
You are a business operations assistant for a fashion inventory system. Analyze this user query: "${userQuery}"

CONTEXT ANALYSIS:
- Look at the FULL phrase, not just individual words
- Consider natural language patterns like "Check stock for [item]"
- Style numbers are typically short codes used in technical contexts
- Style names are descriptive terms used in conversational contexts

AVAILABLE OPERATIONS:
- stock_check: Check inventory levels (includes current stock, available stock, and PO available stock)
- sales_order: Create sales orders (requires country and customer)
- b2b_login: Manage B2B accounts
- inventory_update: Update stock levels
- report_generate: Generate reports

SALES ORDER DETECTION:
- Look for phrases like "create order", "make order", "start order", "new order"
- Must include customer information (after "for", "customer", "client")
- May include country information (after "in", "from", "country")
- Examples: "Create order for ABC Corp in Denmark", "Make sales order for customer XYZ"

SEASON CODE DETECTION:
- Fashion items often include season codes like ".ea25", ".es24", ".hs25", etc.
- Common season prefixes: ea (Early Autumn), es (Early Spring), hs (High Summer), ss (Spring/Summer), fw (Fall/Winter), aw (Autumn/Winter), sp (Spring), su (Summer), fa (Fall), wi (Winter)
- Year codes are typically 2-digit years (24, 25, 26, etc.)
- Examples: "naomi.ea25", "style.es24", "product.hs25"
- When season codes are detected, treat the entire identifier as a styleName

ENTITY EXTRACTION RULES:
1. styleNumber: Technical codes (1-10 chars, no spaces, often uppercase)
   Examples: "ABC123", "1010191", "RANY" (when used as a technical code)
   
2. styleName: Descriptive names (contains spaces, conversational) OR style names with season codes
   Examples: "Classic Denim", "Summer Dress", "RANY", "naomi.ea25", "style.es24"
   
3. color: Color terms like "WHITE", "BLACK", "BLUE"
4. size: Size numbers like "34", "36", "38", "100"
5. customer: Customer names like "ABC Corp", "XYZ Company" (for sales orders)
6. country: Country names like "Denmark", "Norway", "Sweden" (for sales orders)
7. quantity: Numbers for orders like "50", "100"

STYLE IDENTIFICATION GUIDELINES:
- For queries like "check stock for RANY" or "stock for RANY" → RANY is a styleName
- For queries like "RANY stock" or "RANY inventory" → RANY is a styleName  
- For queries like "style RANY" or "RANY style" → RANY is a styleName
- For queries like "RANY" alone → RANY is a styleName (conversational context)
- For queries with season codes like "naomi.ea25" → treat as styleName
- Only use styleNumber for clear technical codes like "1010161", "ABC123", etc.
- When in doubt, prefer styleName over styleNumber for conversational queries

ANALYSIS PROCESS:
1. First, determine the intent type
2. Then extract entities, considering context
3. For style identification, consider:
   - Is it used conversationally? → styleName
   - Is it used technically? → styleNumber
   - Does it contain season codes? → styleName
   - Does it appear in phrases like "Check stock for [item]"? → likely styleName
   - Does it appear alone or with technical context? → likely styleNumber
   - For short words like "RANY" in conversational context → styleName

IMPORTANT: 
- All stock-related queries (current stock, available stock, PO available, purchase orders) should be classified as "stock_check"
- Sales order creation requires both customer and country information
- The specific type of stock data will be determined by the search mapper based on the query context

Respond with ONLY valid JSON:
{
  "type": "intent_type",
  "confidence": 0.0-1.0,
  "entities": {
    "styleNumber": "extracted style number or null",
    "styleName": "extracted style name or null", 
    "color": "extracted color or null",
    "size": "extracted size or null",
    "customer": "extracted customer name or null",
    "country": "extracted country name or null",
    "quantity": "extracted quantity number or null"
  },
  "action": "specific action description",
  "parameters": {
    "additional parameters if any"
  },
  "analysis": {
    "reasoning": "explain your reasoning for the classification",
    "context": "what context clues led to your decision"
  }
}
`

  try {
    console.log('🔍 Sending query to OpenAI for analysis...')
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a business operations assistant. Analyze user queries carefully and provide detailed reasoning. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 800,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    console.log('📊 Raw OpenAI Response:', response)

    // Clean the response to ensure it's valid JSON
    const cleanedResponse = response.trim().replace(/```json\n?|\n?```/g, '')
    const intent = JSON.parse(cleanedResponse)

    console.log('✅ Parsed Intent:', JSON.stringify(intent, null, 2))

    // Validate the intent structure
    if (!intent.type || !intent.confidence) {
      throw new Error('Invalid intent structure returned from AI')
    }

    // Enhanced customer processing for sales orders
    if (intent.type === 'sales_order' && intent.entities.customer) {
      console.log('🔍 Enhancing sales order with customer lookup...')
      
      try {
        // Extract and validate customer from the query
        const customerExtraction = await extractCustomerFromQuery(userQuery)
        
        if (customerExtraction.confidence > 0.7) {
          // High confidence customer match
          intent.entities.customer = customerExtraction.detectedCustomer
          intent.entities.customerSuggestions = customerExtraction.suggestions.slice(0, 3).map(customer => ({
            id: customer.id,
            name: customer.name,
            confidence: customerExtraction.confidence
          }))
          
          console.log(`✅ Enhanced customer entity: "${intent.entities.customer}" (confidence: ${customerExtraction.confidence.toFixed(2)})`)
        } else if (customerExtraction.suggestions.length > 0) {
          // Lower confidence - provide suggestions
          intent.entities.customerSuggestions = customerExtraction.suggestions.slice(0, 5).map((customer, index) => ({
            id: customer.id,
            name: customer.name,
            confidence: Math.max(0.5 - (index * 0.1), 0.1) // Decreasing confidence for ranking
          }))
          
          console.log(`🔍 Customer suggestions provided for "${intent.entities.customer}"`)
        } else {
          console.log('❌ No customer matches found in lookup database')
        }
      } catch (customerError) {
        console.warn('⚠️ Customer lookup failed, continuing with original entity:', customerError)
      }
    }

    // Post-process to ensure styleNumber and styleName are properly differentiated
    if (intent.entities.styleNumber && intent.entities.styleName) {
      console.log('⚠️ Both styleNumber and styleName detected, applying conflict resolution...')
      
      // If both are present, determine which is more likely based on format
      const styleNumberPattern = /^[A-Z0-9]{1,10}$/ // Short alphanumeric codes
      const styleNamePattern = /\s/ // Contains spaces
      
      if (styleNumberPattern.test(intent.entities.styleNumber) && styleNamePattern.test(intent.entities.styleName)) {
        console.log('✅ Both entities look correctly formatted, keeping both')
      } else if (styleNumberPattern.test(intent.entities.styleNumber)) {
        console.log('🔄 Clearing styleName as styleNumber looks correct')
        intent.entities.styleName = undefined
      } else if (styleNamePattern.test(intent.entities.styleName)) {
        console.log('🔄 Clearing styleNumber as styleName looks correct')
        intent.entities.styleNumber = undefined
      }
    }

    // Check for season codes in extracted entities
    if (intent.entities.styleNumber) {
      const { detectSeasonCode } = await import('./searchMapper')
      const seasonDetection = detectSeasonCode(intent.entities.styleNumber)
      if (seasonDetection.hasSeason) {
        console.log('🌱 Season code detected in styleNumber, converting to styleName')
        intent.entities.styleName = intent.entities.styleNumber
        intent.entities.styleNumber = undefined
      }
    }

    if (intent.entities.styleName) {
      const { detectSeasonCode } = await import('./searchMapper')
      const seasonDetection = detectSeasonCode(intent.entities.styleName)
      if (seasonDetection.hasSeason) {
        console.log('🌱 Season code confirmed in styleName:', seasonDetection.seasonCode)
      }
    }

    console.log('🎯 Final Intent Classification Complete')
    console.log('📋 Final Entities:', intent.entities)
    console.log('🧠 AI Reasoning:', intent.analysis?.reasoning || 'No reasoning provided')

    return intent
  } catch (error) {
    console.error('❌ Error in AI classification:', error)
    
    // Import the detectQueryType function for better fallback logic
    const { detectQueryType } = await import('./searchMapper')
    
    // Fallback logic to detect style number vs name
    console.log('🔄 Using fallback logic...')
    const words = userQuery.split(' ').filter(word => word.length > 0)
    let styleNumber = undefined
    let styleName = undefined
    
    // Look for potential style identifiers
    const potentialStyles = words.filter(word => {
      const clean = word.replace(/[^\w]/g, '') // Remove punctuation
      return clean.length >= 3 && clean.length <= 20 // Reasonable length for style identifiers
    })
    
    if (potentialStyles.length > 0) {
      const detectedStyle = potentialStyles[0]
      
      // Check for season codes first
      const { detectSeasonCode } = await import('./searchMapper')
      const seasonDetection = detectSeasonCode(detectedStyle)
      if (seasonDetection.hasSeason) {
        styleName = detectedStyle
        console.log('🌱 Fallback detected styleName with season code:', styleName)
      } else {
        const queryType = detectQueryType(detectedStyle)
        
        if (queryType === 'no') {
          styleNumber = detectedStyle
          console.log('🔢 Fallback detected styleNumber:', styleNumber)
        } else {
          styleName = detectedStyle
          console.log('📝 Fallback detected styleName:', styleName)
        }
      }
    } else if (words.length > 1) {
      // If multiple words, treat as style name
      styleName = words.slice(0, 2).join(' ') // Take first two words as style name
      console.log('📝 Fallback detected styleName (multi-word):', styleName)
    }
    
    // Fallback to stock check if AI fails
    const fallbackIntent: Intent = {
      type: 'stock_check',
      confidence: 0.5,
      entities: {
        styleNumber: styleNumber,
        styleName: styleName,
        color: undefined,
        size: undefined,
        customer: undefined,
        country: undefined,
        quantity: undefined
      },
      action: 'Check stock levels (fallback)',
      parameters: {},
      analysis: {
        reasoning: 'AI classification failed, using intelligent fallback logic',
        context: 'Fallback detected using detectQueryType function'
      }
    }
    
    console.log('🔄 Fallback Intent:', JSON.stringify(fallbackIntent, null, 2))
    return fallbackIntent
  }
}

export async function processClarification(
  currentIntent: Intent,
  userResponse: string
): Promise<Intent> {
  
  const prompt = `
Based on the user's clarification: "${userResponse}"

Update this intent:
${JSON.stringify(currentIntent, null, 2)}

Respond with the updated intent as JSON, incorporating the clarification.
`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a business operations assistant. Update the intent based on user clarification."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    const cleanedResponse = response.trim().replace(/```json\n?|\n?```/g, '')
    return JSON.parse(cleanedResponse)
  } catch (error) {
    console.error('Error processing clarification:', error)
    return currentIntent
  }
} 