import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSalesOrder } from '@/lib/createSalesOrder'

// Validation schema for sales order creation
const salesOrderSchema = z.object({
  country: z.string().min(1, 'Country is required'),
  customer: z.string().min(1, 'Customer is required'),
  styleNumber: z.string().optional(),
  styleName: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  quantity: z.number().positive().optional(),
  orderType: z.enum(['Pre-order', 'Stock']).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = salesOrderSchema.parse(body)
    
    // Get credentials from environment
    const username = process.env.SPY_USER
    const password = process.env.SPY_PASS
    const systemUrl = process.env.SYSTEM_URL
    
    console.log('🔍 Environment variables check:')
    console.log('SPY_USER:', username ? 'Set' : 'Not set')
    console.log('SPY_PASS:', password ? 'Set' : 'Not set')
    console.log('SYSTEM_URL:', systemUrl || 'Not set')
    
    if (!username || !password) {
      return NextResponse.json(
        { 
          error: 'System credentials not configured',
          message: 'Please create a .env.local file with SPY_USER and SPY_PASS environment variables. See env.example for the required format.',
          details: {
            missing: {
              SPY_USER: !username,
              SPY_PASS: !password
            }
          }
        },
        { status: 500 }
      )
    }

    console.log('📋 Creating sales order with params:', validatedData)
    
    // Create the sales order
    const result = await createSalesOrder(validatedData, { username, password })
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        orderType: result.orderType,
        styleMapping: result.styleMapping
      })
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Failed to create sales order',
          message: result.message
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Error in sales order API:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation error',
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 