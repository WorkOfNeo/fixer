'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Package, TrendingUp, ShoppingCart } from 'lucide-react'

interface StockData {
  [color: string]: {
    [size: string]: number
    Total: number
  }
}

interface StockDataTableProps {
  data: StockData
  rowType: 'Stock' | 'Available' | 'PO Available'
  styleName?: string
}

const getRowTypeIcon = (rowType: string) => {
  switch (rowType) {
    case 'Stock':
      return <Package className="w-4 h-4" />
    case 'Available':
      return <ShoppingCart className="w-4 h-4" />
    case 'PO Available':
      return <TrendingUp className="w-4 h-4" />
    default:
      return <Package className="w-4 h-4" />
  }
}

const getRowTypeColor = (rowType: string) => {
  switch (rowType) {
    case 'Stock':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'Available':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'PO Available':
      return 'text-purple-600 bg-purple-50 border-purple-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const getQuantityColor = (quantity: number) => {
  if (quantity === 0) return 'text-red-600 font-medium'
  if (quantity < 10) return 'text-orange-600 font-medium'
  if (quantity < 50) return 'text-yellow-600 font-medium'
  return 'text-green-600 font-medium'
}

export default function StockDataTable({ data, rowType, styleName }: StockDataTableProps) {
  const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'color' | 'total'>('total')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Get all unique sizes from the data
  const allSizes = new Set<string>()
  Object.values(data).forEach(colorData => {
    Object.keys(colorData).forEach(key => {
      if (key !== 'Total') {
        allSizes.add(key)
      }
    })
  })
  const sortedSizes = Array.from(allSizes).sort((a, b) => {
    // Sort sizes numerically if they're numbers
    const aNum = parseInt(a)
    const bNum = parseInt(b)
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum
    }
    return a.localeCompare(b)
  })

  // Sort colors
  const sortedColors = Object.entries(data).sort(([colorA, dataA], [colorB, dataB]) => {
    if (sortBy === 'total') {
      return sortOrder === 'desc' 
        ? dataB.Total - dataA.Total 
        : dataA.Total - dataB.Total
    } else {
      return sortOrder === 'desc' 
        ? colorB.localeCompare(colorA)
        : colorA.localeCompare(colorB)
    }
  })

  const toggleColor = (color: string) => {
    const newExpanded = new Set(expandedColors)
    if (newExpanded.has(color)) {
      newExpanded.delete(color)
    } else {
      newExpanded.add(color)
    }
    setExpandedColors(newExpanded)
  }

  const toggleSort = (newSortBy: 'color' | 'total') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  const totalStock = Object.values(data).reduce((sum, colorData) => sum + colorData.Total, 0)
  const colorsWithStock = Object.values(data).filter(colorData => colorData.Total > 0).length

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b ${getRowTypeColor(rowType)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getRowTypeIcon(rowType)}
            <div>
              <h3 className="font-semibold text-sm">
                {rowType} Data {styleName && `for ${styleName}`}
              </h3>
              <p className="text-xs opacity-75">
                {colorsWithStock} colors with stock • {totalStock} total items
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => toggleSort('total')}
              className={`px-2 py-1 rounded ${
                sortBy === 'total' ? 'bg-white bg-opacity-50' : 'hover:bg-white hover:bg-opacity-25'
              }`}
            >
              Total {sortBy === 'total' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => toggleSort('color')}
              className={`px-2 py-1 rounded ${
                sortBy === 'color' ? 'bg-white bg-opacity-50' : 'hover:bg-white hover:bg-opacity-25'
              }`}
            >
              Color {sortBy === 'color' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Color
              </th>
              {sortedSizes.map(size => (
                <th key={size} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {size}
                </th>
              ))}
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedColors.map(([color, colorData]) => {
              const isExpanded = expandedColors.has(color)
              const hasStock = colorData.Total > 0
              
              return (
                <tr key={color} className={`hover:bg-gray-50 ${!hasStock ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleColor(color)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                      </button>
                      <span className="font-medium text-sm">{color}</span>
                      {!hasStock && (
                        <span className="text-xs text-gray-400">(No stock)</span>
                      )}
                    </div>
                  </td>
                  
                  {/* Size columns */}
                  {sortedSizes.map(size => (
                    <td key={size} className="px-2 py-3 text-center">
                      <span className={`text-sm ${getQuantityColor(colorData[size] || 0)}`}>
                        {colorData[size] || 0}
                      </span>
                    </td>
                  ))}
                  
                  {/* Total column */}
                  <td className="px-4 py-3 text-center border-l border-gray-200">
                    <span className={`font-semibold text-sm ${getQuantityColor(colorData.Total)}`}>
                      {colorData.Total}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <div className="text-gray-600">
            Showing {sortedColors.length} colors
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>0</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>1-9</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>10-49</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>50+</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 