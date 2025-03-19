// Enhanced CommonJS server script
const fastify = require('fastify')();
const mongoose = require('mongoose');
const cors = require('@fastify/cors');
const path = require('path');
const { verifyJwtMiddleware } = require('./src/middleware/auth.cjs');
const { VincentSDK } = require('@lit-protocol/vincent-sdk'); // Import the Vincent SDK

// Load environment variables if dotenv is available
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not available, using process.env');
}

// Connect to MongoDB
const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vincent-service-dca';
// Log connection string with hidden password
console.log(`Using MongoDB URI: ${dbUri.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://user:***@')}`);

// Parse MongoDB connection string to get database name
function getDatabaseName(uri) {
  try {
    // Extract database name from URI
    const matches = uri.match(/\/([^/?]+)(\?|$)/);
    return matches ? matches[1] : 'vincent-service-dca';
  } catch (e) {
    return 'vincent-service-dca';
  }
}

// Get database name from URI
const dbName = getDatabaseName(dbUri);
console.log(`Target database name: ${dbName}`);

// Configure CORS with explicit domains
const corsOptions = {
  origin: '*', // Allow all origins for development
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400, // 24 hours in seconds
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Register CORS - must be registered before routes
fastify.register(cors, corsOptions);

// Add a hook to manually set CORS headers for all responses
fastify.addHook('onRequest', (request, reply, done) => {
  const origin = request.headers.origin;
  
  // Check if the origin is allowed
  if (origin && corsOptions.origin.includes(origin)) {
    // Set CORS headers for allowed origins
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS, PATCH');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    reply.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    reply.code(204).send();
    return;
  }
  
  done();
});

// Define models
// Schedule Model
const scheduleSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true,
  },
  purchaseIntervalSeconds: {
    type: Number,
    required: true,
    min: 10,
    max: 31536000,
  },
  purchaseAmount: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\d*\.?\d+$/.test(v);
      },
      message: 'Purchase amount must be a valid decimal number',
    },
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
    index: true,
  },
  registeredAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

scheduleSchema.index({ walletAddress: 1, active: 1 });
scheduleSchema.index({ walletAddress: 1, registeredAt: 1 });

// Add a virtual getter for scheduleId that returns the _id as a string
// This helps maintain backward compatibility with existing code
scheduleSchema.virtual('scheduleId').get(function() {
  return this._id.toString();
});

// Ensure virtuals are included when converting to JSON
scheduleSchema.set('toJSON', { virtuals: true });
scheduleSchema.set('toObject', { virtuals: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);

// PurchasedCoin Model
const purchasedCoinSchema = new mongoose.Schema({
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true,
    index: true,
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  coinAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  price: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\d*\.?\d+$/.test(v);
      },
      message: 'Price must be a valid decimal number',
    },
  },
  purchaseAmount: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\d*\.?\d+$/.test(v);
      },
      message: 'Purchase amount must be a valid decimal number',
    },
  },
  success: {
    type: Boolean,
    required: true,
    default: false,
    index: true,
  },
  error: {
    type: String,
  },
  txHash: {
    type: String,
    sparse: true,
    unique: true,
  },
  purchasedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
});

purchasedCoinSchema.index({ scheduleId: 1, purchasedAt: -1 });
purchasedCoinSchema.index({ scheduleId: 1, success: 1 });

const PurchasedCoin = mongoose.model('PurchasedCoin', purchasedCoinSchema);

