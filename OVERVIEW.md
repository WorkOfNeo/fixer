# 2-BIZ Stock Checker - Technical Overview & Development Plan

## Project Vision
A white-labelable, multi-tenant AI-powered business operations system that transforms traditional CRM workflows through conversational interfaces, intelligent automation, and seamless integration with existing business systems.

## Current Implementation Status

### 🤖 Core AI System
**Status: Fully Implemented & Production Ready**

#### Intent Classification Engine (`src/lib/ai/intentClassifier.ts`)
- **OpenAI GPT-4 Integration**: Advanced natural language understanding
- **Multi-Intent Support**: Stock checking, sales orders, B2B management, inventory updates, reports
- **Conversation Context**: Maintains conversation history for better understanding
- **Fallback Logic**: Intelligent parsing when AI fails
- **Season Code Detection**: Recently added support for fashion season codes (`.ea25`, `.es24`, `.hs25`, etc.)

#### Smart Query Processing (`src/lib/ai/searchMapper.ts`)
- **Natural Language Mapping**: Converts user queries to system parameters
- **Multiple Row Type Detection**: Automatically determines Stock/Available/PO Available
- **Zero Filter Intelligence**: Detects when users want to exclude zero quantities
- **Season Pattern Recognition**: Identifies style patterns with seasonal indicators
- **Query Type Classification**: Distinguishes between style numbers and style names

#### Action Handlers (`src/lib/ai/actionHandlers.ts`)
- **Stock Check Orchestration**: Complete stock checking workflow
- **Sales Order Processing**: End-to-end order creation with validation
- **Error Handling**: Comprehensive error management and user feedback
- **Data Validation**: Ensures data integrity throughout processes

#### Feedback & Learning System (`src/lib/ai/feedbackSystem.ts`)
- **User Feedback Collection**: Captures user satisfaction and improvement suggestions
- **Performance Tracking**: Monitors AI accuracy and response quality
- **Continuous Improvement**: Foundation for model refinement

### 📦 Inventory Management System
**Status: Fully Implemented & Production Ready**

#### Web Scraping Engine (`src/lib/openStylePage.ts`)
- **Playwright Integration**: Robust browser automation
- **Dynamic Authentication**: Automatic login and session management
- **Real-time Data Extraction**: Live inventory data retrieval
- **Error Recovery**: Handles network issues and system downtime

#### HTML Parser (`src/lib/parseStock.ts`)
- **Cheerio-based Parsing**: Efficient DOM manipulation
- **Multi-format Support**: Handles various HTML structures
- **Data Normalization**: Converts scraped data to consistent format
- **Stock Level Processing**: Extracts quantities across different categories

#### Stock Checking API (`src/lib/checkStock.ts`)
- **Unified Interface**: Single endpoint for all stock queries
- **Type Safety**: Full TypeScript integration
- **Performance Optimization**: Efficient data processing

### 🛒 Sales Order Management
**Status: Fully Implemented & Production Ready**

#### Order Creation System (`src/lib/createSalesOrder.ts`)
- **Complete Order Workflow**: From stock validation to order confirmation
- **Customer Data Management**: Integrated customer information handling
- **Inventory Validation**: Real-time stock checking before order creation
- **Order ID Generation**: Unique identifier system for tracking

#### Customer Mapping (`src/lib/customerMapping.ts`)
- **CSV Import/Export**: Bulk customer data management
- **Data Validation**: Ensures customer information integrity
- **Mapping Intelligence**: Links customer queries to system records
- **Relationship Management**: Maintains customer-business relationships

### 🎨 User Interface
**Status: Fully Implemented & Production Ready**

#### Modern React Components
- **Conversational Chat Interface**: Real-time AI interaction
- **Stock Data Visualization**: Clean, organized data presentation
- **Sales Order Forms**: Comprehensive order creation interfaces
- **Responsive Design**: Mobile and desktop optimization

#### Component Library
- **shadcn/ui Integration**: Modern, accessible UI components
- **Tailwind CSS**: Utility-first styling system
- **TypeScript**: Full type safety across components

