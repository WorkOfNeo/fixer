'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Search, 
  ExternalLink, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Building,
  User,
  Hash,
  RefreshCw
} from 'lucide-react'
import { Customer } from '@/lib/spy/customerSync'

interface SyncedCustomerDataProps {
  refreshTrigger?: number
}

export function SyncedCustomerData({ refreshTrigger = 0 }: SyncedCustomerDataProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)

  // Filter customers based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers.slice(0, 20)) // Show first 20 by default
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.id.includes(query) ||
        customer.metadata.country?.toLowerCase().includes(query) ||
        customer.metadata.salesperson?.toLowerCase().includes(query)
      )
      setFilteredCustomers(filtered.slice(0, 20)) // Limit to 20 results
    }
  }, [customers, searchQuery])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/customers')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCustomers(data.customers || [])
        setLastSync(data.metadata?.lastSync || null)
        console.log(`📊 Loaded ${data.customers?.length || 0} customers for verification`)
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

  useEffect(() => {
    loadCustomers()
  }, [refreshTrigger])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const getCountryFlag = (country?: string) => {
    const countryFlags: Record<string, string> = {
      'Denmark': '🇩🇰',
      'Norway': '🇳🇴',
      'Sweden': '🇸🇪',
      'Finland': '🇫🇮',
      'Germany': '🇩🇪',
      'United Kingdom': '🇬🇧',
      'France': '🇫🇷',
      'Netherlands': '🇳🇱',
    }
    return countryFlags[country || ''] || '🌍'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span>Loading customer data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Synced Customer Data
        </CardTitle>
        <CardDescription>
          Verify the {customers.length} customers that were synced from SPY system
          {lastSync && ` • Last synced: ${formatDate(lastSync)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search customers by name, ID, country, or salesperson..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{customers.length}</div>
            <div className="text-xs text-gray-500">Total Customers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{filteredCustomers.length}</div>
            <div className="text-xs text-gray-500">Showing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {new Set(customers.map(c => c.metadata.country)).size}
            </div>
            <div className="text-xs text-gray-500">Countries</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(customers.map(c => c.metadata.salesperson)).size}
            </div>
            <div className="text-xs text-gray-500">Salespeople</div>
          </div>
        </div>

        {/* Customer List */}
        {customers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No customers found. Run a sync to see customer data here.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredCustomers.map((customer, index) => (
              <div
                key={customer.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        <Hash className="w-3 h-3 mr-1" />
                        {customer.id}
                      </Badge>
                      {customer.metadata.country && (
                        <Badge variant="outline" className="text-xs">
                          <span className="mr-1">{getCountryFlag(customer.metadata.country)}</span>
                          {customer.metadata.country}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      {customer.metadata.salesperson && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{customer.metadata.salesperson}</span>
                        </div>
                      )}
                      {customer.metadata.brand && (
                        <div className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          <span>{customer.metadata.brand}</span>
                        </div>
                      )}
                      {customer.metadata.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{customer.metadata.phone}</span>
                        </div>
                      )}
                      {customer.metadata.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{customer.metadata.email}</span>
                        </div>
                      )}
                      {customer.metadata.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{customer.metadata.address}</span>
                        </div>
                      )}
                      {customer.metadata.lastSync && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(customer.metadata.lastSync)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {customer.editUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="ml-4"
                    >
                      <a 
                        href={customer.editUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Edit in SPY
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery && filteredCustomers.length === 0 && customers.length > 0 && (
          <div className="text-center py-4 text-gray-500">
            No customers found matching "{searchQuery}"
          </div>
        )}

        {customers.length > 20 && !searchQuery && (
          <div className="text-center text-sm text-gray-500">
            Showing first 20 customers. Use search to find specific customers.
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCustomers}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
          <div className="text-sm text-gray-500">
            Total: {customers.length} customers
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 