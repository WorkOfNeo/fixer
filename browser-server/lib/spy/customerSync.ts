import { chromium, Page, Browser } from 'playwright'
import * as cheerio from 'cheerio'
import { performCustomerSyncLogin } from '../auth/dynamicLogin'

export interface Customer {
  id: string
  name: string
  editUrl: string
  metadata: {
    email?: string
    phone?: string
    address?: string
    country?: string
    lastSync: string
    uuid?: string
    salesperson?: string
    brand?: string
    postalCode?: string
    city?: string
    rawData?: any // For debugging
  }
}

export interface SyncCredentials {
  username: string
  password: string
}

export interface SyncResult {
  success: boolean
  customersFound: number
  customersSaved?: number
  errors: string[]
  lastSync: string
  debugInfo?: any
}

/**
 * Enhanced customer sync with detailed logging for debugging
 */
export async function syncCustomers(credentials: SyncCredentials): Promise<SyncResult> {
  console.log('🔄 ===== STARTING CUSTOMER SYNC WITH DETAILED LOGGING =====')
  console.log('📋 Sync initiated at:', new Date().toISOString())
  console.log('👤 Username:', credentials.username ? '***PROVIDED***' : '***MISSING***')
  console.log('🔑 Password:', credentials.password ? '***PROVIDED***' : '***MISSING***')
  
  let browser: Browser | null = null
  let page: Page | null = null
  const debugLog: string[] = []
  
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    debugLog.push(logMessage)
    console.log('🔍 DEBUG:', logMessage)
  }
  
  try {
    addDebugLog('Phase 1: Browser initialization starting...')
    
    // Launch browser with detailed options
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    })
    
    addDebugLog('✅ Browser launched successfully')
    
    // Create page with detailed configuration
    page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    })
    
    addDebugLog('✅ Page created with user agent and viewport')
    
    // Add error logging for page events
    page.on('console', msg => {
      addDebugLog(`PAGE CONSOLE [${msg.type()}]: ${msg.text()}`)
    })
    
    page.on('requestfailed', request => {
      addDebugLog(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`)
    })
    
    page.on('response', response => {
      if (response.status() >= 400) {
        addDebugLog(`HTTP ERROR: ${response.status()} ${response.statusText()} - ${response.url()}`)
      }
    })
    
    addDebugLog('Phase 2: Starting enhanced login process...')
    
    // Use the enhanced customer sync login
    await performCustomerSyncLogin(page, credentials)
    
    addDebugLog('Phase 3: Navigating to customer overview page...')
    
    // Navigate to customer overview with logging
    const customerUrl = 'https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CIndex&action=ActiveList'
    addDebugLog(`Navigating to customer URL: ${customerUrl}`)
    
    const navigationResponse = await page.goto(customerUrl, { 
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    })
    
    addDebugLog(`Navigation response status: ${navigationResponse?.status()}`)
    addDebugLog(`Navigation response URL: ${navigationResponse?.url()}`)
    
    // Wait for page to stabilize
    addDebugLog('Waiting for page to stabilize...')
    await page.waitForTimeout(3000)
    
    // Get page title and URL for debugging
    const pageTitle = await page.title()
    const currentUrl = await page.url()
    addDebugLog(`Current page title: "${pageTitle}"`)
    addDebugLog(`Current page URL: ${currentUrl}`)
    
    // Check if we're still on login or have been redirected
    if (currentUrl.includes('login') || pageTitle.toLowerCase().includes('login')) {
      addDebugLog('⚠️ WARNING: Still on login page, authentication may have failed')
      
      // Take screenshot for debugging
      try {
        const screenshot = await page.screenshot({ type: 'png' })
        addDebugLog(`Screenshot taken: ${screenshot.length} bytes`)
      } catch (e) {
        addDebugLog(`Failed to take screenshot: ${e}`)
      }
      
      // Get page content for analysis
      const pageContent = await page.content()
      addDebugLog(`Page content length: ${pageContent.length} characters`)
      
      // Look for error messages
      const errorElements = await page.$$eval('.error, .alert-danger, .text-danger, [class*="error"]', 
        elements => elements.map(el => el.textContent?.trim()).filter(Boolean)
      ).catch(() => [])
      
      if (errorElements.length > 0) {
        addDebugLog(`Found error messages: ${JSON.stringify(errorElements)}`)
      }
      
      throw new Error('Authentication failed - still on login page after login attempt')
    }
    
    addDebugLog('Phase 4: Looking for customer data on page...')
    
    // Enhanced page analysis
    await analyzePageStructure(page, addDebugLog)
    
    addDebugLog('Phase 5: Extracting customer data...')
    
    // Get page content
    const html = await page.content()
    addDebugLog(`Retrieved HTML content: ${html.length} characters`)
    
    // Parse customers with detailed logging
    const customers = await parseCustomerListWithLogging(html, addDebugLog)
    
    addDebugLog(`Phase 6: Sync completed successfully`)
    addDebugLog(`Total customers found: ${customers.length}`)
    
    return {
      success: true,
      customersFound: customers.length,
      customersSaved: customers.length,
      errors: [],
      lastSync: new Date().toISOString(),
      debugInfo: {
        logs: debugLog,
        pageTitle,
        currentUrl,
        customerSample: customers.slice(0, 3) // First 3 customers for debugging
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addDebugLog(`❌ FATAL ERROR: ${errorMessage}`)
    
    if (error instanceof Error && error.stack) {
      addDebugLog(`Error stack: ${error.stack}`)
    }
    
    // Try to get current page info for debugging
    if (page) {
      try {
        const currentUrl = await page.url()
        const pageTitle = await page.title()
        addDebugLog(`Error occurred on page: ${currentUrl}`)
        addDebugLog(`Page title when error occurred: "${pageTitle}"`)
        
        // Get page content for debugging
        const content = await page.content()
        addDebugLog(`Page content length when error occurred: ${content.length}`)
        
        // Look for any visible text that might indicate what went wrong
        const visibleText = await page.evaluate(() => {
          return document.body ? document.body.innerText.substring(0, 500) : 'No body content'
        }).catch(() => 'Could not extract visible text')
        
        addDebugLog(`Visible text sample: "${visibleText}"`)
        
      } catch (debugError) {
        addDebugLog(`Could not extract debug info: ${debugError}`)
      }
    }
    
    console.error('❌ Full debug log:')
    debugLog.forEach(log => console.error(log))
    
    return {
      success: false,
      customersFound: 0,
      errors: [errorMessage],
      lastSync: new Date().toISOString(),
      debugInfo: {
        logs: debugLog,
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined
      }
    }
    
  } finally {
    addDebugLog('Phase 7: Cleanup starting...')
    
    // Enhanced cleanup with logging
    if (page) {
      try {
        addDebugLog('Closing page...')
        await page.close()
        addDebugLog('✅ Page closed successfully')
      } catch (e) {
        addDebugLog(`⚠️ Warning: Failed to close page: ${e}`)
      }
    }
    
    if (browser) {
      try {
        addDebugLog('Closing browser...')
        await browser.close()
        addDebugLog('✅ Browser closed successfully')
      } catch (e) {
        addDebugLog(`⚠️ Warning: Failed to close browser: ${e}`)
      }
    }
    
    addDebugLog('🏁 Cleanup completed')
    console.log('🔄 ===== CUSTOMER SYNC COMPLETED =====')
  }
}

async function analyzePageStructure(page: Page, log: (msg: string) => void): Promise<void> {
  log('📊 Analyzing page structure for customer data...')
  
  try {
    // Get page title and URL
    const title = await page.title()
    const url = page.url()
    log(`Page analysis - Title: "${title}", URL: ${url}`)
    
    // Count different types of elements that might contain customer data
    const elementCounts = await page.evaluate(() => {
      return {
        tables: document.querySelectorAll('table').length,
        rows: document.querySelectorAll('tr').length,
        links: document.querySelectorAll('a').length,
        forms: document.querySelectorAll('form').length,
        divs: document.querySelectorAll('div').length,
        customerLinks: document.querySelectorAll('a[href*="customer"]').length,
        editLinks: document.querySelectorAll('a[href*="Edit"]').length,
        customerIdLinks: document.querySelectorAll('a[href*="customer_id"]').length
      }
    })
    
    log(`Element counts: ${JSON.stringify(elementCounts, null, 2)}`)
    
    // Look for customer-related content
    const customerElements = await page.$$eval('a[href*="customer"], a[href*="Customer"], a[href*="Edit"]', 
      links => links.slice(0, 5).map(link => ({
        href: link.getAttribute('href'),
        text: link.textContent?.trim(),
        class: link.getAttribute('class')
      }))
    ).catch(() => [])
    
    if (customerElements.length > 0) {
      log(`Found ${customerElements.length} potential customer links:`)
      customerElements.forEach((el, index) => {
        log(`  Link ${index}: href="${el.href}", text="${el.text}", class="${el.class}"`)
      })
    } else {
      log('❌ No customer-related links found')
    }
    
    // Check for pagination or load more buttons
    const paginationElements = await page.$$eval('[class*="page"], [class*="next"], [class*="more"], button:has-text("Load"), button:has-text("More")', 
      buttons => buttons.map(btn => ({
        text: btn.textContent?.trim(),
        class: btn.getAttribute('class'),
        tag: btn.tagName
      }))
    ).catch(() => [])
    
    if (paginationElements.length > 0) {
      log(`Found ${paginationElements.length} pagination/load elements:`)
      paginationElements.forEach((el, index) => {
        log(`  Element ${index}: text="${el.text}", class="${el.class}", tag="${el.tag}"`)
      })
    }
    
  } catch (error) {
    log(`Error during page analysis: ${error}`)
  }
}

async function parseCustomerListWithLogging(html: string, log: (msg: string) => void): Promise<Customer[]> {
  log('🔍 Starting detailed customer data parsing...')
  log(`HTML content length: ${html.length} characters`)
  
  const $ = cheerio.load(html)
  const customers: Customer[] = []
  const currentTime = new Date().toISOString()
  
  try {
    // Log page structure for debugging
    const pageStructure = {
      title: $('title').text(),
      tables: $('table').length,
      rows: $('tr').length,
      links: $('a').length,
      customerLinks: $('a[href*="customer"]').length,
      editLinks: $('a[href*="Edit"]').length
    }
    
    log(`Page structure analysis: ${JSON.stringify(pageStructure, null, 2)}`)
    
    // Strategy 1: Look for table rows with customer data
    log('Strategy 1: Searching table rows...')
    
    const tableRows = $('table tr, .customer-row, .data-row')
    log(`Found ${tableRows.length} potential table rows`)
    
    tableRows.each((index, element) => {
      try {
        const $row = $(element)
        
        // Look for links that contain customer edit URLs
        const editLink = $row.find('a[href*="customer_id"], a[href*="Customer"], a[href*="Edit"]').first()
        
        if (editLink.length > 0) {
          const href = editLink.attr('href')
          const customerName = editLink.text().trim()
          
          if (href && customerName && href.includes('customer_id')) {
            // Extract customer ID from URL
            const customerIdMatch = href.match(/customer_id=(\d+)/)
            const uuidMatch = href.match(/uuid=([a-f0-9-]+)/)
            
            if (customerIdMatch) {
              const customerId = customerIdMatch[1]
              const uuid = uuidMatch ? uuidMatch[1] : undefined
              
              // Build full URL if it's relative
              const fullUrl = href.startsWith('http') ? href : `https://2-biz.spysystem.dk${href.startsWith('/') ? href : '/' + href}`
              
              // Extract additional metadata from the row
              const rowText = $row.text()
              const emailMatch = rowText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
              const phoneMatch = rowText.match(/(\+?[\d\s\-\(\)]{8,})/g)
              
              const customer: Customer = {
                id: customerId,
                name: customerName,
                editUrl: fullUrl,
                metadata: {
                  email: emailMatch ? emailMatch[1] : undefined,
                  phone: phoneMatch ? phoneMatch[0]?.trim() : undefined,
                  lastSync: currentTime,
                  uuid: uuid
                }
              }
              
              customers.push(customer)
              
              if (customers.length <= 5) { // Log first 5 for debugging
                log(`Found customer: ${JSON.stringify(customer, null, 2)}`)
              }
            }
          }
        }
      } catch (rowError) {
        if (index < 5) { // Only log first few errors to avoid spam
          log(`Error processing row ${index}: ${rowError}`)
        }
      }
    })
    
    log(`Strategy 1 result: Found ${customers.length} customers`)
    
    // Strategy 2: Look for direct customer links if Strategy 1 failed
    if (customers.length === 0) {
      log('Strategy 2: Searching direct customer links...')
      
      const customerLinks = $('a[href*="customer_id"]')
      log(`Found ${customerLinks.length} direct customer links`)
      
      customerLinks.each((index, element) => {
        try {
          const $link = $(element)
          const href = $link.attr('href')
          const customerName = $link.text().trim()
          
          if (href && customerName && href.includes('customer_id')) {
            const customerIdMatch = href.match(/customer_id=(\d+)/)
            const uuidMatch = href.match(/uuid=([a-f0-9-]+)/)
            
            if (customerIdMatch) {
              const customerId = customerIdMatch[1]
              const uuid = uuidMatch ? uuidMatch[1] : undefined
              
              const fullUrl = href.startsWith('http') ? href : `https://2-biz.spysystem.dk${href.startsWith('/') ? href : '/' + href}`
              
              const customer: Customer = {
                id: customerId,
                name: customerName,
                editUrl: fullUrl,
                metadata: {
                  lastSync: currentTime,
                  uuid: uuid
                }
              }
              
              customers.push(customer)
              
              if (customers.length <= 5) {
                log(`Direct link customer: ${JSON.stringify(customer, null, 2)}`)
              }
            }
          }
        } catch (linkError) {
          if (index < 5) {
            log(`Error processing link ${index}: ${linkError}`)
          }
        }
      })
      
      log(`Strategy 2 result: Found ${customers.length} customers`)
    }
    
    // Strategy 3: If still no customers, analyze page content
    if (customers.length === 0) {
      log('Strategy 3: Analyzing page content structure...')
      
      // Get sample of page text
      const pageText = $('body').text().substring(0, 1000)
      log(`Page text sample: "${pageText}"`)
      
      // Look for any text that might indicate customer data
      const hasCustomerText = pageText.toLowerCase().includes('customer') || 
                             pageText.toLowerCase().includes('client') ||
                             pageText.toLowerCase().includes('kunde') // Danish for customer
      
      log(`Page contains customer-related text: ${hasCustomerText}`)
      
      // Check if this might be an empty list or different page structure
      const hasNoDataText = pageText.toLowerCase().includes('no data') ||
                           pageText.toLowerCase().includes('empty') ||
                           pageText.toLowerCase().includes('ingen') // Danish for none
      
      log(`Page indicates no data: ${hasNoDataText}`)
    }
    
    log(`✅ Customer parsing completed. Total customers found: ${customers.length}`)
    
    if (customers.length > 0) {
      log(`Sample customer IDs: ${customers.slice(0, 5).map(c => c.id).join(', ')}`)
    }
    
    return customers
    
  } catch (error) {
    log(`❌ Error during customer parsing: ${error}`)
    throw error
  }
}