---

## 🎯 ACTIONABLE DEVELOPMENT PLAN

### **Phase 1: Sales Order Creation Enhancement** (Week 1-2)
**Objective**: Complete the sales order creation flow following the proven stock checker pattern

#### **Task 1.1: Analyze Existing Stock Checker Pattern**
**AI Instructions**: 
Study the existing stock checker implementation to understand the proven architecture pattern:
1. Examine `src/lib/ai/intentClassifier.ts` - how stock_check intent is classified
2. Review `src/lib/ai/actionHandlers.ts` - how handleStockCheck is implemented
3. Analyze `src/lib/ai/searchMapper.ts` - how parameters are extracted and mapped
4. Study the UI components in `src/components/` - how results are displayed
5. Review the API structure in `src/app/api/` - how endpoints are organized

**What to Explain**:
- The complete flow from user query to result display
- How intent classification works with GPT-4
- Parameter extraction and validation patterns
- Error handling and user feedback mechanisms
- UI component organization and data flow

**AI Prompt for Analysis**:
```
Analyze the stock checker implementation in this codebase. I need you to:

1. **Map the Complete Flow**: Trace how a user query like "check stock for RANY" flows through the system
2. **Identify Key Patterns**: Extract the architectural patterns used for:
   - Intent classification with OpenAI
   - Parameter extraction and validation
   - External system integration (SPY system)
   - Error handling and user feedback
   - UI component structure

3. **Document the Template**: Create a step-by-step template that can be replicated for other business flows

Focus on understanding WHY each decision was made, not just WHAT was implemented.
```

**Deliverables**:
```typescript
// New documentation file:
docs/ARCHITECTURE_PATTERNS.md     // Documented patterns for reuse
```

#### **Task 1.1.5: Customer Database Sync System** 🆕
**Objective**: Create foundational customer lookup system for frictionless sales order creation

**AI Instructions**:
Create a customer synchronization system that scrapes the SPY customer database and maintains a local customer lookup system. This is **critical infrastructure** that eliminates customer lookup friction and enables pre-filled order forms.

**Strategic Context**:
- SPY Customer Overview: `https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CIndex&action=ActiveList`
- Individual Customer URL: `https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CEdit&action=Edit&customer_id={ID}&uuid={UUID}`
- Customer edit pages have "Create Order" buttons that pre-fill customer data
- This eliminates the need for AI to guess customer names and provides direct action links

**What to Explain**:
- How customer data extraction works from SPY system HTML
- Fuzzy search algorithms for customer name matching
- Data storage strategy (JSON for MVP → Supabase migration path)
- Integration points with existing AI intent classification
- Customer ID extraction from URLs and validation

