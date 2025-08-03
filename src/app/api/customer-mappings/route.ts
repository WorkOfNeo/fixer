import { NextRequest, NextResponse } from 'next/server'
import { 
  uploadCustomerMappings, 
  getAllCustomerMappings, 
  exportCustomerMappings,
  findCustomer,
  getCustomerMappingsByCountry
} from '@/lib/customerMapping'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }
    
    const csvContent = await file.text()
    const result = uploadCustomerMappings(csvContent)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error uploading customer mappings:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to upload customer mappings',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const country = searchParams.get('country')
    const searchName = searchParams.get('search')
    
    switch (action) {
      case 'export':
        const csvContent = exportCustomerMappings()
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="customer-mappings.csv"'
          }
        })
      
      case 'search':
        if (!searchName) {
          return NextResponse.json(
            { success: false, message: 'Search name is required' },
            { status: 400 }
          )
        }
        const match = findCustomer(searchName, country || undefined)
        return NextResponse.json({
          success: true,
          match
        })
      
      case 'by-country':
        if (!country) {
          return NextResponse.json(
            { success: false, message: 'Country is required' },
            { status: 400 }
          )
        }
        const countryMappings = getCustomerMappingsByCountry(country)
        return NextResponse.json({
          success: true,
          mappings: countryMappings
        })
      
      default:
        const allMappings = getAllCustomerMappings()
        return NextResponse.json({
          success: true,
          mappings: allMappings
        })
    }
  } catch (error) {
    console.error('❌ Error in customer mappings API:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process request',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 