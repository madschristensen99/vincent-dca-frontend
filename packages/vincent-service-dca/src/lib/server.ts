import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { Agenda } from 'agenda';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

import { scheduleRoutes } from './routes/schedule.routes';
import { purchaseRoutes } from './routes/purchase.routes';
import { toolsRoutes } from './routes/tools.routes';
import { createAgenda, stopScheduler } from './scheduler/scheduler';
import mongoose from 'mongoose';
import { VincentSDK } from '@lit-protocol/vincent-sdk';

export interface ServerConfig {
  port?: number;
  logger?: boolean;
  dbUri?: string;
  debug?: boolean;
}

export const DOMAIN =
  process.env.DOMAIN ||
  process.env.HEROKU_APP_DEFAULT_DOMAIN_NAME ||
  (`localhost:${process.env.PORT}` as const);

const corsOptions = {
  optionsSuccessStatus: 200,
  origin: async (origin: string | undefined): Promise<boolean> => {
    if (!origin) {
      return true;
    }

    // FIXME: Don't allow localhost to hit production instances of this service.
    const allowedOrigins = [
      /^https?:\/\/localhost(:\d+)?$/, // localhost with any port
      // eslint-disable-next-line no-useless-escape
      new RegExp(`^https?:\/\/${DOMAIN}$`),
    ];

    if (allowedOrigins.some((regex) => regex.test(origin))) {
      return true;
    } else {
      throw new Error('Not allowed by CORS');
    }
  },
};

export class Server {
  protected fastify: FastifyInstance;
  protected port: number;
  protected dbUri: string;
  protected agendaInstance: Agenda | null = null;

  constructor(config: ServerConfig = {}) {
    this.fastify = Fastify({
      logger: config.logger ?? true,
    });
    this.port = config.port ?? 3000;
    this.dbUri =
      config.dbUri ?? process.env.MONGODB_URI ?? 'mongodb://localhost:27017/vincent-service-dca';

    // Configure agenda
    this.agendaInstance = createAgenda(this.dbUri, config.debug ?? false);
  }

  async start() {
    // Wait for agenda to be ready and start the scheduler
    if (this.agendaInstance) {
      await this.agendaInstance.start();
    }

    // Connect to MongoDB
    try {
      await mongoose.connect(this.dbUri);
      console.log(`Connected to MongoDB at: ${this.dbUri}`);
      
      // Log database details to verify Atlas connection
      if (mongoose.connection && mongoose.connection.db) {
        try {
          const adminDb = mongoose.connection.db.admin();
          const serverInfo = await adminDb.serverInfo();
          console.log('MongoDB Server Info:', {
            version: serverInfo.version,
            host: mongoose.connection.host,
            name: mongoose.connection.name,
            isAtlas: this.dbUri.includes('mongodb+srv')
          });
        } catch (error) {
          console.log('Could not get detailed server info, but connected to MongoDB');
        }
      }
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }

    await this.fastify.register(cors, corsOptions);

    // Serve static files from the public directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const publicPath = path.join(__dirname, '..', '..', 'public');
    
    await this.fastify.register(fastifyStatic, {
      root: publicPath,
      prefix: '/',
    });

    // Register routes
    await this.fastify.register(scheduleRoutes, { prefix: '/api' });
    await this.fastify.register(purchaseRoutes, { prefix: '/api' });
    await this.fastify.register(toolsRoutes, { prefix: '/api/tools' });

    // Add a direct test route
    this.fastify.post('/api/direct-test', async (request, reply) => {
      return {
        success: true,
        message: 'Direct test route is working',
        body: request.body
      };
    });

    // Add a direct test endpoint for ERC20 transfer
    this.fastify.post('/api/test-erc20-transfer', async (request, reply) => {
      try {
        const { tokenAddress, recipientAddress, amount, decimals } = request.body as any;
        
        // Just echo back the request for testing
        return {
          success: true,
          message: "Test endpoint working",
          receivedParams: {
            tokenAddress,
            recipientAddress,
            amount,
            decimals
          }
        };
      } catch (error: unknown) {
        console.error('Error in test endpoint:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Add the balance check endpoint that the frontend is trying to access
    this.fastify.post('/dca/test/balance-check', async (request, reply) => {
      try {
        console.log('Balance check endpoint hit');
        console.log('Request headers:', request.headers);
        console.log('Request body:', request.body);
        
        // Get the authorization header
        const authHeader = request.headers.authorization;
        
        // Check if the authorization header exists and has the correct format
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          console.log('No Authorization header or invalid format');
          reply.code(401).send({ error: 'Authentication required. Please provide a valid JWT token.' });
          return;
        }
        
        // Extract the JWT token
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log('JWT token received (first 20 chars):', token.substring(0, 20) + '...');
        
        // For testing purposes, accept any JWT token
        return {
          success: true,
          message: "Balance check successful",
          balance: "1000.0",
          tokenAddress: (request.body as any).tokenAddress || "Not provided",
          walletAddress: (request.body as any).walletAddress || "Not provided"
        };
      } catch (error: unknown) {
        console.error('Error in balance check endpoint:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Test endpoint for JWT verification
    this.fastify.post('/test-jwt', async (request, reply) => {
      try {
        const { jwt } = request.body as { jwt: string };
        
        if (!jwt) {
          return reply.code(400).send({ error: 'JWT token is required' });
        }
        
        // Initialize the Vincent SDK
        const vincentSDK = new VincentSDK();
        
        // Store the JWT first (this is required before verification)
        await vincentSDK.storeJWT(jwt);
        
        // Get the audience from the JWT payload
        const tokenParts = jwt.split('.');
        let audience = 'http://localhost:3001/'; // Default audience
        
        if (tokenParts.length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            if (payload.aud) {
              audience = payload.aud;
            }
          } catch (error) {
            console.error('Error parsing JWT payload:', error);
          }
        }
        
        // Verify the JWT with the audience parameter
        const isValid = await vincentSDK.verifyJWT(audience);
        
        return reply.send({ 
          valid: isValid,
          message: isValid ? 'JWT verified successfully' : 'JWT verification failed',
          audience: audience
        });
      } catch (error: unknown) {
        console.error('Error in test-jwt endpoint:', error);
        return reply.code(400).send({ 
          error: 'JWT verification error', 
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Start server
    try {
      await this.fastify.listen({ host: '0.0.0.0', port: this.port });
      
      console.log(`Server is running on port ${this.port}`);
      
      // Print all registered routes for debugging
      console.log('=== REGISTERED ROUTES ===');
      this.fastify.printRoutes();
      console.log('=========================');
      
      this.fastify.log.info(`Server is running on port ${this.port}`);
    } catch (err) {
      this.fastify.log.error(err);
      throw err;
    }
  }

  async stop() {
    // Stop agenda if it's running
    await stopScheduler();

    // Stop server
    await this.fastify.close();
    this.fastify.log.info('Server closed');
  }

  get baseUrl() {
    return `http://localhost:${this.port}`;
  }

  get frontendUrl() {
    return `http://localhost:${this.port}`;
  }

  setPort(port: number) {
    this.port = port;
  }
}