**AI Prompt for Implementation**:
```
Create a customer synchronization system that will become the backbone of our sales order automation.

**Business Context**: 
Currently, when users say "Create order for ABC Corp", the AI has to guess which customer they mean. With this system, we'll have a definitive customer database with exact matches and direct links to pre-filled order forms.

**Technical Context**:
- Use existing Playwright patterns from `src/lib/openStylePage.ts`
- Follow the same authentication and error handling patterns
- Prepare interfaces for future Supabase migration
- Integrate with existing intent classification system

**Your Implementation Tasks**:

1. **Customer Scraper** (`src/lib/spy/customerSync.ts`):
   ```typescript
   interface Customer {
     id: string                    // Extracted from customer_id parameter
     name: string                  // Full customer name from SPY
     editUrl: string              // Direct link to customer edit page
     metadata: {
       email?: string
       phone?: string
       address?: string
       lastSync: string           // ISO timestamp
       uuid?: string              // SPY UUID parameter
     }
   }
   
   export async function syncCustomers(credentials: {
     username: string
     password: string
   }): Promise<Customer[]> {
     console.log('🔄 Starting customer sync from SPY system...')
     
     // 1. Navigate to customer overview page
     // 2. Handle pagination if present
     // 3. Parse customer table/list from HTML
     // 4. Extract customer_id from edit URLs
     // 5. Build complete customer records
     // 6. Return structured customer data
   }
   ```

2. **Customer Storage System** (`src/lib/data/customerStorage.ts`):
   ```typescript
   export class CustomerStorage {
     private customersFile = 'data/customers.json'
     
     async saveCustomers(customers: Customer[]): Promise<void>
     async loadCustomers(): Promise<Customer[]>
     async searchCustomers(query: string): Promise<Customer[]>
     async getCustomerById(id: string): Promise<Customer | null>
     async getLastSyncTime(): Promise<Date | null>
   }
   ```

3. **Fuzzy Customer Lookup** (`src/lib/ai/customerLookup.ts`):
   ```typescript
   export async function findCustomer(query: string): Promise<{
     exactMatch?: Customer
     suggestions: Customer[]
     confidence: number
   }> {
     console.log('🔍 Looking up customer:', query)
     
     // 1. Try exact name match first
     // 2. Try fuzzy matching with similarity scoring
     // 3. Return ranked suggestions
     // 4. Include confidence scoring for AI decision making
   }
   
   export async function validateCustomerExists(customerId: string): Promise<boolean>
   ```

4. **Sync Command/API** (`src/lib/commands/syncCustomers.ts`):
   ```typescript
   export async function runCustomerSync(): Promise<{
     success: boolean
     customersFound: number
     errors?: string[]
     lastSync: string
   }>
   ```

5. **Integration with Intent Classifier**:
   - Enhance customer entity extraction using local database
   - Add customer validation to sales order intent processing
   - Provide customer suggestions in clarification responses

**Implementation Requirements**:
- **Error Handling**: Graceful failures with detailed logging
- **Performance**: Fast customer lookups (consider in-memory caching)
- **Data Validation**: Ensure customer URLs and IDs are valid
- **Backward Compatibility**: Don't break existing sales order flow
- **Future-Proof**: Clean interfaces for Supabase migration

**Testing Strategy**:
- Test customer data extraction from SPY HTML
- Validate fuzzy search with various name variations
- Test customer ID extraction accuracy
- Integration test with sales order flow
- Performance test with large customer datasets

**Migration Path to Supabase**:
- Design interfaces that can easily switch from JSON to database
- Use repository pattern for data access
- Prepare for multi-tenant customer isolation
```

**Deliverables**:
```typescript
// New files:
src/lib/spy/customerSync.ts         // Customer scraping from SPY
src/lib/data/customerStorage.ts     // Customer data management
src/lib/ai/customerLookup.ts        // Customer search and matching
src/lib/commands/syncCustomers.ts   // Sync command/API
data/customers.json                 // Customer data storage (MVP)
src/lib/__tests__/customerSync.test.ts // Comprehensive tests

// Modified files:
src/lib/ai/intentClassifier.ts      // Enhanced customer entity extraction
src/lib/ai/actionHandlers.ts        // Customer validation in sales orders

// New API endpoint:
src/app/api/sync-customers/route.ts // Manual sync trigger
```

**Success Criteria**:
- [ ] Successfully extract customer data from SPY system
- [ ] Customer fuzzy search achieves >90% accuracy on common variations
- [ ] Integration with sales order flow reduces customer lookup friction
- [ ] System handles 1000+ customers with <1s search response time
- [ ] Clean interfaces ready for Supabase migration

#### **Task 1.2: Enhance Intent Classification for Sales Orders**
**AI Instructions**:
Extend the existing intent classifier to better recognize and handle sales order creation requests:
1. Update the OpenAI prompt in `intentClassifier.ts` to include comprehensive sales order examples
2. Add sophisticated entity extraction for customer, quantity, delivery details
3. Implement multi-step conversation handling for missing information
4. Add validation rules for sales order entities

**What to Explain**:
- How to extend OpenAI prompts while maintaining existing functionality
- Entity extraction strategies for complex business operations
- Conversation state management for multi-step flows
- Validation patterns that prevent errors downstream

