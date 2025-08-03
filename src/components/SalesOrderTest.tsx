'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'react-toastify'

export default function SalesOrderTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    country: '',
    customer: '',
    styleNumber: '',
    styleName: '',
    color: '',
    size: '',
    quantity: '',
    orderType: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/sales-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country: formData.country,
          customer: formData.customer,
          styleNumber: formData.styleNumber || undefined,
          styleName: formData.styleName || undefined,
          color: formData.color || undefined,
          size: formData.size || undefined,
          quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
          orderType: formData.orderType || undefined
        }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message || 'Failed to create sales order')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to create sales order')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales Order Creation Test</CardTitle>
          <CardDescription>
            Test the sales order creation functionality by filling out the form below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country *</Label>
                <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="denmark">Denmark</SelectItem>
                    <SelectItem value="norway">Norway</SelectItem>
                    <SelectItem value="sweden">Sweden</SelectItem>
                    <SelectItem value="finland">Finland</SelectItem>
                    <SelectItem value="germany">Germany</SelectItem>
                    <SelectItem value="france">France</SelectItem>
                    <SelectItem value="netherlands">Netherlands</SelectItem>
                    <SelectItem value="united kingdom">United Kingdom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="customer">Customer *</Label>
                <Input
                  id="customer"
                  value={formData.customer}
                  onChange={(e) => handleInputChange('customer', e.target.value)}
                  placeholder="e.g., AASKOV - ÅRHUS C"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="styleNumber">Style Number</Label>
                <Input
                  id="styleNumber"
                  value={formData.styleNumber}
                  onChange={(e) => handleInputChange('styleNumber', e.target.value)}
                  placeholder="e.g., RANY"
                />
              </div>
              
              <div>
                <Label htmlFor="styleName">Style Name</Label>
                <Input
                  id="styleName"
                  value={formData.styleName}
                  onChange={(e) => handleInputChange('styleName', e.target.value)}
                  placeholder="e.g., Classic Denim"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="e.g., WHITE"
                />
              </div>
              
              <div>
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                  placeholder="e.g., 36"
                />
              </div>
              
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  placeholder="e.g., 10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="orderType">Order Type</Label>
              <Select value={formData.orderType} onValueChange={(value) => handleInputChange('orderType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select order type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pre-order">Pre-order</SelectItem>
                  <SelectItem value="Stock">Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating Sales Order...' : 'Create Sales Order'}
            </Button>
          </form>

          {result && (
            <div className="mt-6 p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 