// Define routes
// Schedule Routes
async function registerScheduleRoutes() {
  // Get all DCA schedules
  fastify.get('/api/dca/schedules', async () => {
    return await Schedule.find()
      .sort({ registeredAt: -1 }) // Sort by registration date, newest first
      .lean();
  });

  // Get DCA schedules by wallet address
  fastify.get('/api/dca/schedules/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params;
    
    // Only fetch the most recent schedule for this wallet address
    const schedule = await Schedule.findOne({ walletAddress })
      .sort({ registeredAt: -1 }) // Sort by registration date, newest first
      .lean();

    if (!schedule) {
      reply.code(404).send({
        message: `No DCA schedules found for wallet address ${walletAddress}`,
      });
      return;
    }

    // Return as an array with a single item for backward compatibility with frontend
    return [schedule];
  });

  // Get DCA schedule by ID
  fastify.get('/api/dca/schedules/id/:scheduleId', async (request, reply) => {
    const { scheduleId } = request.params;
    const schedule = await Schedule.findOne({ _id: scheduleId }).lean();

    if (!schedule) {
      reply.code(404).send({
        message: `No DCA schedule found with ID ${scheduleId}`,
      });
      return;
    }

    return schedule;
  });

  // Create new DCA schedule
  fastify.post('/api/dca/schedules', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const scheduleData = request.body;
      
      // Validate wallet address format
      if (!scheduleData.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(scheduleData.walletAddress)) {
        return reply.code(400).send({
          message: 'Invalid wallet address format',
        });
      }

      // Log the request
      console.log(`Creating new DCA schedule for wallet ${scheduleData.walletAddress}`);
      
      // First, delete ALL existing schedules for this wallet address
      try {
        const deleteResult = await Schedule.deleteMany({
          walletAddress: scheduleData.walletAddress.toLowerCase()
        });
        
        if (deleteResult.deletedCount > 0) {
          console.log(`Deleted ${deleteResult.deletedCount} existing DCA schedule(s) for wallet ${scheduleData.walletAddress}`);
        }
      } catch (deleteError) {
        console.error(`Error deleting existing schedules: ${deleteError}`);
        // Continue with creating a new schedule even if deletion fails
      }

      // Create a new schedule
      const schedule = new Schedule({
        ...scheduleData,
        active: true,
        registeredAt: new Date(),
      });
      
      await schedule.save();
      
      console.log(`Successfully created new DCA schedule for wallet ${scheduleData.walletAddress}`);
      reply.code(201).send(schedule);
    } catch (error) {
      console.error(`Error creating DCA schedule: ${error}`);
      reply.code(500).send({
        message: 'Failed to create DCA schedule',
        error: error.message,
      });
    }
  });

  // Deactivate DCA schedule
  fastify.patch(
    '/api/dca/schedules/:scheduleId/deactivate',
    { preHandler: verifyJwtMiddleware },
    async (request, reply) => {
      const { scheduleId } = request.params;

      const result = await Schedule.findOneAndUpdate(
        { _id: scheduleId },
        { active: false },
        {
          new: true,
          lean: true
        }
      );

      if (!result) {
        reply.code(404).send({
          message: `No DCA schedule found with ID ${scheduleId}`,
        });
        return;
      }

      return result;
    }
  );

  // Activate DCA schedule
  fastify.patch(
    '/api/dca/schedules/:scheduleId/activate',
    { preHandler: verifyJwtMiddleware },
    async (request, reply) => {
      const { scheduleId } = request.params;

      const result = await Schedule.findOneAndUpdate(
        { _id: scheduleId },
        { active: true },
        {
          new: true,
          lean: true
        }
      );

      if (!result) {
        reply.code(404).send({
          message: `No DCA schedule found with ID ${scheduleId}`,
        });
        return;
      }

      return result;
    }
  );
}