**AI Prompt for Implementation**:
```
You need to enhance the intent classification system for sales order creation. Here's what you need to do:

**Current Context**: 
- The system already handles stock_check intents successfully
- OpenAI GPT-4 is used for intent classification
- The prompt is in `src/lib/ai/intentClassifier.ts` around line 47

**Your Task**:
1. **Extend the OpenAI Prompt**: Add comprehensive sales order detection
   - Include examples like: "Create order for 50 RANY pieces for customer ABC Corp"
   - "Make sales order: 25 naomi.ea25 WHITE size 100 for John's Fashion Store"
   - "I need to order 30 pieces of style 1010161 in BLACK for delivery to Denmark"

2. **Enhanced Entity Extraction**: Extract these entities for sales orders:
   - styleNumber/styleName (reuse existing logic)
   - customer (company name or person)
   - quantity (number of pieces)
   - color (optional)
   - size (optional)
   - country/deliveryLocation (optional)
   - urgency (optional: rush, normal, etc.)

3. **Conversation Flow Logic**: Handle cases where information is missing:
   - If customer is missing: "Which customer is this order for?"
   - If quantity is missing: "How many pieces do you need?"
   - If style is unclear: use existing style disambiguation

4. **Validation Rules**: Add validation for:
   - Quantity must be positive number
   - Customer name must be provided
   - Style must exist (integrate with existing stock check)

**Implementation Requirements**:
- Maintain backward compatibility with existing stock_check functionality
- Use TypeScript interfaces for type safety
- Add comprehensive logging for debugging
- Handle edge cases gracefully

**Code Quality Standards**:
- Follow existing code patterns exactly
- Add JSDoc comments for all new functions
- Use the same error handling patterns as stock checker
- Maintain the same logging style with emojis
```

**Deliverables**:
```typescript
// Modified files:
src/lib/ai/intentClassifier.ts      // Enhanced prompt and entity extraction

// New interfaces:
interface SalesOrderIntent extends Intent {
  type: 'sales_order'
  entities: {
    styleNumber?: string
    styleName?: string
    customer: string                  // Required for sales orders
    quantity: number                  // Required for sales orders
    color?: string
    size?: string
    country?: string
    deliveryLocation?: string
    urgency?: 'rush' | 'normal' | 'low'
    specialInstructions?: string
  }
}
```

#### **Task 1.3: Create Sales Order Action Handler**
**AI Instructions**:
Create a comprehensive sales order action handler following the exact pattern of `handleStockCheck`:
1. Study `handleStockCheck` implementation in `actionHandlers.ts`
2. Create `handleSalesOrderCreation` with similar structure
3. Implement multi-step conversation flow for missing information
4. Add stock validation before order creation
5. Integrate with existing `createSalesOrder.ts` function
6. Add proper error handling and user feedback

**What to Explain**:
- How the action handler integrates with the intent classifier
- Multi-step conversation management patterns
- Stock validation workflow before order creation
- Error recovery and user guidance strategies
- Integration with existing business logic

