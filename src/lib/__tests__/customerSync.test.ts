import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { Customer } from '../spy/customerSync'
import { CustomerStorage } from '../data/customerStorage'
import { CustomerLookup, findCustomer, extractCustomerFromQuery } from '../ai/customerLookup'
import fs from 'fs/promises'
import path from 'path'

// Mock data for testing
const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'ABC Corporation',
    editUrl: 'https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CEdit&action=Edit&customer_id=1&uuid=abc-123',
    metadata: {
      lastSync: '2024-01-01T10:00:00Z',
      email: 'contact@abc-corp.com',
      phone: '+45 12345678',
      country: 'Denmark',
      status: 'active'
    }
  },
  {
    id: '2',
    name: 'XYZ Fashion Store',
    editUrl: 'https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CEdit&action=Edit&customer_id=2&uuid=xyz-456',
    metadata: {
      lastSync: '2024-01-01T10:00:00Z',
      email: 'orders@xyz-fashion.com',
      country: 'Sweden',
      status: 'active'
    }
  },
  {
    id: '3',
    name: 'Nordic Style AB',
    editUrl: 'https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CEdit&action=Edit&customer_id=3&uuid=nordic-789',
    metadata: {
      lastSync: '2024-01-01T10:00:00Z',
      country: 'Norway',
      status: 'active'
    }
  }
]

const testDataDir = 'test-data'

