import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { checkStock } from '@/lib/checkStock'

export const config = {
  api: {
    bodyParser: true,
  },
}

const CheckRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  queryBy: z.enum(['no', 'name'], {
    errorMap: () => ({ message: 'QueryBy must be either "no" or "name"' }),
  }),
  row: z.enum(['Stock', 'Available', 'PO Available'], {
    errorMap: () => ({ message: 'Row must be one of: Stock, Available, PO Available' }),
  }),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Validate request body
    const validatedData = CheckRequestSchema.parse(req.body)
    
    // Check environment variables
    const { SPY_USER, SPY_PASS } = process.env
    if (!SPY_USER || !SPY_PASS) {
      return res.status(500).json({ 
        message: 'Server configuration error: Missing credentials' 
      })
    }

    // Call the stock checking function
    const result = await checkStock({
      query: validatedData.query,
      queryBy: validatedData.queryBy,
      row: validatedData.row,
      credentials: {
        username: SPY_USER,
        password: SPY_PASS,
      },
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('API Error:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: error.errors 
      })
    }

    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
} 