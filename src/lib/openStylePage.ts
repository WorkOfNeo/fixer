import { chromium, Browser, Page } from 'playwright'
import { performLogin, Credentials } from './auth/dynamicLogin'

interface OpenStylePageOptions {
  query: string
  queryBy: 'no' | 'name'
  credentials: Credentials
}

export async function openStylePage({
  query,
  queryBy,
  credentials,
}: OpenStylePageOptions): Promise<string> {
  let browser: Browser | null = null
  let page: Page | null = null

  try {
    console.log('Launching browser...')
    browser = await chromium.launch({ headless: true })
    page = await browser.newPage()

    // Use dynamic login for stock checking
    await performLogin(page, {
      credentials,
      action: 'stock_check'
    })

    // Construct the search URL based on query type
    console.log(`Searching for: ${query} (by ${queryBy})`)
    let searchUrl: string
    
    if (queryBy === 'no') {
      searchUrl = `https://2-biz.spysystem.dk/?controller=Style%5CIndex&action=List&Spy\\Model\\Style\\Index\\ListReportSearch[bForceSearch]=true&Spy\\Model\\Style\\Index\\ListReportSearch[strStyleNo]=${encodeURIComponent(query)}`
    } else {
      searchUrl = `https://2-biz.spysystem.dk/?controller=Style%5CIndex&action=List&Spy\\Model\\Style\\Index\\ListReportSearch[bForceSearch]=true&Spy\\Model\\Style\\Index\\ListReportSearch[strStyleName]=${encodeURIComponent(query)}`
    }
    
    console.log(`Navigating to search URL: ${searchUrl}`)
    await page.goto(searchUrl)

    // Wait for the table container to load
    console.log('Waiting for #TableContainer to load...')
    await page.waitForSelector('#TableContainer', { timeout: 10000 })

    // Wait for the tbody with results
    console.log('Waiting for search results table...')
    await page.waitForSelector('#TableContainer tbody tr', { timeout: 10000 })

    // Find the row that matches our search query
    console.log('Looking for matching result...')
    const rows = await page.$$('#TableContainer tbody tr')
    
    let foundRow = false
    for (const row of rows) {
      const rowText = await row.textContent()
      if (rowText && rowText.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found matching row: ${rowText}`)
        
        // Find the number link (the only <a> tag in the row)
        const link = await row.$('a')
        if (link) {
          console.log('Clicking the number link...')
          await link.click()
          foundRow = true
          break
        }
      }
    }
    
    if (!foundRow) {
      throw new Error(`No matching result found for query: ${query}`)
    }

    // Wait for style details to load
    console.log('Waiting for style details to load...')
    await page.waitForSelector('td[data-tab-name="statandstock"]', { timeout: 10000 })

    // Click on "Stat and Stock" tab to make content visible
    console.log('Clicking Stat and Stock tab to make content visible...')
    await page.click('td[data-tab-name="statandstock"]')

    // Wait a bit for the content to load after clicking the tab
    console.log('Waiting for content to load after tab click...')
    await page.waitForTimeout(2000)

    // Wait for the stat_and_stock_container to load
    console.log('Waiting for #stat_and_stock_container to load...')
    await page.waitForSelector('#stat_and_stock_container', { timeout: 10000 })

    // Wait for statAndStockBox elements to be present
    console.log('Waiting for .statAndStockBox elements...')
    await page.waitForSelector('.statAndStockBox', { timeout: 10000 })

    // Verify we have content by checking the number of stat boxes
    const statBoxes = await page.$$('.statAndStockBox')
    console.log(`Found ${statBoxes.length} stat and stock boxes`)
    
    if (statBoxes.length === 0) {
      throw new Error('No stat and stock boxes found on the page')
    }

    // Get the page content
    console.log('Getting page content...')
    const content = await page.content()
    console.log('Successfully retrieved page content')
    return content

  } catch (error) {
    console.error('Error in openStylePage:', error)
    if (error instanceof Error && error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      throw new Error(
        'Failed to connect to the system. Please check:\n' +
        '1. The SYSTEM_URL environment variable is set correctly\n' +
        '2. The system is running and accessible\n' +
        '3. The URL format is correct (e.g., http://localhost:3001/login)'
      )
    }
    throw new Error(`Failed to open style page: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    if (page) await page.close()
    if (browser) await browser.close()
  }
} 