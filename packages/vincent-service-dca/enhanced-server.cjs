// Enhanced CommonJS server script
const fastify = require('fastify')();
const mongoose = require('mongoose');
const cors = require('@fastify/cors');
const path = require('path');

// Connect to MongoDB
const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vincent-service-dca';

// Configure CORS with explicit Vercel domain
const corsOptions = {
  origin: ['https://vincent-dca-hl6j.vercel.app', 'http://localhost:3001'],
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
  // Set CORS headers for all requests
  reply.header('Access-Control-Allow-Origin', request.headers.origin || '*');
  reply.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS, PATCH');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  reply.header('Access-Control-Allow-Credentials', 'true');
  
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
  fastify.get('/dca/schedules', async () => {
    return await Schedule.find()
      .sort({ registeredAt: -1 }) // Sort by registration date, newest first
      .lean();
  });

  // Get DCA schedules by wallet address
  fastify.get('/dca/schedules/:walletAddress', async (request, reply) => {
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
  fastify.get('/dca/schedules/id/:scheduleId', async (request, reply) => {
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
  fastify.post('/dca/schedules', async (request, reply) => {
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
    '/dca/schedules/:scheduleId/deactivate',
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
    '/dca/schedules/:scheduleId/activate',
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
  fastify.get('/dca/transactions', async () => {
    return await PurchasedCoin.find()
      .sort({ purchasedAt: -1 })
      .populate('scheduleId', 'walletAddress')
      .lean();
  });

  // Get all DCA transactions for a wallet address
  fastify.get('/dca/transactions/:walletAddress', async (request, reply) => {
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
    '/dca/transactions/:walletAddress/latest',
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
  fastify.post('/dca/test/balance-check', async (request, reply) => {
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
  fastify.post('/dca/simulate/transaction', async (request, reply) => {
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
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    memory: process.memoryUsage()
  };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  return { 
    service: 'Vincent DCA Service',
    status: 'running',
    endpoints: [
      { method: 'GET', path: '/dca/schedules', description: 'Get all DCA schedules' },
      { method: 'GET', path: '/dca/schedules/:walletAddress', description: 'Get DCA schedules by wallet address' },
      { method: 'GET', path: '/dca/schedules/id/:scheduleId', description: 'Get DCA schedule by ID' },
      { method: 'POST', path: '/dca/schedules', description: 'Create new DCA schedule' },
      { method: 'PATCH', path: '/dca/schedules/:scheduleId/deactivate', description: 'Deactivate DCA schedule' },
      { method: 'PATCH', path: '/dca/schedules/:scheduleId/activate', description: 'Activate DCA schedule' },
      { method: 'GET', path: '/dca/transactions', description: 'Get all DCA transactions' },
      { method: 'GET', path: '/dca/transactions/:walletAddress', description: 'Get all DCA transactions for a wallet address' },
      { method: 'GET', path: '/dca/transactions/:walletAddress/latest', description: 'Get latest DCA transaction for a wallet address' },
      { method: 'POST', path: '/dca/test/balance-check', description: 'Test balance check functionality' },
      { method: 'POST', path: '/dca/simulate/transaction', description: 'Simulate a transaction' },
      { method: 'GET', path: '/health', description: 'Health check endpoint' }
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
fastify.get('/admin/logs', async (request, reply) => {
  // Return the most recent 100 logs in reverse chronological order (newest first)
  return { logs: serverLogs.slice(-100).reverse() };
});

// Start the server
async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(dbUri);
    console.log('Connected to MongoDB');

    // Register routes
    await registerScheduleRoutes();
    await registerPurchaseRoutes();

    // Serve static files
    fastify.register(require('@fastify/static'), {
      root: path.join(__dirname, 'public'),
      prefix: '/',
    });

    // Start the server
    const PORT = process.env.PORT || 3000;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server is running on port ${PORT}`);

    // Start the DCA execution process
    startDCAExecutionProcess();
  } catch (err) {
    console.error('Error starting server:', err);
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
