import { NextRequest, NextResponse } from 'next/server'
import { getQueryInsights, addUserFeedback, feedbackSystem } from '@/lib/ai/feedbackSystem'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'insights':
        const insights = getQueryInsights()
        return NextResponse.json({
          success: true,
          data: insights
        })
        
      case 'export':
        const exportData = feedbackSystem.exportData()
        return NextResponse.json({
          success: true,
          data: JSON.parse(exportData)
        })
        
      case 'recent':
        const limit = parseInt(searchParams.get('limit') || '10')
        const recentFeedback = feedbackSystem.getRecentFeedback(limit)
        return NextResponse.json({
          success: true,
          data: recentFeedback
        })
        
      case 'failed':
        const failedQueries = feedbackSystem.getFailedQueries()
        return NextResponse.json({
          success: true,
          data: failedQueries
        })
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Use: insights, export, recent, or failed'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in feedback API:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedbackId, rating, comment } = body
    
    if (!feedbackId || !rating) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: feedbackId and rating'
      }, { status: 400 })
    }
    
    if (rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        message: 'Rating must be between 1 and 5'
      }, { status: 400 })
    }
    
    addUserFeedback(feedbackId, rating, comment)
    
    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully'
    })
  } catch (error) {
    console.error('Error recording user feedback:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
} 