**AI Prompt for Implementation**:
```
Create a sales order action handler following the proven stock checker pattern.

**Reference Implementation**: Study `handleStockCheck` in `src/lib/ai/actionHandlers.ts`

**Your Task**: Create `handleSalesOrderCreation` with these capabilities:

1. **Follow the Proven Pattern**:
   - Same function signature style as handleStockCheck
   - Similar parameter validation approach
   - Consistent error handling patterns
   - Same logging and feedback mechanisms

2. **Multi-Step Conversation Flow**:
   ```typescript
   // If missing required information:
   if (!entities.customer) {
     return {
       success: false,
       message: "I need to know which customer this order is for.",
       requiresClarification: true,
       clarificationQuestions: ["Which customer should I create this order for?"]
     }
   }
   
   if (!entities.quantity) {
     return {
       success: false,
       message: "How many pieces do you need for this order?",
       requiresClarification: true,
       clarificationQuestions: ["What quantity should I order?"]
     }
   }
   ```

3. **Stock Validation Integration**:
   - Use existing `checkStock` function to verify availability
   - If insufficient stock, inform user and suggest alternatives
   - Allow user to proceed with partial quantities if they choose

4. **Order Creation Workflow**:
   - Integrate with existing `createSalesOrder` function
   - Handle success and error cases
   - Provide clear feedback with order confirmation details

5. **Error Handling Patterns**:
   - Network errors: "Unable to connect to system, please try again"
   - Validation errors: Clear explanation of what's wrong
   - System errors: Graceful fallback with support contact

**Integration Requirements**:
- Import and use existing `createSalesOrder` from `src/lib/createSalesOrder.ts`
- Import and use existing `checkStock` for validation
- Follow the same response format as other action handlers
- Add to the main `executeAction` function switch statement

**Code Structure**:
```typescript
export async function handleSalesOrderCreation(
  params: SalesOrderParams, 
  originalQuery?: string
): Promise<ActionResponse> {
  console.log('🛒 Sales Order Creation Starting...')
  
  // 1. Validate required parameters
  // 2. Check stock availability  
  // 3. Handle multi-step conversation
  // 4. Create the sales order
  // 5. Return structured response
}
```
```

**Deliverables**:
```typescript
// Modified files:
src/lib/ai/actionHandlers.ts        // Add handleSalesOrderCreation function

// New types:
interface SalesOrderParams {
  styleNumber?: string
  styleName?: string
  customer: string
  quantity: number
  color?: string
  size?: string
  country?: string
  deliveryLocation?: string
  urgency?: 'rush' | 'normal' | 'low'
  specialInstructions?: string
}
```

#### **Task 1.4: Create Sales Order UI Components**
**AI Instructions**:
Create UI components for displaying sales order information in the chat interface:
1. Study how `DataDisplay.tsx` handles stock data presentation
2. Create `SalesOrderDisplay.tsx` for order confirmation display
3. Create `SalesOrderForm.tsx` for interactive order creation
4. Add loading states and error handling
5. Ensure responsive design and accessibility

**What to Explain**:
- Component composition patterns used in the existing UI
- How to display complex business data clearly
- Interactive form patterns for conversational interfaces
- Loading states and error feedback design
- Accessibility considerations for business applications

**AI Prompt for Implementation**:
```
Create sales order UI components following the existing design patterns.

**Reference Components**: Study these existing components:
- `src/components/DataDisplay.tsx` - how stock data is displayed
- `src/components/StockDataTable.tsx` - table formatting patterns
- `src/app/page.tsx` - how components integrate with chat

**Your Task**: Create these components:

1. **SalesOrderDisplay.tsx** - Display order confirmation
   ```typescript
   interface SalesOrderDisplayProps {
     orderData: {
       orderId: string
       customer: string
       items: Array<{
         style: string
         quantity: number
         color?: string
         size?: string
       }>
       totalPieces: number
       status: string
       createdAt: string
     }
     message: string
   }
   ```

2. **SalesOrderForm.tsx** - Interactive order creation
   - Follow the existing form patterns
   - Add real-time validation
   - Include stock checking integration
   - Handle multi-step form flow

3. **Design Requirements**:
   - Use existing Tailwind classes and design tokens
   - Follow the card-based layout pattern
   - Include proper loading states
   - Add success/error feedback
   - Ensure mobile responsiveness

4. **Integration Points**:
   - Integrate with `DataDisplay.tsx` for rendering in chat
   - Use existing UI components from `src/components/ui/`
   - Follow the same styling patterns as stock components

**Component Structure**:
```typescript
// Order confirmation display
export function SalesOrderDisplay({ orderData, message }: SalesOrderDisplayProps) {
  return (
    <div className="mt-4 space-y-4">
      {/* Order summary card */}
      {/* Item details table */}
      {/* Status and actions */}
    </div>
  )
}

