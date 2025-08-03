'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-toastify'
import { CustomerMapping } from '@/lib/customerMapping'

export default function CustomerMappingManager() {
  const [mappings, setMappings] = useState<CustomerMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Load mappings on component mount
  useEffect(() => {
    loadMappings()
  }, [])

  const loadMappings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/customer-mappings')
      const data = await response.json()
      
      if (data.success) {
        setMappings(data.mappings)
      } else {
        toast.error('Failed to load customer mappings')
      }
    } catch (error) {
      console.error('Error loading mappings:', error)
      toast.error('Failed to load customer mappings')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setSelectedFile(file)
    } else {
      toast.error('Please select a valid CSV file')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/customer-mappings', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setMappings(data.mappings)
        setSelectedFile(null)
        // Reset file input
        const fileInput = document.getElementById('csv-upload') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/customer-mappings?action=export')
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'customer-mappings.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Customer mappings downloaded successfully')
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Failed to download customer mappings')
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Customer Mappings</CardTitle>
          <CardDescription>
            Upload a CSV file with customer mappings. The system will automatically detect the delimiter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="csv-upload">CSV File</Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported columns: Customer Name, Customer ID, Country, Country ID, Aliases
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload CSV'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownload}
                disabled={mappings.length === 0}
              >
                Download Current Mappings
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = '/sample-customer-mappings.csv'
                  a.download = 'sample-customer-mappings.csv'
                  a.click()
                }}
              >
                Download Sample CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mappings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Mappings</CardTitle>
          <CardDescription>
            {mappings.length} customer mappings loaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading mappings...</div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No customer mappings found. Upload a CSV file to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Customer ID</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Country ID</TableHead>
                    <TableHead>Aliases</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium">
                        {mapping.customerName}
                      </TableCell>
                      <TableCell>{mapping.customerId}</TableCell>
                      <TableCell>{mapping.country}</TableCell>
                      <TableCell>{mapping.countryId}</TableCell>
                      <TableCell>
                        {mapping.aliases && mapping.aliases.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {mapping.aliases.map((alias, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {alias}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={mapping.isActive ? "default" : "secondary"}
                          className={mapping.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {mapping.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Format Example */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Format Example</CardTitle>
          <CardDescription>
            Example of the expected CSV format for customer mappings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm overflow-x-auto">
{`Customer Name,Customer ID,Country,Country ID,Aliases
2-BIZ RESERVER VARER,879,Denmark,1,"2-Biz,2Biz,Reserver"
AASKOV - ÅRHUS C,18,Denmark,1,"Aaskov,Aarhus"
A & G SKIVE ApS,876,Denmark,1,"AG Skive,Skive"`}
            </pre>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Supported delimiters:</strong> Comma (,), Semicolon (;), Tab, Pipe (|)</p>
            <p><strong>Required columns:</strong> Customer Name, Customer ID, Country</p>
            <p><strong>Optional columns:</strong> Country ID, Aliases (comma-separated)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 