# 2-BIZ Stock Checker

An AI-powered inventory management system with conversational interface for stock checking, sales order creation, and business operations.

## Features

### 🤖 AI Assistant
- **Conversational Interface**: Chat with an AI assistant to perform business operations
- **Intent Classification**: Automatically understands user queries and routes to appropriate actions
- **Clarification System**: Asks follow-up questions when more information is needed
- **Multi-Intent Support**: Handles stock checks, sales orders, B2B login management, and more

### 📦 Stock Management
- **Real-time Stock Checking**: Check inventory levels for specific styles
- **Multiple Query Types**: Search by style number or style name
- **Flexible Row Types**: View Stock, Available, or PO Available quantities
- **Visual Data Display**: Clean, organized presentation of stock data

### 🛒 Sales Order Management
- **Comprehensive Forms**: Complete sales order creation with customer details
- **Stock Validation**: Automatically checks availability before creating orders
- **Customer Management**: Store customer information and delivery details
- **Order Tracking**: Generate unique order IDs and track order status

### 🔧 Technical Features
- **Playwright Scraping**: Automated web scraping for real-time data
- **Cheerio Parsing**: Efficient HTML parsing for stock data extraction
- **TypeScript**: Full type safety and better development experience
- **Modern UI**: Built with Tailwind CSS and shadcn/ui components
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js ≥ 20
- npm or yarn
- Access to the 2-BIZ inventory system
- OpenAI API key for AI features

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd 2-BIZ-STOCK-CHECKER
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```

4. **Configure your credentials in `.env.local`**
   ```env
   # Stock Checker Environment Variables
   SPY_USER=your_username_here
   SPY_PASS=your_password_here
   
   # System URL - replace with your actual inventory system URL
   SYSTEM_URL=http://localhost:3001/login
   
   # OpenAI API Configuration
   # Get your API key from: https://platform.openai.com/api-keys
   OPENAI_API_KEY=your_openai_api_key_here
   ```

5. **Install Playwright browsers**
   ```bash
   npm run playwright:install
   ```

## Usage

### Starting the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Using the AI Assistant

1. **Open the AI Assistant tab**
2. **Ask natural language questions** like:
   - "Check stock for RANY"
   - "How much RANY WHITE 100 do we have?"
   - "Create a sales order for 50 RANY pieces"
   - "What's the available stock for ABC123?"

3. **Follow clarification prompts** if the AI needs more information

### Manual Stock Checking

1. **Open the Stock Check tab**
2. **Select query type**: Style No. or Style Name
3. **Choose row type**: Stock, Available, or PO Available
4. **Enter your query** and click "Check Stock"

### Creating Sales Orders

1. **Open the Sales Order tab**
2. **Fill in required fields**:
   - Style Number or Style Name
   - Color and Size (optional)
   - Quantity
   - Customer Name and Email
   - Delivery Address (optional)
   - Special Instructions (optional)
3. **Click "Create Sales Order"**

## API Endpoints

### `/api/ai` (POST)
Handles AI assistant conversations and intent classification.

**Request Body:**
```json
{
  "message": "Check stock for RANY",
  "conversationHistory": [],
  "isClarification": false,
  "currentIntent": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Found stock information for RANY:",
  "data": { /* stock data */ },
  "intent": { /* classified intent */ },
  "requiresClarification": false,
  "clarificationQuestions": []
}
```

### `/api/stock-check` (POST)
Direct stock checking endpoint.

**Request Body:**
```json
{
  "query": "RANY",
  "queryType": "Style No.",
  "rowType": "Stock"
}
```

## Development

### Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── ai/           # AI assistant endpoint
│   │   └── stock-check/  # Stock checking endpoint
│   ├── globals.css       # Global styles
│   └── page.tsx          # Main application page
├── components/           # React components
│   └── ui/              # shadcn/ui components
├── lib/                 # Utility functions
│   ├── ai/              # AI-related functions
│   │   ├── intentClassifier.ts
│   │   └── actionHandlers.ts
│   ├── openStylePage.ts # Playwright scraper
│   ├── parseStock.ts    # HTML parser
│   └── utils.ts         # General utilities
└── __tests__/           # Test files
```

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
npm start
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SPY_USER` | Username for inventory system | Yes |
| `SPY_PASS` | Password for inventory system | Yes |
| `SYSTEM_URL` | URL of the inventory system | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Yes |

### Customizing AI Behavior

The AI assistant can be customized by modifying the prompts in `src/lib/ai/intentClassifier.ts`:

- **Intent Classification**: Update the prompt to recognize new business operations
- **Entity Extraction**: Modify the entities list to extract different information
- **Clarification Logic**: Adjust when and how the AI asks for clarification

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Ensure `OPENAI_API_KEY` is set in your `.env.local` file
   - Verify the API key is valid and has sufficient credits

2. **"Failed to connect to the system"**
   - Check that `SYSTEM_URL` is correct and accessible
   - Verify your credentials in `SPY_USER` and `SPY_PASS`
   - Ensure the inventory system is running

3. **"No stock data found"**
   - Verify the style number/name exists in the system
   - Check that the row type (Stock/Available/PO Available) has data
   - Ensure the scraper can access the system

4. **Playwright installation issues**
   - Run `npm run playwright:install` to install browser dependencies
   - On Linux, you may need additional system dependencies

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=* npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the troubleshooting section above
- Review the API documentation
- Open an issue on GitHub

---

**Note**: This application requires access to a 2-BIZ inventory system and an OpenAI API key to function properly. Make sure you have the necessary permissions and API access before deployment. 