// Interactive order form
export function SalesOrderForm({ onSubmit, initialData }: SalesOrderFormProps) {
  // Form state management
  // Validation logic
  // Stock checking integration
  return (
    <form>
      {/* Form fields */}
    </form>
  )
}
```

**Integration with Chat**:
- Modify `DataDisplay.tsx` to handle sales order data
- Add proper type guards for different data types
- Ensure seamless chat experience
```

**Deliverables**:
```typescript
// New files:
src/components/SalesOrderDisplay.tsx  // Order confirmation display
src/components/SalesOrderForm.tsx     // Interactive order creation
src/components/OrderStatusBadge.tsx   // Status indicator component

// Modified files:
src/components/DataDisplay.tsx        // Add sales order support
```

#### **Task 1.5: API Integration and Testing**
**AI Instructions**:
Create API endpoints and comprehensive testing for the sales order flow:
1. Create `/api/sales-order` endpoint following the pattern of existing APIs
2. Integrate with the existing `createSalesOrder.ts` function
3. Add comprehensive error handling and validation
4. Create unit tests for all new functions
5. Create integration tests for the complete flow
6. Test with the chat interface end-to-end

**What to Explain**:
- API design patterns that match existing endpoints
- How to structure responses for conversational interfaces
- Testing strategies for AI-powered features
- Integration testing approaches for complex workflows
- Performance considerations for real-time interactions

**AI Prompt for Implementation**:
```
Create the complete API and testing infrastructure for sales orders.

**Reference Implementation**: Study existing API patterns:
- `src/app/api/ai/route.ts` - main AI endpoint structure
- `src/pages/api/check.ts` - direct business logic endpoint
- `src/lib/createSalesOrder.ts` - existing business logic

**Your Tasks**:

1. **Create Sales Order API Endpoint**:
   ```typescript
   // src/app/api/sales-order/route.ts
   export async function POST(request: NextRequest) {
     // 1. Validate request body
     // 2. Extract and validate parameters
     // 3. Call handleSalesOrderCreation
     // 4. Return structured response
   }
   ```

2. **Integration with AI System**:
   - Ensure the AI endpoint properly routes sales_order intents
   - Test conversation flows with missing information
   - Validate clarification question handling

3. **Comprehensive Testing Suite**:
   ```typescript
   // Unit tests
   describe('handleSalesOrderCreation', () => {
     it('should create order with complete information')
     it('should request clarification for missing customer')
     it('should validate stock before creating order')
     it('should handle system errors gracefully')
   })
   
   // Integration tests
   describe('Sales Order API', () => {
     it('should handle complete order creation flow')
     it('should integrate with existing SPY system')
     it('should return proper error responses')
   })
   
   // E2E tests
   describe('Sales Order Chat Flow', () => {
     it('should create order through conversational interface')
     it('should handle multi-step information gathering')
     it('should display order confirmation properly')
   })
   ```

4. **Error Handling Patterns**:
   - Network timeouts
   - Invalid customer information
   - Insufficient stock
   - System maintenance mode
   - Authentication failures

5. **Performance Requirements**:
   - API response time < 2 seconds
   - Graceful handling of concurrent requests
   - Proper loading states in UI
   - Cached stock data when appropriate

**Testing Scenarios**:
1. **Happy Path**: "Create order for 50 RANY pieces for ABC Corp"
2. **Missing Info**: "Create order for RANY" (should ask for customer and quantity)
3. **Stock Check**: Order quantity exceeds available stock
4. **Error Cases**: Invalid customer, system errors, network issues

**Integration Checklist**:
- [ ] Intent classification recognizes sales order requests
- [ ] Action handler processes all entity types
- [ ] UI components display order data properly
- [ ] API endpoints return consistent responses
- [ ] Error handling works across all layers
- [ ] Tests cover all critical paths
```