function extractEmail($row: cheerio.Cheerio<any>): string | undefined {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const rowText = $row.text()
  const emailMatch = rowText.match(emailRegex)
  return emailMatch ? emailMatch[0] : undefined
}

function extractPhone($row: cheerio.Cheerio<any>): string | undefined {
  const phoneRegex = /[\+]?[\d\s\-\(\)]{8,}/
  const rowText = $row.text()
  const phoneMatch = rowText.match(phoneRegex)
  return phoneMatch ? phoneMatch[0].trim() : undefined
}

function extractCountry($row: cheerio.Cheerio<any>): string | undefined {
  // Look for common country indicators
  const rowText = $row.text().toLowerCase()
  const countries = ['denmark', 'norway', 'sweden', 'finland', 'germany', 'uk', 'netherlands']
  
  for (const country of countries) {
    if (rowText.includes(country)) {
      return country.charAt(0).toUpperCase() + country.slice(1)
    }
  }
  
  return undefined
}

// Enhanced version that can handle pagination
export async function syncCustomersWithPagination(credentials: SyncCredentials): Promise<SyncResult> {
  console.log('🔄 Starting customer sync with pagination support...')
  
  let browser: Browser | null = null
  let page: Page | null = null
  let allCustomers: Customer[] = []
  const debugLog: string[] = []
  
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    debugLog.push(logMessage)
    console.log('🔍 DEBUG PAGINATION:', logMessage)
  }
  
  try {
    addDebugLog('Starting paginated customer sync...')
    
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    page = await browser.newPage()
    
    addDebugLog('Browser and page created for pagination sync')
    
    // Use the enhanced customer sync login
    await performCustomerSyncLogin(page, credentials)
    addDebugLog('✅ Login completed successfully for pagination sync')
    
    // Start with first page
    let currentPage = 1
    let hasMorePages = true
    
    while (hasMorePages) {
      addDebugLog(`Processing page ${currentPage}...`)
      
      const customerOverviewUrl = `https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CIndex&action=ActiveList&page=${currentPage}`
      await page.goto(customerOverviewUrl, { timeout: 15000 })
      await page.waitForSelector('table, .customer-list, .data-table', { timeout: 10000 })
      
      const htmlContent = await page.content()
      const pageCustomers = await parseCustomerListWithLogging(htmlContent, addDebugLog)
      
      if (pageCustomers.length === 0) {
        addDebugLog(`No customers found on page ${currentPage}, stopping pagination`)
        hasMorePages = false
      } else {
        allCustomers.push(...pageCustomers)
        addDebugLog(`Found ${pageCustomers.length} customers on page ${currentPage}`)
        
        // Check if there's a "next" button or pagination indicator
        const hasNextButton = await page.$('a[href*="page=' + (currentPage + 1) + '"], .next, .pagination .next') !== null
        
        if (!hasNextButton) {
          hasMorePages = false
        } else {
          currentPage++
        }
      }
      
      // Safety limit to prevent infinite loops
      if (currentPage > 50) {
        addDebugLog('Reached maximum page limit (50), stopping pagination')
        hasMorePages = false
      }
    }
    
    // Remove duplicates
    const uniqueCustomers = allCustomers.filter((customer, index, self) => 
      index === self.findIndex(c => c.id === customer.id)
    )
    
    addDebugLog(`Successfully extracted ${uniqueCustomers.length} unique customers across ${currentPage} pages`)
    
    return {
      success: true,
      customersFound: uniqueCustomers.length,
      customersSaved: uniqueCustomers.length,
      errors: [],
      lastSync: new Date().toISOString(),
      debugInfo: {
        logs: debugLog,
        totalPages: currentPage,
        uniqueCustomers: uniqueCustomers.length
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addDebugLog(`Error during paginated customer sync: ${errorMessage}`)
    
    return {
      success: false,
      customersFound: allCustomers.length,
      customersSaved: 0,
      errors: [errorMessage],
      lastSync: new Date().toISOString(),
      debugInfo: {
        logs: debugLog,
        error: errorMessage,
        customersFoundBeforeError: allCustomers.length
      }
    }
    
  } finally {
    addDebugLog('Cleaning up pagination sync...')
    if (page) await page.close()
    if (browser) await browser.close()
    addDebugLog('Pagination sync cleanup completed')
  }
} 

/**
 * Enhanced customer sync with SPY-specific page structure handling
 */
export async function enhancedSyncCustomers(credentials: SyncCredentials): Promise<SyncResult> {
  console.log('🔄 ===== ENHANCED CUSTOMER SYNC STARTING =====')
  console.log('📋 Enhanced sync initiated at:', new Date().toISOString())
  
  let browser: Browser | null = null
  let page: Page | null = null
  const debugLog: string[] = []
  
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    debugLog.push(logMessage)
    console.log('🔍 ENHANCED DEBUG:', logMessage)
  }
  
  try {
    addDebugLog('Phase 1: Enhanced browser initialization...')
    
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled'
      ]
    })
    
    page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    })
    
    // Add comprehensive error handling
    page.on('console', msg => addDebugLog(`PAGE CONSOLE [${msg.type()}]: ${msg.text()}`))
    page.on('requestfailed', request => addDebugLog(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`))
    page.on('response', response => {
      if (response.status() >= 400) {
        addDebugLog(`HTTP ERROR: ${response.status()} ${response.statusText()} - ${response.url()}`)
      }
    })
    
    addDebugLog('Phase 2: Enhanced login process...')
    
    // Use the enhanced customer sync login
    await performCustomerSyncLogin(page, credentials)
    addDebugLog('✅ Enhanced login completed successfully')
    
    addDebugLog('Phase 3: Navigating to SPY customer list page...')
    
    // Navigate to the specific SPY customer list URL
    const customerListUrl = 'https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CIndex&action=ActiveList&Spy\\Model\\Admin\\Customer\\Index\\ListReportSearch[bForceSearch]=true'
    addDebugLog(`Navigating to customer list: ${customerListUrl}`)
    
    const navigationResponse = await page.goto(customerListUrl, { 
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    })
    
    addDebugLog(`Navigation response: ${navigationResponse?.status()} ${navigationResponse?.statusText()}`)
    
    // Check URL after navigation
    const urlAfterNavigation = page.url()
    addDebugLog(`URL after navigation: ${urlAfterNavigation}`)
    
    if (urlAfterNavigation.includes('login') || urlAfterNavigation.includes('GetLoginPage')) {
      throw new Error(`Redirected to login page after navigation. URL: ${urlAfterNavigation}`)
    }
    
    // Wait for the main content area
    addDebugLog('Phase 4: Waiting for main content area...')
    await page.waitForSelector('#MainContent', { timeout: 15000 })
    addDebugLog('✅ Main content area found')
    
    // Verify we're still on the correct page
    const urlAfterMainContent = page.url()
    addDebugLog(`URL after main content loaded: ${urlAfterMainContent}`)
    
    if (!urlAfterMainContent.includes('Admin%5CCustomer%5CIndex')) {
      addDebugLog(`⚠️ Warning: Not on expected customer page. URL: ${urlAfterMainContent}`)
    }
    
    // Phase 5: First check for customer data without clicking "Show All"
    addDebugLog('Phase 5: Checking for existing customer data before Show All...')
    
    // Check URL before Show All click
    const urlBeforeShowAll = page.url()
    addDebugLog(`URL before Show All attempt: ${urlBeforeShowAll}`)
    
    // First, try to see if we already have customer data - wait for populated table
    let hasCustomerData = false
    try {
      addDebugLog('Checking for existing #CustomerList (waiting up to 10 seconds)...')
      await page.waitForSelector('#CustomerList', { timeout: 10000 })
      
      // Wait for table to be populated with actual customer rows (at least 10)
      addDebugLog('Waiting for customer table to populate with at least 10 rows...')
      await page.waitForFunction(
        () => {
          const table = document.querySelector('#CustomerList')
          if (!table) return false
          
          const dataRows = table.querySelectorAll('tr[data-row_no], tbody tr')
          return dataRows.length >= 10
        },
        {},
        { timeout: 15000 }
      )
      
      const customerRowCount = await page.$$eval('#CustomerList tr[data-row_no], #CustomerList tbody tr', rows => rows.length)
      addDebugLog(`Found #CustomerList with ${customerRowCount} customer rows without clicking Show All`)
      
      if (customerRowCount >= 10) { 
        hasCustomerData = true
        addDebugLog('✅ Customer data already available (10+ rows), skipping Show All button')
      }
    } catch (e) {
      addDebugLog('No populated #CustomerList found initially, will try Show All button')
    }
    
    // Only click Show All if we don't have customer data yet
    if (!hasCustomerData) {
      addDebugLog('Phase 5b: Looking for "Show All" button...')
      
      try {
        const showAllButton = await page.waitForSelector('button[name="show_all"]', { timeout: 5000 })
        if (showAllButton) {
          addDebugLog('Found "Show All" button, analyzing it first...')
          
          // Get button details for debugging
          const buttonInfo = await page.evaluate(() => {
            const btn = document.querySelector('button[name="show_all"]') as HTMLButtonElement
            if (!btn) return null
            
            return {
              onclick: btn.getAttribute('onclick') || 'none',
              type: btn.getAttribute('type') || 'none',
              value: btn.getAttribute('value') || 'none',
              formAction: btn.form ? btn.form.getAttribute('action') : 'no-form',
              formMethod: btn.form ? btn.form.getAttribute('method') : 'no-form'
            }
          })
          
          addDebugLog(`Show All button info: ${JSON.stringify(buttonInfo)}`)
          
          // Navigate back to the customer page with Show All parameter instead of clicking
          addDebugLog('Instead of clicking, navigating to Show All URL directly...')
          const showAllUrl = urlBeforeShowAll + '&show_all=1'
          addDebugLog(`Navigating to Show All URL: ${showAllUrl}`)
          
          const showAllResponse = await page.goto(showAllUrl, { 
            timeout: 30000,
            waitUntil: 'domcontentloaded'
          })
          
          addDebugLog(`Show All navigation response: ${showAllResponse?.status()}`)
          
                     // Wait longer for customer content to load after Show All
           addDebugLog('Waiting 8 seconds for customer data to load after Show All...')
           await page.waitForTimeout(8000)
          
          // Check URL after direct navigation
          const urlAfterShowAll = page.url()
          addDebugLog(`URL after Show All navigation: ${urlAfterShowAll}`)
          
          if (urlAfterShowAll.includes('Start&action=Index') || !urlAfterShowAll.includes('Customer')) {
            addDebugLog(`⚠️ Direct navigation also redirected. Trying without Show All parameter...`)
            
                         // Go back to original customer URL
             await page.goto(customerListUrl, { 
               timeout: 30000,
               waitUntil: 'domcontentloaded'
             })
             
             // Wait longer for customer page to load
             addDebugLog('Waiting 5 seconds for customer page to stabilize...')
             await page.waitForTimeout(5000)
          }
        }
      } catch (error) {
        addDebugLog('⚠️ "Show All" button not found or not accessible, continuing with available data...')
      }
    }
    
    // Wait for the customer list table with debugging
    addDebugLog('Phase 6: Waiting for customer list table...')
    
    // First, let's see what's actually on the page
    addDebugLog('Debugging: Checking page content after Show All click...')
    const pageTitle = await page.title()
    const currentUrl = page.url()
    addDebugLog(`Current page title: "${pageTitle}"`)
    addDebugLog(`Current URL: ${currentUrl}`)
    
    // Check if various customer table selectors exist - start with #CustomerList first
    const tableSelectors = [
      '#CustomerList',
      '#CustomerList tbody',
      'table[id*="Customer"]',
      'table[id*="Customer"] tbody',
      'table tbody',
      '[id*="Customer"]',
      '[id*="Customer"] tbody',
      '.customer-table',
      '.customer-table tbody'
    ]
    
    let tableFound = false
    let workingSelector = ''
    
    for (const selector of tableSelectors) {
      try {
        addDebugLog(`Trying table selector: "${selector}" (waiting up to 10 seconds)...`)
        await page.waitForSelector(selector, { timeout: 10000 })
        addDebugLog(`✅ Found table with selector: "${selector}"`)
        
        // Now wait for the table to have at least 10 customer rows
        addDebugLog(`Waiting for table "${selector}" to populate with at least 10 customer rows...`)
        await page.waitForFunction(
          (sel) => {
            const table = document.querySelector(sel)
            if (!table) return false
            
            // Count actual customer rows with data-row_no or tr in tbody
            const dataRows = table.querySelectorAll('tr[data-row_no], tbody tr')
            console.log(`Table ${sel} has ${dataRows.length} rows`)
            return dataRows.length >= 10
          },
          selector,
          { timeout: 15000 }
        )
        
        const customerRowCount = await page.$$eval(`${selector} tr[data-row_no], ${selector} tbody tr`, rows => rows.length)
        addDebugLog(`✅ Table "${selector}" populated with ${customerRowCount} customer rows`)
        
        workingSelector = selector
        tableFound = true
        break
      } catch (error) {
        addDebugLog(`❌ Selector "${selector}" not found or not populated after waiting`)
      }
    }
    
    if (!tableFound) {
      // Let's see what tables actually exist
      addDebugLog('No standard customer table found. Analyzing page structure...')
      
      const tableInfo = await page.evaluate(() => {
        const tables = document.querySelectorAll('table')
        const tableData: Array<{index: number, id: string, className: string, rowCount: number}> = []
        
        tables.forEach((table, index) => {
          const id = table.id || 'no-id'
          const className = table.className || 'no-class'
          const rowCount = table.querySelectorAll('tr').length
          tableData.push({ index, id, className, rowCount })
        })
        
        return tableData
      })
      
      addDebugLog(`Found ${tableInfo.length} tables on page:`)
      tableInfo.forEach(table => {
        addDebugLog(`  Table ${table.index}: id="${table.id}", class="${table.className}", rows=${table.rowCount}`)
      })
      
             // Try to find any table with customer data
       const customerLinkCount = await page.$$eval('a[href*="customer_id="]', links => links.length).catch(() => 0)
       addDebugLog(`Found ${customerLinkCount} customer edit links on page`)
       
       // Get a sample of page content for debugging
       const pageContentSample = await page.$eval('body', el => el.textContent?.substring(0, 1000) || '').catch(() => 'Could not get page content')
       addDebugLog(`Page content sample: "${pageContentSample}"`)
       
       // Check for common elements that might indicate customer data
       const elementChecks = await page.evaluate(() => {
         return {
           hasTables: document.querySelectorAll('table').length,
           hasRows: document.querySelectorAll('tr').length,
           hasCustomerLinks: document.querySelectorAll('a[href*="customer"]').length,
           hasEditLinks: document.querySelectorAll('a[href*="Edit"]').length,
           hasListElements: document.querySelectorAll('ul li, ol li').length,
           bodyText: document.body.textContent?.toLowerCase().includes('customer') || false
         }
       })
       
       addDebugLog(`Element analysis: ${JSON.stringify(elementChecks)}`)
       
       if (customerLinkCount > 0) {
         addDebugLog('Customer links found, but not in expected table structure')
         // If we have customer links, we can still try to extract data
         workingSelector = 'body' // We'll parse the whole page
         tableFound = true
       } else if (elementChecks.hasCustomerLinks > 0 || elementChecks.hasEditLinks > 0) {
         addDebugLog('Found alternative customer links, will try to extract data')
         workingSelector = 'body'
         tableFound = true
       }
    }
    
    if (tableFound) {
      addDebugLog(`✅ Customer data container found with selector: "${workingSelector}"`)
      
      // Wait longer to ensure all customer rows are fully loaded
      addDebugLog('Waiting 5 more seconds for all customer rows to load...')
      await page.waitForTimeout(5000)
    } else {
      throw new Error('Could not find customer table or customer data on page')
    }
    
    addDebugLog('Phase 7: Extracting customer data from SPY table...')
    
    // Get page content and parse with our enhanced SPY-specific parser
    const html = await page.content()
    const customers = await parseSpyCustomerList(html, addDebugLog)
    
    if (customers.length > 0) {
      addDebugLog('Phase 8: Validating and saving customers...')
      
      // Validate customer data quality
      const validCustomers = customers.filter(customer => {
        const hasValidId = customer.id && customer.id.length > 0
        const hasValidName = customer.name && customer.name.trim().length > 0
        const hasValidEditUrl = customer.editUrl && customer.editUrl.includes('customer_id=')
        
        return hasValidId && hasValidName && hasValidEditUrl
      })
      
      addDebugLog(`Validated ${validCustomers.length} of ${customers.length} customers`)
      
      if (validCustomers.length !== customers.length) {
        const invalidCustomers = customers.filter(c => !validCustomers.includes(c))
        addDebugLog(`Invalid customers: ${JSON.stringify(invalidCustomers.slice(0, 3))}`)
      }
      
      // Save to storage
      const { CustomerStorage } = await import('../data/customerStorage')
      const storage = new CustomerStorage()
      await storage.saveCustomers(validCustomers)
      
      addDebugLog(`✅ Saved ${validCustomers.length} valid customers to storage`)
      
      return {
        success: true,
        customersFound: validCustomers.length,
        customersSaved: validCustomers.length,
        errors: validCustomers.length !== customers.length ? [`Filtered out ${customers.length - validCustomers.length} invalid customers`] : [],
        lastSync: new Date().toISOString(),
        debugInfo: {
          logs: debugLog,
          successfulUrl: customerListUrl,
          totalExtracted: customers.length,
          validatedCount: validCustomers.length,
          sampleCustomers: validCustomers.slice(0, 3),
          showAllButtonFound: true // We attempted to click it
        }
      }
    } else {
      addDebugLog('⚠️ No customers found in the customer list table')
      
      // Enhanced debugging for empty results
      const currentUrl = page.url()
      const pageTitle = await page.title()
      const mainContentText = await page.$eval('#MainContent', el => el.textContent?.substring(0, 500) || '').catch(() => 'Could not get main content text')
      
      addDebugLog(`Current URL: ${currentUrl}`)
      addDebugLog(`Page title: "${pageTitle}"`)
      addDebugLog(`Main content sample: "${mainContentText}"`)
      
      return {
        success: false,
        customersFound: 0,
        customersSaved: 0,
        errors: ['No customers found in the SPY customer list table'],
        lastSync: new Date().toISOString(),
        debugInfo: {
          logs: debugLog,
          attemptedUrl: customerListUrl,
          finalUrl: currentUrl,
          pageTitle,
          mainContentSample: mainContentText
        }
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addDebugLog(`❌ ENHANCED SYNC FATAL ERROR: ${errorMessage}`)
    
    return {
      success: false,
      customersFound: 0,
      customersSaved: 0,
      errors: [errorMessage],
      lastSync: new Date().toISOString(),
      debugInfo: {
        logs: debugLog,
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined
      }
    }
  } finally {
    if (browser) {
      await browser.close()
      addDebugLog('✅ Browser closed successfully')
    }
  }
}

/**
 * SPY-specific customer list parser that handles the exact table structure
 */
async function parseSpyCustomerList(html: string, log: (msg: string) => void): Promise<Customer[]> {
  log('🔍 SPY customer list parsing starting...')
  
  const $ = cheerio.load(html)
  const customers: Customer[] = []
  
  try {
    // Check if #CustomerList exists first
    const customerListExists = $('#CustomerList').length > 0
    log(`#CustomerList exists: ${customerListExists}`)
    
    if (customerListExists) {
      const tableHtml = $('#CustomerList').html()?.substring(0, 1000)
      log(`#CustomerList HTML sample: ${tableHtml}`)
    }
    
    // Look for customer rows in #CustomerList - try both tbody and direct children
    let customerRows = $('#CustomerList tbody tr')
    log(`Found ${customerRows.length} customer rows in #CustomerList tbody tr`)
    
    if (customerRows.length === 0) {
      // Try without tbody
      customerRows = $('#CustomerList tr')
      log(`Found ${customerRows.length} customer rows in #CustomerList tr`)
    }
    
    if (customerRows.length === 0) {
      log('⚠️ No customer rows found in #CustomerList')
      
      // Debug: Check table structure
      const tbodyExists = $('#CustomerList tbody').length > 0
      const trCount = $('#CustomerList tr').length
      const allRowsCount = $('tr').length
      
      log(`#CustomerList tbody exists: ${tbodyExists}`)
      log(`#CustomerList tr count: ${trCount}`)
      log(`Total tr elements on page: ${allRowsCount}`)
      
      return customers
    }
    
    customerRows.each((index, element) => {
      const $row = $(element)
      
      try {
        // Extract customer ID and data from the row
        const customer = extractSpyCustomerFromRow($row, log, $)
        if (customer) {
          customers.push(customer)
          log(`✅ Extracted customer ${index + 1}: ${customer.name} (ID: ${customer.id})`)
        } else {
          log(`⚠️ Could not extract customer data from row ${index + 1}`)
        }
      } catch (error) {
        log(`❌ Error processing row ${index + 1}: ${error}`)
      }
    })
    
    // Remove duplicates based on customer ID
    const uniqueCustomers = customers.filter((customer, index, self) => 
      index === self.findIndex(c => c.id === customer.id)
    )
    
    if (uniqueCustomers.length !== customers.length) {
      log(`Removed ${customers.length - uniqueCustomers.length} duplicate customers`)
    }
    
    log(`✅ SPY customer parsing completed: ${uniqueCustomers.length} unique customers found`)
    
    return uniqueCustomers
    
  } catch (error) {
    log(`❌ SPY customer parsing error: ${error}`)
    return customers
  }
}

/**
 * Extract customer data from a SPY customer table row
 */
function extractSpyCustomerFromRow($row: cheerio.Cheerio<any>, log: (msg: string) => void, $: cheerio.CheerioAPI): Customer | null {
  try {
    // Get the data attributes from the row
    const rowNo = $row.attr('data-row_no')
    const reference = $row.attr('data-reference') 
    const dataName = $row.attr('data-name')
    
    log(`Processing row - data-row_no: ${rowNo}, data-reference: ${reference}, data-name: ${dataName}`)
    
    // Find the edit link in the second column (customer name column)
    const editLink = $row.find('a[href*="customer_id="]').first()
    if (editLink.length === 0) {
      log(`⚠️ No edit link found in row`)
      return null
    }
    
    const href = editLink.attr('href')
    if (!href) {
      log(`⚠️ Edit link has no href attribute`)
      return null
    }
    
    // Extract customer ID and UUID from the edit URL
    const customerIdMatch = href.match(/customer_id=([^&]+)/)
    const uuidMatch = href.match(/uuid=([^&]+)/)
    
    if (!customerIdMatch) {
      log(`⚠️ Could not extract customer_id from URL: ${href}`)
      return null
    }
    
    const customerId = customerIdMatch[1]
    const uuid = uuidMatch ? uuidMatch[1] : undefined
    
    // Extract customer name (should be in the div inside the edit link)
    const customerName = editLink.find('div').attr('title') || editLink.text().trim() || dataName || ''
    
    if (!customerName || customerName.length < 2) {
      log(`⚠️ Could not extract valid customer name from row`)
      return null
    }
    
    // Build the full edit URL
    const fullEditUrl = href.startsWith('http') ? href : `https://2-biz.spysystem.dk${href}`
    
    // Extract additional metadata from the table columns
    const cells = $row.find('td')
    
    // Based on the example structure:
    // 0: Status icon, 1: Name, 2: ?, 3: Salesperson, 4: Brand, 5: Postal code, 
    // 6: City, 7: Country, 8: ?, 9: Phone, 10: ?, 11: ?, 12: Phone2, 13: ?, 14: ?, etc.
    
    const getColumnText = (index: number): string => {
      if (index < cells.length) {
        return $(cells[index]).text().trim()
      }
      return ''
    }
    
    const salesperson = getColumnText(3)
    const brand = getColumnText(4)
    const postalCode = getColumnText(5)
    const city = getColumnText(6)
    const country = getColumnText(7)
    const phone1 = getColumnText(9)
    const phone2 = getColumnText(12)
    
    // Extract email if any (look through all cells)
    let email: string | undefined
    for (let i = 0; i < cells.length; i++) {
      const cellText = getColumnText(i)
      if (cellText.includes('@') && cellText.includes('.')) {
        email = cellText
        break
      }
    }
    
    const customer: Customer = {
      id: customerId,
      name: customerName,
      editUrl: fullEditUrl,
      metadata: {
        uuid,
        email,
        phone: phone1 || phone2 || undefined,
        address: city && postalCode ? `${postalCode} ${city}` : undefined,
        country: country || undefined,
        salesperson: salesperson || undefined,
        brand: brand || undefined,
        postalCode: postalCode || undefined,
        city: city || undefined,
        lastSync: new Date().toISOString(),
        // Store raw data for debugging
        rawData: {
          reference,
          dataName,
          phone1,
          phone2,
          rowIndex: rowNo
        }
      }
    }
    
    log(`✅ Successfully extracted customer: ${customerName} (ID: ${customerId})`)
    return customer
    
  } catch (error) {
    log(`❌ Error extracting customer from SPY row: ${error}`)
    return null
  }
} 