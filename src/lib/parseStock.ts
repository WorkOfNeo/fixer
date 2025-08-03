import * as cheerio from 'cheerio'

interface StockData {
  [color: string]: {
    [size: string]: number
    Total: number
  }
}

export function parseStock(html: string, rowType: 'Stock' | 'Available' | 'PO Available'): StockData {
  const $ = cheerio.load(html)
  const stockData: StockData = {}

  // Find the div with data-tab-name="statandstock"
  const statAndStockContainer = $('div[data-tab-name="statandstock"]')
  
  if (statAndStockContainer.length === 0) {
    throw new Error('Stat and Stock tab content not found on page')
  }

  // Find all .statAndStockBox elements within the container
  const stockBoxes = statAndStockContainer.find('.statAndStockBox')
  
  if (stockBoxes.length === 0) {
    // Try alternative selectors if .statAndStockBox is not found
    const alternativeBoxes = statAndStockContainer.find('div').filter((_, el) => {
      const $el = $(el)
      return $el.find('tr.tableBackgroundBlack').length > 0
    })
    
    if (alternativeBoxes.length === 0) {
      throw new Error('No stock data boxes found on page')
    }
    
    console.log(`Found ${alternativeBoxes.length} stock boxes using alternative selector`)
    
    // Process alternative boxes
    alternativeBoxes.each((_, stockBox) => {
      processStockBox($, $(stockBox), stockData, rowType)
    })
  } else {
    console.log(`Found ${stockBoxes.length} stock boxes`)
    
    // Process each stock box
    stockBoxes.each((_, stockBox) => {
      processStockBox($, $(stockBox), stockData, rowType)
    })
  }

  if (Object.keys(stockData).length === 0) {
    // Try to find what row types are actually available
    const availableRowTypes = new Set<string>()
    statAndStockContainer.find('tr').each((_, row) => {
      const $row = $(row)
      const firstCell = $row.find('td:first-child strong')
      const rowText = firstCell.text().trim()
      if (rowText) {
        availableRowTypes.add(rowText)
      }
    })
    
    const availableTypes = Array.from(availableRowTypes).join(', ')
    throw new Error(`No stock data could be parsed for row type: "${rowType}". Available row types: ${availableTypes}`)
  }

  console.log(`Successfully parsed stock data for ${Object.keys(stockData).length} colors`)
  return stockData
}

function processStockBox($: cheerio.CheerioAPI, $stockBox: cheerio.Cheerio<any>, stockData: StockData, rowType: 'Stock' | 'Available' | 'PO Available') {
  // Get the color name from the first row, first cell
  const colorCell = $stockBox.find('tr.tableBackgroundBlack td:first-child strong')
  if (colorCell.length === 0) {
    console.log('Skipping stock box - no color found')
    return
  }
  
  // Extract color name (remove any extra elements like sprites)
  let colorName = colorCell.text().trim()
  // Remove any extra whitespace and newlines
  colorName = colorName.replace(/\s+/g, ' ').trim()
  
  console.log(`Processing color: ${colorName}`)
  
  // Initialize color data
  stockData[colorName] = {
    Total: 0,
  }

  // Get the header row to extract sizes
  const headerRow = $stockBox.find('tr.tableBackgroundBlack')
  const sizeHeaders: string[] = []
  
  headerRow.find('td').each((index: number, cell: any) => {
    if (index === 0) return // Skip the color column
    const size = $(cell).text().trim()
    if (size && size !== 'Total') {
      sizeHeaders.push(size)
    }
  })

  console.log(`Found sizes: ${sizeHeaders.join(', ')}`)

  // Find the row that matches our row type
  let targetRow: any = null
  const availableRowTypes: string[] = []
  
  $stockBox.find('tr').each((_, row) => {
    const $row = $(row)
    const firstCell = $row.find('td:first-child strong')
    const rowText = firstCell.text().trim()
    
    if (rowText) {
      availableRowTypes.push(rowText)
      
      if (rowText === rowType) {
        targetRow = $row
        return false // break the loop
      }
    }
  })

  if (!targetRow) {
    console.log(`Row type "${rowType}" not found for color ${colorName}. Available types: ${availableRowTypes.join(', ')}`)
    
    // Try to find a similar row type as fallback
    const fallbackRowType = findFallbackRowType(rowType, availableRowTypes)
    if (fallbackRowType) {
      console.log(`Using fallback row type: ${fallbackRowType}`)
      $stockBox.find('tr').each((_, row) => {
        const $row = $(row)
        const firstCell = $row.find('td:first-child strong')
        const rowText = firstCell.text().trim()
        
        if (rowText === fallbackRowType) {
          targetRow = $row
          return false // break the loop
        }
      })
    }
    
    if (!targetRow) {
      console.log(`No suitable row type found for color ${colorName}`)
      return
    }
  }

  // Extract quantities from the target row
  targetRow.find('td').each((index: number, cell: any) => {
    if (index === 0) return // Skip the row type column
    
    const size = sizeHeaders[index - 1]
    if (!size) return
    
    const quantityText = $(cell).text().trim()
    const quantity = parseInt(quantityText, 10) || 0
    
    stockData[colorName][size] = quantity
    stockData[colorName].Total += quantity
  })

  console.log(`Color ${colorName} - ${rowType}: ${JSON.stringify(stockData[colorName])}`)
}

function findFallbackRowType(requestedType: string, availableTypes: string[]): string | null {
  // Map of fallback preferences
  const fallbackMap: Record<string, string[]> = {
    'PO Available': ['Available', 'Stock'],
    'Available': ['Stock', 'PO Available'],
    'Stock': ['Available', 'PO Available']
  }
  
  const fallbacks = fallbackMap[requestedType] || []
  
  for (const fallback of fallbacks) {
    if (availableTypes.includes(fallback)) {
      return fallback
    }
  }
  
  // If no specific fallback found, return the first available type
  return availableTypes.length > 0 ? availableTypes[0] : null
} 