**Deliverables**:
```typescript
// New files:
src/app/api/sales-order/route.ts      // Direct sales order API
src/lib/__tests__/salesOrder.test.ts  // Unit tests
src/__tests__/api/salesOrder.test.ts  // API integration tests
src/__tests__/e2e/salesOrder.spec.ts  // End-to-end tests

// Modified files:
src/app/api/ai/route.ts               // Ensure sales_order routing
src/lib/ai/actionHandlers.ts          // Add to executeAction function
```

### **Phase 2: Database Foundation with Supabase** (Week 3-4)
**Objective**: Establish multi-tenant database architecture with Supabase

#### **Task 2.1: Supabase Setup & Configuration**
**AI Instructions**: 
- Set up Supabase project and configure environment variables
- Create database schema with Row Level Security (RLS) for multi-tenancy
- Implement authentication system with Supabase Auth

**What to Explain**:
- Supabase project configuration process
- Database schema design decisions for multi-tenancy
- RLS policies for data isolation
- Authentication flow integration with existing system

**Deliverables**:
```typescript
// New files to create:
src/lib/supabase/client.ts          // Supabase client configuration
src/lib/supabase/auth.ts            // Authentication utilities
src/lib/supabase/types.ts           // Database type definitions
src/lib/supabase/migrations/        // Database migration files
```

**Database Schema**:
```sql
-- Core tables for multi-tenant architecture
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  client_id UUID REFERENCES clients(id),
  order_number TEXT UNIQUE NOT NULL,
  items JSONB NOT NULL,
  total_pieces INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'credit_note', 'sales_order', etc.
  steps JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Task 2.2: Client Lookup Global Component**
**AI Instructions**:
- Create reusable client lookup component with fuzzy search
- Implement Supabase integration for client data
- Add conversation-based client selection interface

**What to Explain**:
- Fuzzy search algorithm implementation
- How the component integrates with chat flow
- Data fetching and caching strategies
- User experience design for client selection

**Deliverables**:
```typescript
// New files:
src/lib/supabase/queries/clients.ts // Client database operations
src/lib/ai/clientLookup.ts          // Client lookup logic
src/components/ClientSelector.tsx   // UI component for client selection
```

### **Phase 3: Credit Note Flow Implementation** (Week 5)
**Objective**: Implement the second new flow type using the established pattern

#### **Task 3.1: Intent Classification Enhancement**
**AI Instructions**:
- Extend intent classifier to recognize credit note requests
- Add credit note entities (client, amount, reason, reference)
- Update OpenAI prompts with credit note examples

#### **Task 3.2: Credit Note Action Handler**
**AI Instructions**:
- Create credit note flow handler with multi-step conversation
- Implement client lookup integration
- Add SPY system integration for credit note creation

### **Phase 4: Flow Template System** (Week 6)
**Objective**: Create reusable flow architecture for rapid feature expansion

#### **Task 4.1: Generic Flow Framework**
**AI Instructions**:
- Design abstract flow class that all flows inherit from
- Create flow state management system
- Implement flow persistence and resume capabilities

#### **Task 4.2: Flow Configuration UI**
**AI Instructions**:
- Create admin interface for flow configuration
- Implement flow builder with drag-and-drop interface
- Add flow testing and preview capabilities

### **Phase 5: Excel Converter & Multi-Tenant Features** (Week 7-8)
**Objective**: Add enterprise features and prepare for white-label deployment

#### **Task 5.1: Excel Converter Implementation**
**AI Instructions**:
- Create Excel file upload and parsing system
- Implement column mapping interface with visual feedback
- Add template management for different client formats

#### **Task 5.2: Multi-Tenant Administration**
**AI Instructions**:
- Create tenant management system
- Implement tenant-specific settings and branding
- Add usage tracking and billing preparation

---

## 📋 **AI DEVELOPMENT GUIDELINES**

### **General Principles**
1. **One Task at a Time**: Complete each task fully before moving to the next
2. **Explain Everything**: Document decisions, trade-offs, and implementation details
3. **Type Safety First**: All new code must be fully typed with TypeScript
4. **Test as You Go**: Write tests for each new component and function
5. **Performance Conscious**: Consider caching, optimization, and scalability

### **Code Quality Standards**
```typescript
// Example of expected code quality:
interface FlowStep {
  id: string
  type: 'question' | 'action' | 'condition'
  data: Record<string, any>
  next?: string | string[]
  validation?: ValidationRule[]
}

