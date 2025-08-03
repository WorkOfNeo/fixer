import { openStylePage } from './openStylePage'
import { parseStock } from './parseStock'

interface Credentials {
  username: string
  password: string
}

interface CheckStockOptions {
  query: string
  queryBy: 'no' | 'name'
  row: 'Stock' | 'Available' | 'PO Available'
  credentials: Credentials
}

interface CheckStockResult {
  sku: string
  row: string
  data: {
    [color: string]: {
      [size: string]: number
      Total: number
    }
  }
}

export async function checkStock(options: CheckStockOptions): Promise<CheckStockResult> {
  try {
    // Step 1: Open the style page and get HTML content
    const htmlContent = await openStylePage({
      query: options.query,
      queryBy: options.queryBy,
      credentials: options.credentials,
    })

    // Step 2: Parse the stock data from HTML with the specific row type
    const stockData = parseStock(htmlContent, options.row)

    // Step 3: Return the formatted result
    return {
      sku: options.query,
      row: options.row,
      data: stockData,
    }
  } catch (error) {
    console.error('Error in checkStock:', error)
    throw new Error(`Failed to check stock: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
} 