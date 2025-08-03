'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Star, 
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react'
import CustomerMappingManager from '@/components/CustomerMappingManager'

interface QueryFeedback {
  id: string
  timestamp: Date
  userQuery: string
  detectedIntent: any
  searchParams: any
  success: boolean
  errorMessage?: string
  userRating?: number
  userComment?: string
  processingTime: number
  resultData?: any
}

interface TrainingData {
  successfulQueries: QueryFeedback[]
  failedQueries: QueryFeedback[]
  commonPatterns: string[]
  problematicPatterns: string[]
  suggestions: string[]
}

export default function AdminDashboard() {
  const [trainingData, setTrainingData] = useState<TrainingData | null>(null)
  const [recentFeedback, setRecentFeedback] = useState<QueryFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [insightsRes, recentRes] = await Promise.all([
        fetch('/api/feedback?action=insights'),
        fetch('/api/feedback?action=recent&limit=20')
      ])
      
      if (insightsRes.ok) {
        const insights = await insightsRes.json()
        setTrainingData(insights.data)
      }
      
      if (recentRes.ok) {
        const recent = await recentRes.json()
        setRecentFeedback(recent.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const exportData = async () => {
    try {
      const response = await fetch('/api/feedback?action=export')
      if (response.ok) {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `training-data-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  const totalQueries = (trainingData?.successfulQueries.length || 0) + (trainingData?.failedQueries.length || 0)
  const successRate = totalQueries > 0 ? ((trainingData?.successfulQueries.length || 0) / totalQueries * 100).toFixed(1) : '0'
  const avgProcessingTime = recentFeedback.length > 0 
    ? (recentFeedback.reduce((sum, f) => sum + f.processingTime, 0) / recentFeedback.length).toFixed(0)
    : '0'

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Training Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQueries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Queries</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{trainingData?.failedQueries.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProcessingTime}ms</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customer Mappings</TabsTrigger>
          <TabsTrigger value="failed">Failed Queries</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Successful Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentFeedback
                    .filter(f => f.success)
                    .slice(0, 5)
                    .map(feedback => (
                      <div key={feedback.id} className="p-2 border rounded">
                        <div className="font-medium text-sm">{feedback.userQuery}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(feedback.timestamp).toLocaleString()} • {feedback.processingTime}ms
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Failed Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentFeedback
                    .filter(f => !f.success)
                    .slice(0, 5)
                    .map(feedback => (
                      <div key={feedback.id} className="p-2 border rounded border-red-200 bg-red-50">
                        <div className="font-medium text-sm">{feedback.userQuery}</div>
                        <div className="text-xs text-red-600">{feedback.errorMessage}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(feedback.timestamp).toLocaleString()} • {feedback.processingTime}ms
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers">
          <CustomerMappingManager />
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Failed Queries Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainingData?.failedQueries.map(feedback => (
                  <div key={feedback.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{feedback.userQuery}</div>
                        <div className="text-sm text-red-600 mt-1">{feedback.errorMessage}</div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {new Date(feedback.timestamp).toLocaleString()} • {feedback.processingTime}ms
                        </div>
                      </div>
                      {feedback.userRating && (
                        <div className="flex items-center ml-4">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm ml-1">{feedback.userRating}/5</span>
                        </div>
                      )}
                    </div>
                    {feedback.userComment && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        "{feedback.userComment}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentFeedback.map(feedback => (
                  <div key={feedback.id} className={`p-3 border rounded-lg ${feedback.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{feedback.userQuery}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(feedback.timestamp).toLocaleString()} • {feedback.processingTime}ms
                        </div>
                        {!feedback.success && (
                          <div className="text-sm text-red-600 mt-1">{feedback.errorMessage}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {feedback.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        {feedback.userRating && (
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm ml-1">{feedback.userRating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Common Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {trainingData?.commonPatterns.map((pattern, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{pattern}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Improvement Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {trainingData?.suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                      <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 