import { NextRequest, NextResponse } from 'next/server'
import { classifyIntent, processClarification } from '@/lib/ai/intentClassifier'
import { executeAction } from '@/lib/ai/actionHandlers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory = [], isClarification = false, currentIntent = null } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file.' },
        { status: 500 }
      )
    }

    let intent
    if (isClarification && currentIntent) {
      // Process clarification
      intent = await processClarification(currentIntent, message)
    } else {
      // Classify new intent
      intent = await classifyIntent(message, conversationHistory)
    }

    // Execute the action based on the intent
    const result = await executeAction(intent, message)

    // Prepare response
    const response = {
      success: result.success,
      message: result.message,
      data: result.data,
      intent: intent,
      requiresClarification: result.requiresClarification,
      clarificationQuestions: result.clarificationQuestions,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in AI API route:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 