// Purchase Routes
async function registerPurchaseRoutes() {
  // Get all DCA transactions
  fastify.get('/api/dca/transactions', async () => {
    return await PurchasedCoin.find()
      .sort({ purchasedAt: -1 })
      .populate('scheduleId', 'walletAddress')
      .lean();
  });

  // Get all DCA transactions for a wallet address
  fastify.get('/api/dca/transactions/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params;

    const purchases = await PurchasedCoin.find({ walletAddress }).sort({
      purchasedAt: -1,
    }).lean();

    if (purchases.length === 0) {
      reply
        .code(404)
        .send({ error: 'No transactions found for this wallet address' });
      return;
    }

    return purchases;
  });

  // Get latest DCA transaction for a wallet address
  fastify.get(
    '/api/dca/transactions/:walletAddress/latest',
    async (request, reply) => {
      const { walletAddress } = request.params;

      const latestPurchase = await PurchasedCoin.findOne({
        walletAddress,
      }).sort({ purchasedAt: -1 }).lean();

      if (!latestPurchase) {
        reply
          .code(404)
          .send({ error: 'No transactions found for this wallet address' });
        return;
      }

      return latestPurchase;
    }
  );

  // Test balance check functionality
  fastify.post('/api/dca/test/balance-check', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    const { walletAddress, simulatedBalance } = request.body;

    if (!walletAddress) {
      reply.code(400).send({ error: 'Wallet address is required' });
      return;
    }

    try {
      // In a real scenario, we'd use the actual wallet balance
      // For testing, we can use a simulated balance if provided
      let walletBalance = simulatedBalance ? simulatedBalance : "0.05";
      const minRequiredBalance = "0.01";
      
      const isBalanceSufficient = parseFloat(walletBalance) >= parseFloat(minRequiredBalance);

      return {
        walletAddress,
        balance: walletBalance,
        minRequiredBalance: minRequiredBalance,
        isBalanceSufficient,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error('Balance check error:', error);
      reply.code(500).send({ 
        error: 'Failed to check balance', 
        details: error.message 
      });
    }
  });

  // Add a simulation endpoint for testing DCA transactions
  fastify.post('/api/dca/simulate/transaction', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { scheduleId, walletAddress, amount, symbol, name } = request.body;
      
      // Validate required fields
      if (!scheduleId || !walletAddress || !amount) {
        reply.code(400);
        return { error: 'Missing required fields: scheduleId, walletAddress, amount' };
      }
      
      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        reply.code(400);
        return { error: 'Invalid wallet address format' };
      }
      
      // Create a simulated transaction
      const transaction = {
        txId: `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        scheduleId,
        walletAddress,
        amount,
        symbol: symbol || 'ETH',
        name: name || 'Ethereum',
        timestamp: new Date().toISOString(),
        status: 'simulated'
      };
      
      // Log the simulated transaction
      logEvent('INFO', `Simulated transaction for schedule ${scheduleId}`, JSON.stringify(transaction));
      
      // Return the simulated transaction
      return transaction;
    } catch (error) {
      console.error('Error simulating transaction:', error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Spending Limits API Routes
  
  // Set spending policy for a user
  fastify.post('/api/spending-limits/policy', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { limit, period, walletAddress } = request.body;
      
      if (!limit || !period || !walletAddress) {
        return reply.code(400).send({ 
          error: 'Missing required parameters. Please provide limit, period, and walletAddress.' 
        });
      }
      
      // Here you would interact with the spending limits contract
      // This is a placeholder for the actual implementation
      console.log(`Setting spending policy for ${walletAddress}: limit=${limit}, period=${period}`);
      
      // Return success response
      return reply.code(200).send({ 
        success: true, 
        message: 'Spending policy set successfully',
        policy: { limit, period, walletAddress }
      });
    } catch (error) {
      console.error('Error setting spending policy:', error);
      return reply.code(500).send({ error: 'Failed to set spending policy' });
    }
  });
  
  // Get current spending for a user
  fastify.get('/api/spending-limits/current/:walletAddress', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { walletAddress } = request.params;
      
      if (!walletAddress) {
        return reply.code(400).send({ error: 'Wallet address is required' });
      }
      
      // Here you would call the getCurrentSpending function from spendingLimitsAction.js
      // This is a placeholder for the actual implementation
      const mockResponse = {
        success: true,
        currentSpent: "50.00",
        limit: "100.00",
        period: "86400", // 1 day in seconds
        isActive: true
      };
      
      return reply.code(200).send(mockResponse);
    } catch (error) {
      console.error('Error getting current spending:', error);
      return reply.code(500).send({ error: 'Failed to get current spending' });
    }
  });
  
  // Authorize a delegatee for a user
  fastify.post('/api/spending-limits/authorize', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { userWalletAddress, delegateeAddress, status } = request.body;
      
      if (!userWalletAddress || !delegateeAddress || status === undefined) {
        return reply.code(400).send({ 
          error: 'Missing required parameters. Please provide userWalletAddress, delegateeAddress, and status.' 
        });
      }
      
      // Here you would interact with the spending limits contract to authorize the delegatee
      // This is a placeholder for the actual implementation
      console.log(`${status ? 'Authorizing' : 'Deauthorizing'} delegatee ${delegateeAddress} for user ${userWalletAddress}`);
      
      return reply.code(200).send({ 
        success: true, 
        message: `Delegatee ${status ? 'authorized' : 'deauthorized'} successfully`,
        userWalletAddress,
        delegateeAddress,
        status
      });
    } catch (error) {
      console.error('Error authorizing delegatee:', error);
      return reply.code(500).send({ error: 'Failed to authorize delegatee' });
    }
  });
  
  // Check if a transaction would exceed spending limits
  fastify.post('/api/spending-limits/check', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { userWalletAddress, tokenAddress, tokenAmount, tokenDecimals } = request.body;
      
      if (!userWalletAddress || !tokenAddress || !tokenAmount) {
        return reply.code(400).send({ 
          error: 'Missing required parameters. Please provide userWalletAddress, tokenAddress, and tokenAmount.' 
        });
      }
      
      // Here you would call the checkSpendingLimits function from spendingLimitsAction.js
      // This is a placeholder for the actual implementation
      const mockResponse = {
        success: true,
        withinLimit: true,
        usdValue: "25.00",
        tokenAmount,
        tokenPrice: "2000.00" // Example price for ETH
      };
      
      return reply.code(200).send(mockResponse);
    } catch (error) {
      console.error('Error checking spending limits:', error);
      return reply.code(500).send({ error: 'Failed to check spending limits' });
    }
  });
}

// Health check endpoint
fastify.get('/api/health', async (request, reply) => {
  return { 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    memory: process.memoryUsage()
  };
});

// Simple test endpoint to verify route registration
fastify.get('/api/test-route', async (request, reply) => {
  return {
    success: true,
    message: 'Test route is working',
    timestamp: new Date().toISOString()
  };
});

// Test JWT endpoint for debugging
fastify.post('/api/test-jwt', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ 
        error: 'Authentication required', 
        details: 'No Authorization header found or invalid format' 
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Log token details for debugging
    console.log('Received JWT token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('Token length:', token.length);
    
    // Try to use Vincent SDK's JWT methods with the correct approach
    try {
      const vincentSDK = new VincentSDK();
      
      // First, store the JWT - this is required before using other methods
      console.log('Storing JWT in Vincent SDK...');
      await vincentSDK.storeJWT(token);
      console.log('JWT stored successfully');
      
      // Parse the JWT to get the audience
      const tokenParts = token.split('.');
      let audience = 'http://localhost:3001/'; // Default audience
      
      if (tokenParts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          if (payload.aud) {
            audience = payload.aud;
            console.log('Found audience in JWT payload:', audience);
          }
        } catch (error) {
          console.error('Error parsing JWT payload:', error);
        }
      }
      
      // Now verify the JWT with the audience parameter
      console.log('Verifying JWT with audience:', audience);
      const isValid = await vincentSDK.verifyJWT(audience);
      console.log('JWT verification result:', isValid);
      
      // Return the verification result
      return reply.send({
        success: true,
        valid: isValid,
        message: isValid ? 'JWT verified successfully' : 'JWT verification failed',
        audience: audience
      });
    } catch (sdkError) {
      console.error('Error using Vincent SDK to verify JWT:', sdkError);
      
      // Fall back to manual parsing if Vincent SDK fails
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          return reply.code(400).send({ 
            error: 'Invalid token format', 
            details: 'JWT must have 3 parts (header.payload.signature)' 
          });
        }
        
        // Decode header and payload
        const headerStr = Buffer.from(tokenParts[0], 'base64').toString();
        const payloadStr = Buffer.from(tokenParts[1], 'base64').toString();
        
        const header = JSON.parse(headerStr);
        const payload = JSON.parse(payloadStr);
        
        // Return the decoded token information
        return reply.send({
          success: true,
          message: 'JWT parsed successfully (without Vincent SDK)',
          sdkError: sdkError.message,
          tokenInfo: {
            header,
            payload,
            signature: tokenParts[2].substring(0, 10) + '...' // Just show part of the signature
          }
        });
      } catch (parseError) {
        return reply.code(400).send({ 
          error: 'Error parsing JWT', 
          details: parseError.message 
        });
      }
    }
  } catch (error) {
    console.error('Error in test-jwt endpoint:', error);
    return reply.code(500).send({ 
      error: 'Server error', 
      details: error.message 
    });
  }
});

// Test SDK JWT endpoint
fastify.post('/api/test-sdk-jwt', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ 
        error: 'Authentication required', 
        details: 'No Authorization header found or invalid format' 
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Initialize the Vincent SDK
    const vincentSDK = new VincentSDK();
    const results = {};
    
    // Try all available JWT methods in the SDK
    try {
      console.log('Trying Vincent SDK decodeJWT method...');
      results.decodeJWT = vincentSDK.decodeJWT(token);
    } catch (e) {
      results.decodeJWT = { error: e.message };
    }
    
    try {
      console.log('Trying Vincent SDK getJWT method...');
      results.getJWT = vincentSDK.getJWT();
    } catch (e) {
      results.getJWT = { error: e.message };
    }
    
    // Try to store the JWT in the SDK
    try {
      console.log('Trying Vincent SDK storeJWT method...');
      await vincentSDK.storeJWT(token);
      results.storeJWT = { success: true };
      
      // After storing, try to verify
      try {
        console.log('Trying Vincent SDK verifyJWT after storing...');
        const audiences = ["vincent-dca-service", "http://localhost:3001/", "http://localhost:3001"];
        for (const audience of audiences) {
          try {
            console.log(`Attempting to verify JWT with audience: ${audience}`);
            const isValid = await vincentSDK.verifyJWT(token, audience);
            if (isValid) {
              results.verifyJWTAfterStore = { 
                success: true, 
                audience: audience 
              };
              break;
            }
          } catch (err) {
            console.log(`JWT verification failed with audience ${audience}:`, err.message);
            results.verifyJWTAfterStore = { 
              error: err.message,
              audience: audience 
            };
          }
        }
      } catch (e) {
        results.verifyJWTAfterStore = { error: e.message };
      }
    } catch (e) {
      results.storeJWT = { error: e.message };
    }
    
    return reply.send({
      success: true,
      message: 'Vincent SDK JWT methods test results',
      results: results
    });
  } catch (error) {
    console.error('Error in test-sdk-jwt endpoint:', error);
    return reply.code(500).send({ 
      error: 'Server error', 
      details: error.message 
    });
  }
});

// Root endpoint
fastify.get('/api/', async (request, reply) => {
  return { 
    service: 'Vincent DCA Service',
    status: 'running',
    endpoints: [
      { method: 'GET', path: '/api/dca/schedules', description: 'Get all DCA schedules' },
      { method: 'GET', path: '/api/dca/schedules/:walletAddress', description: 'Get DCA schedules by wallet address' },
      { method: 'GET', path: '/api/dca/schedules/id/:scheduleId', description: 'Get DCA schedule by ID' },
      { method: 'POST', path: '/api/dca/schedules', description: 'Create new DCA schedule' },
      { method: 'PATCH', path: '/api/dca/schedules/:scheduleId/deactivate', description: 'Deactivate DCA schedule' },
      { method: 'PATCH', path: '/api/dca/schedules/:scheduleId/activate', description: 'Activate DCA schedule' },
      { method: 'GET', path: '/api/dca/transactions', description: 'Get all DCA transactions' },
      { method: 'GET', path: '/api/dca/transactions/:walletAddress', description: 'Get all DCA transactions for a wallet address' },
      { method: 'GET', path: '/api/dca/transactions/:walletAddress/latest', description: 'Get latest DCA transaction for a wallet address' },
      { method: 'POST', path: '/api/dca/test/balance-check', description: 'Test balance check functionality' },
      { method: 'POST', path: '/api/dca/simulate/transaction', description: 'Simulate a transaction' },
      { method: 'GET', path: '/api/health', description: 'Health check endpoint' }
    ],
    timestamp: new Date().toISOString()
  };
});

// In-memory log storage
const serverLogs = [];

// Custom logger function
function logEvent(type, message, data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    message,
    data
  };
  
  // Don't log to console here to avoid infinite recursion
  serverLogs.push(logEntry);
  
  // Keep logs to a reasonable size
  if (serverLogs.length > 1000) {
    serverLogs.shift();
  }
}

// Override console.log and console.error
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function() {
  const args = Array.from(arguments);
  originalConsoleLog.apply(console, args);
  
  // Only log the first argument as the message
  const message = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
  const data = args.length > 1 ? args.slice(1).join(' ') : '';
  
  logEvent('INFO', message, data);
};

console.error = function() {
  const args = Array.from(arguments);
  originalConsoleError.apply(console, args);
  
  // Only log the first argument as the message
  const message = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
  const data = args.length > 1 ? args.slice(1).join(' ') : '';
  
  logEvent('ERROR', message, data);
};

// Add an endpoint to get the server logs
fastify.get('/api/admin/logs', async (request, reply) => {
  // Return the most recent 100 logs in reverse chronological order (newest first)
  return { logs: serverLogs.slice(-100).reverse() };
});

// Register static files
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/'
});

// Direct route for wallet balance
fastify.post('/api/wallet/balance', async (request, reply) => {
  try {
    const { walletAddress, chainId } = request.body;

    if (!walletAddress) {
      return reply.code(400).send({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }

    // Determine RPC URL based on chain ID
    let rpcUrl;
    if (chainId === '84532') {
      // Base Sepolia
      rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    } else {
      return reply.code(400).send({ 
        success: false, 
        message: 'Unsupported chain ID' 
      });
    }

    console.log(`Fetching balance for ${walletAddress} on chain ${chainId}`);
    
    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Get balance
    const balanceWei = await provider.getBalance(walletAddress);
    const balanceEth = ethers.utils.formatEther(balanceWei);

    console.log(`Balance for ${walletAddress}: ${balanceEth} ETH`);

    return reply.send({
      success: true,
      balance: balanceEth,
      address: walletAddress,
      chainId
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return reply.code(500).send({ 
      success: false, 
      message: 'Failed to fetch wallet balance',
      error: error.message
    });
  }
});

// Direct route for top memecoin
fastify.post('/api/tokens/top-memecoin', async (request, reply) => {
  try {
    const { chainId } = request.body;

    // For Base Sepolia, we'll return a mock top memecoin
    if (chainId === '84532') {
      // Mock data for Base Sepolia
      return reply.send({
        success: true,
        name: "Base Doge",
        symbol: "BDOGE",
        address: "0x4200000000000000000000000000000000000042", // Example address
        decimals: 18,
        price: "0.0042",
        change24h: "+5.2%",
        marketCap: "4200000",
        volume24h: "420000"
      });
    } else {
      return reply.code(400).send({ 
        success: false, 
        message: 'Unsupported chain ID' 
      });
    }
  } catch (error) {
    console.error('Error fetching top memecoin:', error);
    return reply.code(500).send({ 
      success: false, 
      message: 'Failed to fetch top memecoin',
      error: error.message
    });
  }
});

// Direct route for spending limits info
fastify.post('/api/spending-limits/info', async (request, reply) => {
  try {
    const { walletAddress, contractAddress, chainId } = request.body;
    
    if (!walletAddress || !contractAddress) {
      return reply.code(400).send({
        success: false,
        error: 'Wallet address and contract address are required'
      });
    }
    
    // Determine RPC URL based on chain ID
    let rpcUrl;
    if (chainId === '84532') {
      // Base Sepolia
      rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    } else {
      rpcUrl = process.env.RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-api-key";
    }
    
    console.log(`Fetching spending limits for ${walletAddress} on contract ${contractAddress}`);
    
    // For now, return mock data
    return reply.send({
      success: true,
      walletAddress,
      contractAddress,
      spent: '0.1',
      limit: '1.0',
      remaining: '0.9',
      period: '86400', // 1 day in seconds
      isActive: true
    });
  } catch (error) {
    console.error('Error getting spending limit info:', error);
    reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// Start the server
async function start() {
  try {
    // Connect to MongoDB
    console.log('Attempting to connect to MongoDB...');
    
    // Prepare connection options
    const mongooseOptions = {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority',
      authSource: 'admin' // Explicitly set auth source to admin for Atlas
    };
    
    await mongoose.connect(dbUri, mongooseOptions);
    console.log(`Successfully connected to MongoDB`);
    
    // Log database information
    console.log(`Connected to database: ${dbName}`);
    
    // Register routes
    console.log('Registering schedule routes...');
    await registerScheduleRoutes();
    console.log('Schedule routes registered');
    
    console.log('Registering purchase routes...');
    await registerPurchaseRoutes();
    console.log('Purchase routes registered');
    
    // Register tools routes
    console.log('Registering tools routes...');
    fastify.register(require('./src/routes/tools.cjs'), { prefix: '/api/tools' });

    // Comment out the wallet routes to avoid the conflict
    // Register wallet routes
    // console.log('Registering wallet routes...');
    // fastify.register(require('./src/routes/wallet.cjs'), { prefix: '/api/wallet' });

    // Register tokens routes
    console.log('Registering tokens routes...');
    // Comment out the tokens routes to avoid the conflict
    // fastify.register(require('./src/routes/tokens.cjs'), { prefix: '/api/tokens' });

    // Convert spending-limits.js to CommonJS format for consistency
    console.log('Registering spending-limits routes...');
    /*
    // Create a wrapper for the ES module
    const spendingLimitsRoutes = async (fastify, opts) => {
      const { ethers } = require('ethers');
      const { verifyJwtMiddleware } = require('./src/middleware/auth.cjs');
      
      // ABI for the SpendingLimits contract (minimal version for API endpoints)
      const SPENDING_LIMITS_ABI = [
        {
          "inputs": [
            {"internalType": "address", "name": "user", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
          ],
          "name": "checkLimit",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {"internalType": "address", "name": "user", "type": "address"}
          ],
          "name": "getCurrentSpent",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {"internalType": "address", "name": "user", "type": "address"}
          ],
          "name": "getPolicy",
          "outputs": [
            {
              "components": [
                {"internalType": "uint256", "name": "limit", "type": "uint256"},
                {"internalType": "uint256", "name": "period", "type": "uint256"},
                {"internalType": "bool", "name": "isActive", "type": "bool"}
              ],
              "internalType": "struct SpendingLimits.Policy",
              "name": "",
              "type": "tuple"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ];
      
      // Get spending limit info
      fastify.post('/info', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
        try {
          const { walletAddress, contractAddress, chainId, rpcUrl } = request.body;
          
          if (!walletAddress || !contractAddress) {
            return reply.code(400).send({
              success: false,
              error: 'Wallet address and contract address are required'
            });
          }
          
          // Determine RPC URL based on chain ID
          let providerRpcUrl = rpcUrl;
          if (chainId === 84532) {
            // Base Sepolia
            providerRpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
          } else if (!providerRpcUrl) {
            providerRpcUrl = process.env.RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-api-key";
          }
          
          // Create provider and contract instance
          const provider = new ethers.providers.JsonRpcProvider(providerRpcUrl);
          
          // Create contract instance
          const spendingLimitsContract = new ethers.Contract(
            contractAddress,
            SPENDING_LIMITS_ABI,
            provider
          );
          
          // Get current spent amount
          const currentSpent = await spendingLimitsContract.getCurrentSpent(walletAddress);
          
          // Get policy details
          const policy = await spendingLimitsContract.getPolicy(walletAddress);
          
          // Calculate remaining amount
          const limit = ethers.utils.formatUnits(policy.limit, 18);
          const spent = ethers.utils.formatUnits(currentSpent, 18);
          const remaining = Math.max(0, parseFloat(limit) - parseFloat(spent)).toFixed(18);
          
          reply.send({
            success: true,
            walletAddress,
            contractAddress,
            spent,
            limit,
            remaining,
            period: policy.period.toString(),
            isActive: policy.isActive
          });
        } catch (error) {
          console.error('Error getting spending limit info:', error);
          reply.code(500).send({
            success: false,
            error: error.message
          });
        }
      });
    };
    
    fastify.register(spendingLimitsRoutes, { prefix: '/api/spending-limits' });
    */
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server is running on port ${PORT}`);

    // Start the DCA execution process
    startDCAExecutionProcess();
  } catch (err) {
    console.error('Error starting server:', err);
    
    if (err.name === 'MongoServerSelectionError' || err.name === 'MongooseServerSelectionError') {
      console.error('MongoDB connection error details:', {
        message: err.message,
        reason: err.reason ? err.reason.toString() : 'Unknown',
        hosts: err.topology ? Object.keys(err.topology.s.servers).join(', ') : 'Unknown'
      });
      
      // Check if it's an authentication error
      if (err.message && err.message.includes('Authentication failed')) {
        console.error('MongoDB authentication failed. Please check your username and password in the connection string.');
      }
      
      // Check if it's a network error
      if (err.message && err.message.includes('getaddrinfo')) {
        console.error('MongoDB network error. Please check your network connection and MongoDB hostname.');
      }
    }
    
    process.exit(1);
  }
}

