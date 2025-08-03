'use client'

import StockDataTable from './StockDataTable'

interface StockData {
  [color: string]: {
    [size: string]: number
    Total: number
  }
}

interface DataDisplayProps {
  data: any
  message: string
}

// Check if data is stock data
function isStockData(data: any): data is StockData {
  if (!data || typeof data !== 'object') return false
  
  // Check if it has the structure of stock data
  return Object.values(data).every(colorData => 
    typeof colorData === 'object' && 
    colorData !== null &&
    'Total' in colorData &&
    typeof colorData.Total === 'number'
  )
}

// Check if data contains multiple stock data types
function isMultiStockData(data: any): data is Record<string, StockData> {
  if (!data || typeof data !== 'object') return false
  
  // Check if all values are stock data
  return Object.values(data).every(value => isStockData(value))
}

// Extract row type from message
function extractRowType(message: string): 'Stock' | 'Available' | 'PO Available' {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('po available') || lowerMessage.includes('purchase order')) {
    return 'PO Available'
  }
  if (lowerMessage.includes('available')) {
    return 'Available'
  }
  return 'Stock'
}

// Extract style name from message
function extractStyleName(message: string): string | undefined {
  // Look for patterns like "for [style]" or "stock for [style]"
  const patterns = [
    /for\s+([a-zA-Z0-9\s]+?)(?:\s+in\s+color|\s*:|\s*$)/i,
    /stock\s+for\s+([a-zA-Z0-9\s]+?)(?:\s+in\s+color|\s*:|\s*$)/i,
    /levels\s+for\s+([a-zA-Z0-9\s]+?)(?:\s+in\s+color|\s*:|\s*$)/i
  ]
  
  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return undefined
}

export default function DataDisplay({ data, message }: DataDisplayProps) {
  if (!data) return null

  // If it's multi-stock data (multiple types), display as separate tables
  if (isMultiStockData(data)) {
    const styleName = extractStyleName(message)
    
    return (
      <div className="mt-3 pt-3 border-t border-gray-200 space-y-4">
        {Object.entries(data).map(([rowType, stockData]) => (
          <StockDataTable 
            key={rowType}
            data={stockData} 
            rowType={rowType as 'Stock' | 'Available' | 'PO Available'}
            styleName={styleName}
          />
        ))}
      </div>
    )
  }

  // If it's single stock data, display as table
  if (isStockData(data)) {
    const rowType = extractRowType(message)
    const styleName = extractStyleName(message)
    
    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <StockDataTable 
          data={data} 
          rowType={rowType}
          styleName={styleName}
        />
      </div>
    )
  }

  // For other data types, display as formatted JSON
  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-xs text-gray-600 mb-2 font-medium">Data Response:</div>
        <pre className="whitespace-pre-wrap overflow-x-auto text-xs text-gray-800">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  )
} 