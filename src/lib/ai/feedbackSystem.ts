// Feedback and training system for continuous improvement

export interface QueryFeedback {
  id: string
  timestamp: Date
  userQuery: string
  detectedIntent: any
  searchParams: any
  success: boolean
  errorMessage?: string
  userRating?: number // 1-5 stars
  userComment?: string
  processingTime: number
  resultData?: any
}

export interface TrainingData {
  successfulQueries: QueryFeedback[]
  failedQueries: QueryFeedback[]
  commonPatterns: string[]
  problematicPatterns: string[]
  suggestions: string[]
}

class FeedbackSystem {
  private feedback: QueryFeedback[] = []
  private trainingData: TrainingData = {
    successfulQueries: [],
    failedQueries: [],
    commonPatterns: [],
    problematicPatterns: [],
    suggestions: []
  }

  // Record a query attempt
  recordQuery(
    userQuery: string,
    detectedIntent: any,
    searchParams: any,
    success: boolean,
    processingTime: number,
    errorMessage?: string,
    resultData?: any
  ): string {
    const feedback: QueryFeedback = {
      id: Date.now().toString(),
      timestamp: new Date(),
      userQuery,
      detectedIntent,
      searchParams,
      success,
      errorMessage,
      processingTime,
      resultData
    }

    this.feedback.push(feedback)
    
    if (success) {
      this.trainingData.successfulQueries.push(feedback)
    } else {
      this.trainingData.failedQueries.push(feedback)
    }

    console.log(`📊 Feedback recorded: ${success ? '✅' : '❌'} "${userQuery}" (${processingTime}ms)`)
    return feedback.id
  }

  // Add user rating and comment
  addUserFeedback(feedbackId: string, rating: number, comment?: string): void {
    const feedback = this.feedback.find(f => f.id === feedbackId)
    if (feedback) {
      feedback.userRating = rating
      feedback.userComment = comment
      console.log(`⭐ User feedback: ${rating}/5 stars for query "${feedback.userQuery}"`)
    }
  }

  // Analyze patterns and generate insights
  analyzePatterns(): void {
    console.log('🔍 Analyzing query patterns...')
    
    // Analyze successful patterns
    const successfulPatterns = this.trainingData.successfulQueries.map(f => f.userQuery.toLowerCase())
    const failedPatterns = this.trainingData.failedQueries.map(f => f.userQuery.toLowerCase())
    
    // Find common successful patterns
    const patternCounts = new Map<string, number>()
    successfulPatterns.forEach(pattern => {
      const words = pattern.split(' ')
      words.forEach(word => {
        if (word.length > 2) { // Ignore short words
          patternCounts.set(word, (patternCounts.get(word) || 0) + 1)
        }
      })
    })
    
    // Find problematic patterns
    const failedWords = new Set<string>()
    failedPatterns.forEach(pattern => {
      const words = pattern.split(' ')
      words.forEach(word => {
        if (word.length > 2) {
          failedWords.add(word)
        }
      })
    })
    
    this.trainingData.commonPatterns = Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => `${word} (${count} times)`)
    
    this.trainingData.problematicPatterns = Array.from(failedWords)
    
    console.log('📈 Pattern analysis complete')
  }

  // Generate suggestions for improvement
  generateSuggestions(): string[] {
    const suggestions: string[] = []
    
    // Analyze common failure patterns
    const failureReasons = this.trainingData.failedQueries.map(f => f.errorMessage).filter(Boolean)
    const errorCounts = new Map<string, number>()
    
    failureReasons.forEach(error => {
      if (error) {
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1)
      }
    })
    
    // Generate suggestions based on common errors
    errorCounts.forEach((count, error) => {
      if (count > 2) {
        if (error.includes('row type')) {
          suggestions.push(`Add more row type detection patterns for: ${error}`)
        } else if (error.includes('not found')) {
          suggestions.push(`Improve style name/number detection for: ${error}`)
        } else if (error.includes('timeout')) {
          suggestions.push(`Optimize page loading for slow responses`)
        }
      }
    })
    
    // Suggest new zero filter patterns
    const zeroFilterQueries = this.trainingData.failedQueries.filter(f => 
      f.userQuery.toLowerCase().includes('0') || 
      f.userQuery.toLowerCase().includes('zero') ||
      f.userQuery.toLowerCase().includes('more')
    )
    
    if (zeroFilterQueries.length > 0) {
      suggestions.push('Add more zero filter detection patterns')
    }
    
    this.trainingData.suggestions = suggestions
    return suggestions
  }

  // Get training data for AI improvement
  getTrainingData(): TrainingData {
    this.analyzePatterns()
    this.generateSuggestions()
    return this.trainingData
  }

  // Export data for external analysis
  exportData(): string {
    return JSON.stringify({
      feedback: this.feedback,
      trainingData: this.getTrainingData(),
      summary: {
        totalQueries: this.feedback.length,
        successRate: this.feedback.filter(f => f.success).length / this.feedback.length,
        averageProcessingTime: this.feedback.reduce((sum, f) => sum + f.processingTime, 0) / this.feedback.length,
        averageRating: this.feedback.filter(f => f.userRating).reduce((sum, f) => sum + (f.userRating || 0), 0) / this.feedback.filter(f => f.userRating).length
      }
    }, null, 2)
  }

  // Get recent feedback for debugging
  getRecentFeedback(limit: number = 10): QueryFeedback[] {
    return this.feedback
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  // Get failed queries for analysis
  getFailedQueries(): QueryFeedback[] {
    return this.trainingData.failedQueries
  }

  // Check if a pattern is problematic
  isProblematicPattern(query: string): boolean {
    const failedPatterns = this.trainingData.failedQueries.map(f => f.userQuery.toLowerCase())
    return failedPatterns.some(pattern => 
      query.toLowerCase().includes(pattern) || 
      pattern.includes(query.toLowerCase())
    )
  }
}

// Global feedback system instance
export const feedbackSystem = new FeedbackSystem()

// Helper function to record query attempts
export function recordQueryAttempt(
  userQuery: string,
  detectedIntent: any,
  searchParams: any,
  success: boolean,
  processingTime: number,
  errorMessage?: string,
  resultData?: any
): string {
  return feedbackSystem.recordQuery(
    userQuery,
    detectedIntent,
    searchParams,
    success,
    processingTime,
    errorMessage,
    resultData
  )
}

// Helper function to add user feedback
export function addUserFeedback(feedbackId: string, rating: number, comment?: string): void {
  feedbackSystem.addUserFeedback(feedbackId, rating, comment)
}

// Helper function to get insights
export function getQueryInsights(): TrainingData {
  return feedbackSystem.getTrainingData()
} 