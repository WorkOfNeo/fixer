import { chromium, Browser, Page } from 'playwright'
import { findCustomer, CustomerMatch } from './customerMapping'
import { performLogin, Credentials } from './auth/dynamicLogin'

interface SalesOrderParams {
  country: string
  customer: string
  styleNumber?: string
  styleName?: string
  color?: string
  size?: string
  quantity?: number
  orderType?: 'Pre-order' | 'Stock'
}

interface SalesOrderResult {
  success: boolean
  message: string
  orderType?: 'Pre-order' | 'Stock'
  styleMapping?: {
    style: string
    color: string
    detectedOrderType?: 'Pre-order' | 'Stock'
  }
  error?: string
}

export async function createSalesOrder(params: SalesOrderParams, credentials: Credentials): Promise<SalesOrderResult> {
  let browser: Browser | null = null
  let page: Page | null = null

  try {
    console.log('🚀 Starting sales order creation...')
    console.log('📋 Order parameters:', JSON.stringify(params, null, 2))

    browser = await chromium.launch({ headless: true })
    page = await browser.newPage()

    // Step 1: Login using dynamic login
    console.log('🔐 Logging in...')
    await performLogin(page, {
      credentials,
      action: 'sales_order'
    })

    // Step 2: Navigate to sales order page
    console.log('📝 Navigating to sales order page...')
    await page.goto('https://2-biz.spysystem.dk/s_orders.php?mode=NewOrder')
    
    // Wait for the form to load
    await page.waitForSelector('select[name="country_id"]', { timeout: 10000 })
    console.log('✅ Sales order form loaded')

    // Step 3: Select country
    console.log('🌍 Selecting country:', params.country)
    await selectCountry(page, params.country)
    
    // Wait for customer dropdown to be populated after country selection
    console.log('⏳ Waiting for customer dropdown to populate...')
    await page.waitForTimeout(2000) // Wait 2 seconds for dropdown to populate

    // Step 4: Select customer
    console.log('👤 Selecting customer:', params.customer)
    await selectCustomer(page, params.customer, params.country)
    
    // Wait a bit before clicking continue
    console.log('⏳ Waiting before clicking continue...')
    await page.waitForTimeout(1000)

    // Step 5: Click Continue button
    console.log('➡️ Clicking Continue button...')
    await page.click('button[name="btnCreate"]')

    // Step 6: Wait for order type dialog
    console.log('⏳ Waiting for order type dialog...')
    try {
      await page.waitForSelector('#orderTypeConfirm', { timeout: 5000 })
      console.log('✅ Order type dialog appeared')
      
      // Record the style mapping for future reference
      const styleMapping = {
        style: params.styleName || params.styleNumber || 'Unknown',
        color: params.color || 'Unknown',
        detectedOrderType: undefined as 'Pre-order' | 'Stock' | undefined
      }

      // For now, just record that we reached this point
      // In the future, we'll implement automatic order type selection
      console.log('📊 Style mapping recorded:', styleMapping)

      return {
        success: true,
        message: 'Successfully reached order type selection dialog',
        styleMapping,
        orderType: params.orderType
      }

    } catch (error) {
      console.log('❌ Order type dialog did not appear')
      return {
        success: false,
        message: 'Failed to reach order type selection dialog',
        error: 'Order type dialog not found'
      }
    }

  } catch (error) {
    console.error('❌ Error in sales order creation:', error)
    return {
      success: false,
      message: 'Failed to create sales order',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  } finally {
    if (page) await page.close()
    if (browser) await browser.close()
  }
}

async function selectCountry(page: Page, countryName: string): Promise<void> {
  // Map country names to their IDs based on the select options
  const countryMap: Record<string, string> = {
    'denmark': '1',
    'faroe islands': '7',
    'finland': '8',
    'france': '11',
    'germany': '12',
    'greenland': '16',
    'iceland': '14',
    'ireland': '17',
    'netherlands': '9',
    'norway': '2',
    'romania': '15',
    'spain': '18',
    'sweden': '4',
    'united kingdom': '13'
  }

  const countryId = countryMap[countryName.toLowerCase()]
  if (!countryId) {
    throw new Error(`Country "${countryName}" not found in available options`)
  }

  await page.selectOption('select[name="country_id"]', countryId)
  console.log(`✅ Selected country: ${countryName} (ID: ${countryId})`)
}

async function selectCustomer(page: Page, customerName: string, country?: string): Promise<void> {
  console.log('🔍 Looking for customer:', customerName)
  
  // Use the customer mapping system to find the customer
  const customerMatch = findCustomer(customerName, country)
  
  if (!customerMatch) {
    throw new Error(`Customer "${customerName}" not found in customer mappings`)
  }
  
  console.log(`✅ Found customer: ${customerMatch.customer.customerName} (ID: ${customerMatch.customer.customerId}, confidence: ${customerMatch.confidence})`)
  
  // Wait for customer dropdown to be present and populated
  console.log('⏳ Waiting for customer dropdown to load...')
  await page.waitForSelector('select[name="customer_id"]', { timeout: 10000 })
  
  // Wait for options to be populated (not just the "Select" option)
  console.log('⏳ Waiting for customer options to populate...')
  try {
    await page.waitForSelector('select[name="customer_id"] option:not([value="0"])', { timeout: 15000 })
  } catch (error) {
    console.log('⚠️ Customer options not found within timeout, trying alternative approach...')
    // If the specific selector doesn't work, wait a bit more and try to get all options
    await page.waitForTimeout(3000)
  }
  
  // Get all customer options to verify our mapping
  console.log('📋 Getting customer options from dropdown...')
  const customerOptions = await page.$$eval('select[name="customer_id"] option', (options) => {
    return options.map(option => ({
      value: option.getAttribute('value'),
      text: option.textContent?.trim(),
      blocked: option.hasAttribute('blocked')
    })).filter(option => 
      option.value !== null && 
      option.value !== '0' && 
      option.text !== undefined && 
      !option.blocked
    ).map(option => ({
      value: option.value!,
      text: option.text!
    }))
  })

  console.log(`📊 Found ${customerOptions.length} customer options in dropdown`)
  
  // Find the customer in the dropdown using our mapping
  const dropdownCustomer = customerOptions.find(option => 
    option.value === customerMatch.customer.customerId ||
    option.text.toLowerCase().includes(customerMatch.customer.customerName.toLowerCase())
  )
  
  if (!dropdownCustomer) {
    console.log('❌ Customer not found in dropdown. Available customers:')
    customerOptions.slice(0, 10).forEach(customer => {
      console.log(`  - ${customer.text} (ID: ${customer.value})`)
    })
    if (customerOptions.length > 10) {
      console.log(`  ... and ${customerOptions.length - 10} more`)
    }
    throw new Error(`Customer "${customerMatch.customer.customerName}" not found in dropdown options`)
  }

  console.log(`✅ Found customer in dropdown: ${dropdownCustomer.text} (ID: ${dropdownCustomer.value})`)
  await page.selectOption('select[name="customer_id"]', dropdownCustomer.value)
  console.log(`✅ Selected customer: ${dropdownCustomer.text} (ID: ${dropdownCustomer.value})`)
}

// Function to record style mappings for future automation
export async function recordStyleMapping(style: string, color: string, orderType: 'Pre-order' | 'Stock'): Promise<void> {
  // This will be implemented to store mappings in a database or file
  // For now, just log it
  console.log('📊 Recording style mapping:', { style, color, orderType })
  
  // TODO: Implement persistent storage
  // - Database table: style_mappings
  // - Columns: style, color, order_type, created_at, updated_at
  // - Used for automatic order type selection in the future
} 