'use client'

import { useState, useEffect } from 'react'
import { Customer } from '@/lib/spy/customerSync'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Mail, Phone, MapPin, ExternalLink, RefreshCw } from 'lucide-react'

interface CustomerListProps {
  onTriggerSync?: () => void
  isSyncing?: boolean
}

interface CustomerMetadata {
  totalCustomers: number
  lastSync?: string
  lastUpdated: string
  version: string
}

export function CustomerList({ onTriggerSync, isSyncing = false }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [metadata, setMetadata] = useState<CustomerMetadata | null>(null)

  // Filter customers based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.metadata.email?.toLowerCase().includes(query) ||
        customer.metadata.country?.toLowerCase().includes(query)
      )
      setFilteredCustomers(filtered)
    }
  }, [customers, searchQuery])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      console.log('📂 Loading customers from API...')
      
      // Load customers via API
      const response = await fetch('/api/customers')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCustomers(data.customers || [])
        setMetadata(data.metadata)
        console.log(`✅ Loaded ${data.customers?.length || 0} customers`)
      } else {
        console.error('❌ Failed to load customers:', data.message)
        setCustomers([])
      }
    } catch (error) {
      console.error('❌ Error loading customers:', error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  // Load customers on mount
  useEffect(() => {
    loadCustomers()
  }, [])

  const handleRefresh = () => {
    loadCustomers()
  }

  const getCountryFlag = (country?: string) => {
    if (!country) return '🌍'
    
    const flags: Record<string, string> = {
      'denmark': '🇩🇰',
      'sweden': '🇸🇪',
      'norway': '🇳🇴',
      'finland': '🇫🇮',
      'germany': '🇩🇪',
      'united kingdom': '🇬🇧',
      'netherlands': '🇳🇱',
      'belgium': '🇧🇪',
      'france': '🇫🇷',
      'spain': '🇪🇸',
      'italy': '🇮🇹'
    }
    
    return flags[country.toLowerCase()] || '🌍'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid date'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Customers</h3>
          <p className="text-gray-600">Please wait while we load your customer database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with stats and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Database</h2>
          <p className="text-gray-600">
            {metadata?.totalCustomers || customers.length} customers 
            {metadata?.lastSync && ` • Last synced ${formatDate(metadata.lastSync)}`}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          {onTriggerSync && (
            <Button
              size="sm"
              onClick={onTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync from SPY'}
            </Button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search customers by name, email, or country..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customer stats */}
      {customers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{customers.length}</div>
              <p className="text-xs text-muted-foreground">Total Customers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {new Set(customers.map(c => c.metadata.country).filter(Boolean)).size}
              </div>
              <p className="text-xs text-muted-foreground">Countries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {customers.filter(c => c.metadata.email).length}
              </div>
              <p className="text-xs text-muted-foreground">With Email</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer list */}
      {customers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Customers Found</h3>
              <p className="text-gray-600 mb-4">
                You haven't synced any customers yet. Start by running a sync from your SPY system.
              </p>
              {onTriggerSync && (
                <Button 
                  onClick={onTriggerSync} 
                  disabled={isSyncing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Customers'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600">
                No customers match your search query "{searchQuery}". Try a different search term.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {customer.name}
                      </h3>
                      {customer.metadata.country && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <span>{getCountryFlag(customer.metadata.country)}</span>
                          <span>{customer.metadata.country}</span>
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                      {customer.metadata.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <a 
                            href={`mailto:${customer.metadata.email}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {customer.metadata.email}
                          </a>
                        </div>
                      )}
                      
                      {customer.metadata.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <a 
                            href={`tel:${customer.metadata.phone}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {customer.metadata.phone}
                          </a>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>SPY ID: {customer.id}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Synced: {formatDate(customer.metadata.lastSync)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex items-center gap-2"
                    >
                      <a
                        href={customer.editUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View in SPY
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 