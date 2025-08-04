import { Page } from 'playwright'

export interface Credentials {
  username: string
  password: string
}

export interface LoginOptions {
  credentials: Credentials
  postLoginSelector?: string | string[]
  postLoginTimeout?: number
  action?: 'stock_check' | 'sales_order' | 'customer_sync'
}

/**
 * Enhanced dynamic login function that adapts post-login behavior based on the action
 */
export async function performLogin(page: Page, options: LoginOptions): Promise<void> {
  const { 
    credentials, 
    postLoginSelector, 
    postLoginTimeout = 10000,
    action 
  } = options

  console.log(`🔐 Starting login for action: ${action || 'unknown'}`)
  
  // Navigate to login page
  const loginUrl = process.env.SYSTEM_URL || 'http://localhost:3001/login'
  console.log(`🌐 Navigating to: ${loginUrl}`)
  await page.goto(loginUrl)

  // Wait for login form
  console.log('⏳ Waiting for login form...')
  await page.waitForSelector('form.spy-login-form')

  // Fill credentials
  console.log('📝 Filling in credentials...')
  await page.fill('input#inputGroup1[name="username"]', credentials.username)
  await page.fill('input#inputGroup2[name="password"]', credentials.password)

  // Submit form
  console.log('🚀 Submitting login form...')
  await page.click('button.login-submit-button[type="submit"]')

  // Wait for post-login element based on action or custom selector
  await waitForPostLogin(page, postLoginSelector, action, postLoginTimeout)
  
  console.log('✅ Login completed successfully')
}

/**
 * Wait for post-login elements with action-specific selectors
 */
async function waitForPostLogin(
  page: Page, 
  customSelector: string | string[] | undefined, 
  action: string | undefined, 
  timeout: number
): Promise<void> {
  // If custom selector is provided, use it
  if (customSelector) {
    if (Array.isArray(customSelector)) {
      console.log(`⏳ Waiting for any of the custom post-login selectors...`)
      await waitForAnySelector(page, customSelector, timeout)
    } else {
      console.log(`⏳ Waiting for custom post-login selector: ${customSelector}`)
      await page.waitForSelector(customSelector, { timeout })
    }
    return
  }

  // Use action-specific selectors
  console.log(`⏳ Waiting for post-login element for action: ${action}`)
  
  switch (action) {
    case 'stock_check':
    case 'sales_order':
      // These actions use the main dashboard
      console.log('📊 Waiting for dashboard (.App selector)...')
      await page.waitForSelector('.App', { timeout })
      break
      
    case 'customer_sync':
      // Customer sync needs to navigate to customer pages, so we need different selectors
      console.log('👥 Waiting for customer area access...')
      const customerSyncSelectors = [
        '.App',                    // Main dashboard
        '.main-content',           // Alternative main content
        '.container',              // Container element
        'main',                    // Main element
        '#main',                   // Main by ID
        '[class*="dashboard"]',    // Any dashboard class
        '[class*="main"]'          // Any main class
      ]
      await waitForAnySelector(page, customerSyncSelectors, timeout)
      break
      
    default:
      // Default to dashboard
      console.log('📊 Using default post-login selector (.App)...')
      await page.waitForSelector('.App', { timeout })
      break
  }
}

/**
 * Wait for any of the provided selectors to be available
 */
async function waitForAnySelector(page: Page, selectors: string[], timeout: number): Promise<void> {
  const promises = selectors.map(async (selector) => {
    try {
      console.log(`🔍 Trying selector: ${selector}`)
      await page.waitForSelector(selector, { timeout: timeout / selectors.length })
      console.log(`✅ Found element with selector: ${selector}`)
      return selector
    } catch (error) {
      console.log(`❌ Selector "${selector}" not found`)
      throw error
    }
  })

  try {
    await Promise.race(promises)
  } catch (error) {
    console.error('❌ None of the post-login selectors were found')
    
    // Enhanced debugging for customer sync
    const currentUrl = page.url()
    console.log(`🔍 Current URL: ${currentUrl}`)
    
    // Check if we're still on login page
    if (currentUrl.includes('login')) {
      console.error('⚠️ Still on login page - login may have failed')
      
      // Look for error messages
      const errorSelectors = ['.error', '.alert-danger', '.text-danger', '[class*="error"]']
      for (const errorSelector of errorSelectors) {
        try {
          const errorElements = await page.$$(errorSelector)
          if (errorElements.length > 0) {
            const errorTexts = await Promise.all(
              errorElements.map(el => el.textContent())
            )
            const errors = errorTexts.filter(Boolean)
            if (errors.length > 0) {
              console.error(`🚨 Login errors found: ${JSON.stringify(errors)}`)
            }
          }
        } catch (e) {
          // Ignore selector errors
        }
      }
    }
    
    throw new Error(`Post-login elements not found. Tried selectors: ${selectors.join(', ')}`)
  }
}

/**
 * Enhanced login specifically for customer sync with better error handling
 */
export async function performCustomerSyncLogin(page: Page, credentials: Credentials): Promise<void> {
  console.log('🔐 === CUSTOMER SYNC LOGIN STARTING ===')
  
  await performLogin(page, {
    credentials,
    action: 'customer_sync',
    postLoginTimeout: 15000  // Longer timeout for customer sync
  })
  
  // Log the post-login URL for debugging
  const currentUrl = page.url()
  console.log(`🔍 Post-login URL: ${currentUrl}`)
  
  console.log('✅ Customer sync login verified successfully')
} 