class BaseFlow {
  abstract steps: FlowStep[]
  abstract name: string
  
  async execute(context: FlowContext): Promise<FlowResult> {
    // Implementation with proper error handling
  }
}
```

### **Documentation Requirements**
- **Function Documentation**: JSDoc comments for all public functions
- **Component Documentation**: Storybook stories for UI components
- **API Documentation**: OpenAPI specs for all endpoints
- **Architecture Decisions**: ADR documents for major decisions

### **Testing Strategy**
- **Unit Tests**: Jest for business logic
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for critical user flows
- **Component Tests**: React Testing Library for UI

---

## Technical Architecture

### **Updated Stack with Supabase**
```
Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
Backend: Next.js API Routes, Node.js
Database: Supabase (PostgreSQL + Real-time + Auth)
AI: OpenAI GPT-4, Custom NLP Pipeline
Data: Web Scraping (Playwright + Cheerio)
Testing: Jest, Playwright, React Testing Library
Deployment: Vercel + Supabase, Docker compatible
```

### **Scalability Architecture**
- **Database**: Supabase with RLS for multi-tenancy
- **Caching**: Redis for session and query caching
- **File Storage**: Supabase Storage for documents and uploads
- **Real-time**: Supabase real-time for live updates
- **CDN**: Vercel Edge Network for global distribution

### **Security Implementation**
```typescript
// Row Level Security example
CREATE POLICY "tenant_isolation" ON clients
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');

// API route protection
export async function POST(request: NextRequest) {
  const { user, tenant } = await authenticateRequest(request)
  if (!user || !tenant) {
    return new Response('Unauthorized', { status: 401 })
  }
  // Continue with tenant-scoped operations
}
```

---

## **Success Metrics & Milestones**

### **Phase 1 Success Criteria**
- [ ] Supabase integration complete with multi-tenant RLS
- [ ] Client lookup component working in chat interface
- [ ] Authentication flow integrated
- [ ] Database migrations automated

### **Phase 2 Success Criteria**
- [ ] Credit note flow fully functional
- [ ] Client selection working in conversational context
- [ ] SPY system integration complete
- [ ] End-to-end testing passed

### **Phase 3 Success Criteria**
- [ ] Generic flow framework operational
- [ ] New flows can be added in <1 day
- [ ] Flow state persistence working
- [ ] Admin configuration interface functional

### **Phase 4 Success Criteria**
- [ ] Excel converter operational with mapping
- [ ] Multi-tenant administration complete
- [ ] White-label customization available
- [ ] Performance benchmarks met

### **Phase 5 Success Criteria**
- [ ] Document tracking system operational
- [ ] Analytics dashboard providing insights
- [ ] Automated reporting functional
- [ ] System ready for production deployment

---

## **Risk Mitigation**

### **Technical Risks**
- **Supabase RLS Complexity**: Start with simple policies, iterate
- **Flow State Management**: Use proven patterns from Redux/Zustand
- **Performance at Scale**: Implement caching early, monitor metrics
- **Third-party Dependencies**: Maintain fallback strategies

### **Business Risks**
- **Feature Creep**: Strict phase adherence, clear scope definitions
- **User Adoption**: Continuous user testing throughout development
- **Competition**: Focus on unique AI-driven conversation flows
- **Scalability**: Design for 10x growth from day one

---

**Status Legend:**
- ✅ **Fully Implemented**: Production ready
- 🔄 **In Development**: Currently being built
- 📋 **Planned**: Design complete, awaiting development
- 💡 **Conceptual**: Ideas and requirements gathering

This development plan is designed for AI-assisted implementation, with clear task boundaries, comprehensive explanation requirements, and incremental delivery milestones. 