import SalesOrderTest from '@/components/SalesOrderTest'

export default function SalesOrderTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Order Test</h1>
          <p className="text-gray-600">
            Test the sales order creation functionality
          </p>
        </div>
        <SalesOrderTest />
      </div>
    </div>
  )
} 