describe('Customer Sync System', () => {
  let storage: CustomerStorage
  let lookup: CustomerLookup

  beforeEach(async () => {
    // Use test data directory
    storage = new CustomerStorage(testDataDir)
    lookup = new CustomerLookup(testDataDir)
    
    // Clean up any existing test data
    try {
      await fs.rm(testDataDir, { recursive: true, force: true })
    } catch (error) {
      // Directory might not exist, that's okay
    }
  })

  afterEach(async () => {
    // Clean up test data
    try {
      await fs.rm(testDataDir, { recursive: true, force: true })
    } catch (error) {
      // Directory might not exist, that's okay
    }
  })

  describe('CustomerStorage', () => {
    it('should save and load customers correctly', async () => {
      await storage.saveCustomers(mockCustomers)
      const loadedCustomers = await storage.loadCustomers()
      
      expect(loadedCustomers).toHaveLength(3)
      expect(loadedCustomers[0].name).toBe('ABC Corporation')
      expect(loadedCustomers[0].id).toBe('1')
    })

    it('should return empty array when no data exists', async () => {
      const customers = await storage.loadCustomers()
      expect(customers).toEqual([])
    })

    it('should search customers with exact match', async () => {
      await storage.saveCustomers(mockCustomers)
      
      const result = await storage.searchCustomers('ABC Corporation')
      expect(result.exactMatch).toBeDefined()
      expect(result.exactMatch?.name).toBe('ABC Corporation')
      expect(result.confidence).toBe(1.0)
    })

    it('should search customers with fuzzy matching', async () => {
      await storage.saveCustomers(mockCustomers)
      
      const result = await storage.searchCustomers('ABC Corp')
      expect(result.suggestions).toHaveLength(1)
      expect(result.suggestions[0].name).toBe('ABC Corporation')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should find customer by ID', async () => {
      await storage.saveCustomers(mockCustomers)
      
      const customer = await storage.getCustomerById('2')
      expect(customer?.name).toBe('XYZ Fashion Store')
    })

    it('should return null for non-existent ID', async () => {
      await storage.saveCustomers(mockCustomers)
      
      const customer = await storage.getCustomerById('999')
      expect(customer).toBeNull()
    })

    it('should upsert customers correctly', async () => {
      await storage.saveCustomers(mockCustomers)
      
      // Update existing customer
      const updatedCustomer: Customer = {
        ...mockCustomers[0],
        name: 'ABC Corporation Updated',
        metadata: {
          ...mockCustomers[0].metadata,
          email: 'new@abc-corp.com'
        }
      }
      
      await storage.upsertCustomer(updatedCustomer)
      
      const customers = await storage.loadCustomers()
      const abc = customers.find(c => c.id === '1')
      expect(abc?.name).toBe('ABC Corporation Updated')
      expect(abc?.metadata.email).toBe('new@abc-corp.com')
    })

    it('should add new customer via upsert', async () => {
      await storage.saveCustomers(mockCustomers)
      
      const newCustomer: Customer = {
        id: '4',
        name: 'New Customer Ltd',
        editUrl: 'https://example.com/edit/4',
        metadata: {
          lastSync: new Date().toISOString(),
          status: 'active'
        }
      }
      
      await storage.upsertCustomer(newCustomer)
      
      const customers = await storage.loadCustomers()
      expect(customers).toHaveLength(4)
      
      const newCust = customers.find(c => c.id === '4')
      expect(newCust?.name).toBe('New Customer Ltd')
    })

    it('should remove customer correctly', async () => {
      await storage.saveCustomers(mockCustomers)
      
      const removed = await storage.removeCustomer('2')
      expect(removed).toBe(true)
      
      const customers = await storage.loadCustomers()
      expect(customers).toHaveLength(2)
      expect(customers.find(c => c.id === '2')).toBeUndefined()
    })

    it('should handle storage metadata correctly', async () => {
      await storage.saveCustomers(mockCustomers)
      
      const metadata = await storage.getMetadata()
      expect(metadata?.totalCustomers).toBe(3)
      expect(metadata?.version).toBe('1.0')
      expect(metadata?.lastSync).toBeDefined()
    })
  })

  describe('CustomerLookup', () => {
    beforeEach(async () => {
      await storage.saveCustomers(mockCustomers)
    })

    it('should find exact customer matches', async () => {
      const result = await lookup.findCustomer('ABC Corporation')
      
      expect(result.exactMatch).toBeDefined()
      expect(result.exactMatch?.name).toBe('ABC Corporation')
      expect(result.confidence).toBe(1.0)
      expect(result.searchTime).toBeGreaterThan(0)
    })

    it('should find fuzzy customer matches', async () => {
      const result = await lookup.findCustomer('XYZ Fashion')
      
      expect(result.suggestions).toHaveLength(1)
      expect(result.suggestions[0].name).toBe('XYZ Fashion Store')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should validate existing customer', async () => {
      const result = await lookup.validateCustomerExists('1')
      
      expect(result.isValid).toBe(true)
      expect(result.customer?.name).toBe('ABC Corporation')
    })

    it('should fail validation for non-existent customer', async () => {
      const result = await lookup.validateCustomerExists('999')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should extract customer from natural language query', async () => {
      const result = await lookup.extractCustomerFromQuery('Create order for ABC Corporation in Denmark')
      
      expect(result.detectedCustomer).toBe('ABC Corporation')
      expect(result.extractionMethod).toBe('exact_match')
      expect(result.confidence).toBe(1.0)
    })

    it('should extract customer with fuzzy matching', async () => {
      const result = await lookup.extractCustomerFromQuery('Make order for XYZ Fashion')
      
      expect(result.detectedCustomer).toBe('XYZ Fashion')
      expect(result.extractionMethod).toBe('fuzzy_match')
      expect(result.suggestions).toHaveLength(1)
    })

    it('should handle no customer pattern', async () => {
      const result = await lookup.extractCustomerFromQuery('Check stock for RANY')
      
      expect(result.extractionMethod).toBe('none')
      expect(result.confidence).toBe(0)
    })

    it('should get customer suggestions for autocomplete', async () => {
      const suggestions = await lookup.getCustomerSuggestions('AB', 2)
      
      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].name).toBe('ABC Corporation')
    })

    it('should generate clarification questions', async () => {
      const lookupResult = await lookup.findCustomer('NonExistent Customer')
      const questions = lookup.generateCustomerClarificationQuestions(lookupResult)
      
      expect(questions).toHaveLength(2)
      expect(questions[0]).toContain('NonExistent Customer')
    })

    it('should get customer statistics', async () => {
      const stats = await lookup.getCustomerStats()
      
      expect(stats.totalCustomers).toBe(3)
      expect(stats.customersByCountry).toEqual({
        'Denmark': 1,
        'Sweden': 1,
        'Norway': 1
      })
      expect(stats.recentlyUpdated).toHaveLength(3)
    })

    it('should find customer with business context', async () => {
      const result = await lookup.findCustomerWithContext('ABC', {
        country: 'Denmark',
        preferredCustomers: ['1']
      })
      
      // Should boost ABC Corporation due to Denmark match and preferred status
      expect(result.suggestions[0].name).toBe('ABC Corporation')
      expect(result.confidence).toBeGreaterThan(0.8)
    })
  })

  describe('Global Functions', () => {
    beforeEach(async () => {
      await storage.saveCustomers(mockCustomers)
    })

    it('should work with global findCustomer function', async () => {
      const result = await findCustomer('ABC Corporation')
      
      expect(result.exactMatch?.name).toBe('ABC Corporation')
    })

    it('should work with global extractCustomerFromQuery function', async () => {
      const result = await extractCustomerFromQuery('Order for XYZ Fashion Store')
      
      expect(result.detectedCustomer).toBe('XYZ Fashion Store')
      expect(result.extractionMethod).toBe('exact_match')
    })
  })

  describe('Error Handling', () => {
    it('should handle corrupted storage gracefully', async () => {
      // Create corrupted JSON file
      await fs.mkdir(testDataDir, { recursive: true })
      await fs.writeFile(path.join(testDataDir, 'customers.json'), 'invalid json', 'utf8')
      
      const customers = await storage.loadCustomers()
      expect(customers).toEqual([])
    })

    it('should handle missing data directory', async () => {
      const customers = await storage.loadCustomers()
      expect(customers).toEqual([])
    })

    it('should handle search on empty database', async () => {
      const result = await lookup.findCustomer('Any Customer')
      
      expect(result.suggestions).toEqual([])
      expect(result.confidence).toBe(0)
    })
  })

  describe('Integration Tests', () => {
    it('should work end-to-end: save, search, validate', async () => {
      // Save customers
      await storage.saveCustomers(mockCustomers)
      
      // Search for customer
      const searchResult = await lookup.findCustomer('ABC Corp')
      expect(searchResult.suggestions).toHaveLength(1)
      
      // Validate the found customer
      const customer = searchResult.suggestions[0]
      const validation = await lookup.validateCustomerExists(customer.id)
      expect(validation.isValid).toBe(true)
      expect(validation.customer?.name).toBe('ABC Corporation')
    })

    it('should handle complete customer lookup workflow', async () => {
      await storage.saveCustomers(mockCustomers)
      
      // 1. Extract customer from query
      const extraction = await lookup.extractCustomerFromQuery('Create order for ABC Corporation')
      expect(extraction.extractionMethod).toBe('exact_match')
      
      // 2. Validate the extracted customer
      const foundCustomer = extraction.suggestions[0]
      const validation = await lookup.validateCustomerExists(foundCustomer.id)
      expect(validation.isValid).toBe(true)
      
      // 3. Get customer stats
      const stats = await lookup.getCustomerStats()
      expect(stats.totalCustomers).toBe(3)
    })
  })
})

describe('Similarity Algorithms', () => {
  let storage: CustomerStorage

  beforeEach(async () => {
    storage = new CustomerStorage(testDataDir)
    
    // Clean up
    try {
      await fs.rm(testDataDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore
    }
    
    await storage.saveCustomers(mockCustomers)
  })

  afterEach(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore
    }
  })

  it('should score substring matches highly', async () => {
    const result = await storage.searchCustomers('ABC')
    
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0].name).toBe('ABC Corporation')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('should handle word-based matching', async () => {
    const result = await storage.searchCustomers('Fashion Store')
    
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0].name).toBe('XYZ Fashion Store')
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('should handle typos with Levenshtein distance', async () => {
    const result = await storage.searchCustomers('Nordik Style')
    
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0].name).toBe('Nordic Style AB')
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('should filter out low-confidence matches', async () => {
    const result = await storage.searchCustomers('Completely Different Name')
    
    expect(result.suggestions).toHaveLength(0)
    expect(result.confidence).toBe(0)
  })
}) 