// DCA Execution Process
let dcaExecutionInterval;

// Function to start the DCA execution process
function startDCAExecutionProcess() {
  // Clear any existing interval
  if (dcaExecutionInterval) {
    clearInterval(dcaExecutionInterval);
  }
  
  // Check for due DCA transactions every 10 seconds to match the test interval
  dcaExecutionInterval = setInterval(processDCATransactions, 10000);
  console.log('DCA execution process started - checking for transactions every 10 seconds');
}

// Function to process DCA transactions
async function processDCATransactions() {
  try {
    // Find all active schedules
    const activeSchedules = await Schedule.find({ active: true }).lean();
    
    if (activeSchedules.length === 0) {
      return; // No active schedules to process
    }
    
    console.log(`Processing ${activeSchedules.length} active DCA schedules`);
    
    // Current timestamp
    const now = new Date();
    
    // Process each schedule
    for (const schedule of activeSchedules) {
      try {
        // Get the last transaction for this schedule
        const lastTransaction = await PurchasedCoin.findOne({ 
          scheduleId: schedule._id 
        }).sort({ purchasedAt: -1 }).lean();
        
        // Determine if a new transaction should be executed
        let shouldExecute = false;
        
        if (!lastTransaction) {
          // No previous transactions, execute immediately
          shouldExecute = true;
          console.log(`No previous transactions for schedule ${schedule._id}, executing now`);
        } else {
          // Calculate time since last transaction
          const lastPurchaseTime = new Date(lastTransaction.purchasedAt);
          const timeSinceLastPurchase = now.getTime() - lastPurchaseTime.getTime();
          const intervalMs = schedule.purchaseIntervalSeconds * 1000;
          
          // Execute if the interval has passed
          shouldExecute = timeSinceLastPurchase >= intervalMs;
          
          if (shouldExecute) {
            console.log(`Time since last purchase (${timeSinceLastPurchase}ms) exceeds interval (${intervalMs}ms) for schedule ${schedule._id}`);
          }
        }
        
        // Execute the transaction if needed
        if (shouldExecute) {
          await executeDCATransaction(schedule);
        }
      } catch (error) {
        console.error(`Error processing schedule ${schedule._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in DCA execution process:', error);
  }
}

// Function to execute a single DCA transaction
async function executeDCATransaction(schedule) {
  console.log(`Executing DCA transaction for schedule ${schedule._id}`);
  
  try {
    // For demonstration, we'll use a simulated transaction with PEPE token
    const transaction = {
      scheduleId: schedule._id,
      walletAddress: schedule.walletAddress,
      symbol: 'PEPE',
      name: 'Pepe',
      coinAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      price: (Math.random() * 0.0000001 + 0.0000001).toFixed(12), // Random price for demo
      purchaseAmount: schedule.purchaseAmount,
      success: true,
      txHash: `0x${Math.random().toString(16).substring(2, 42)}`, // Random hash for demo
      purchasedAt: new Date()
    };
    
    // Save the transaction to the database
    const purchasedCoin = new PurchasedCoin(transaction);
    await purchasedCoin.save();
    
    console.log(`DCA transaction executed successfully for schedule ${schedule._id}`);
    return transaction;
  } catch (error) {
    console.error(`Error executing DCA transaction for schedule ${schedule._id}:`, error);
    
    // Record the failed transaction
    try {
      const failedTransaction = {
        scheduleId: schedule._id,
        walletAddress: schedule.walletAddress,
        symbol: 'PEPE',
        name: 'Pepe',
        coinAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
        price: '0.0000001',
        purchaseAmount: schedule.purchaseAmount,
        success: false,
        error: error.message || 'Unknown error',
        purchasedAt: new Date()
      };
      
      const purchasedCoin = new PurchasedCoin(failedTransaction);
      await purchasedCoin.save();
      
      console.log(`Recorded failed DCA transaction for schedule ${schedule._id}`);
    } catch (saveError) {
      console.error(`Error saving failed transaction record:`, saveError);
    }
  }
}

start();
