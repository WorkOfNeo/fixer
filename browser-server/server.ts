import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import sync functions
import { syncCustomers, enhancedSyncCustomers } from './lib/spy/customerSync';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'browser-automation-server',
    timestamp: new Date().toISOString(),
    environment: {
      node_version: process.version,
      has_spy_credentials: !!(process.env.SPY_USER && process.env.SPY_PASS),
      storage_type: process.env.CUSTOMER_STORAGE_TYPE || 'json'
    }
  });
});

// Customer sync endpoint
app.post('/sync-customers', async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🔄 [${requestId}] Browser automation sync request received`);
  
  try {
    const { action = 'enhanced' } = req.body;
    
    console.log(`🔄 [${requestId}] Action: ${action}`);
    console.log(`🔄 [${requestId}] Environment check:`);
    console.log(`   SPY_USER: ${process.env.SPY_USER ? 'provided' : 'missing'}`);
    console.log(`   SPY_PASS: ${process.env.SPY_PASS ? 'provided' : 'missing'}`);
    
    // Check credentials
    if (!process.env.SPY_USER || !process.env.SPY_PASS) {
      return res.status(400).json({
        success: false,
        error: 'Missing SPY_USER or SPY_PASS environment variables',
        requestId
      });
    }
    
    // Run the appropriate sync function
    let syncResult;
    const startTime = Date.now();
    
    const credentials = {
      username: process.env.SPY_USER,
      password: process.env.SPY_PASS
    };
    
    switch (action) {
      case 'enhanced':
        console.log(`🔄 [${requestId}] Running enhanced sync...`);
        syncResult = await enhancedSyncCustomers(credentials);
        break;
      case 'quick':
      case 'standard':
      default:
        console.log(`🔄 [${requestId}] Running standard sync...`);
        syncResult = await syncCustomers(credentials);
        break;
    }
    
    const result = {
      ...syncResult,
      duration: Date.now() - startTime,
      requestId,
      operation: action
    };
    
    console.log(`✅ [${requestId}] Sync completed: ${result.success}`);
    res.json(result);
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Sync error:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      requestId
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Browser Automation Server running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 SPY credentials: ${process.env.SPY_USER ? 'configured' : 'missing'}`);
});