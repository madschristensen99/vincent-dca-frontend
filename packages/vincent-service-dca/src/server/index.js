// Main server entry point
import fastify from 'fastify';
import cors from '@fastify/cors';
import { connectToDatabase } from './database.js';
import { registerRoutes } from './routes/index.js';
import { startDCAExecutionProcess } from './dca-processor.js';
import dotenv from 'dotenv';

// Load environment variables if dotenv is available
try {
  dotenv.config();
} catch (e) {
  console.log('dotenv not available, using process.env');
}

// Create fastify instance
const app = fastify();

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
app.register(cors, corsOptions);

// Add a hook to manually set CORS headers for all responses
app.addHook('onRequest', (request, reply, done) => {
  const origin = request.headers.origin;
  
  // Check if the origin is allowed
  if (origin && corsOptions.origin === '*') {
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

// Health check endpoint
app.get('/api/health', async (request, reply) => {
  return { 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// Flag to track if server is already started
let serverStarted = false;

// Start the server
export async function start() {
  // Prevent multiple server starts
  if (serverStarted) {
    console.log('Server already started, skipping initialization');
    return;
  }
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectToDatabase();
    
    // Register all routes
    console.log('Registering routes...');
    await registerRoutes(app);
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server is running on http://${HOST}:${PORT}`);
    
    // Start DCA execution process
    startDCAExecutionProcess();
    
    // Mark server as started
    serverStarted = true;
    
  } catch (error) {
    console.error('Error starting server:', error);
    throw error;
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await app.close();
  process.exit(0);
});

export { app };
