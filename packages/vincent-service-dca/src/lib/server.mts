import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { Agenda } from 'agenda';

import { userRoutes } from './routes/user.routes.mjs';
import { purchaseRoutes } from './routes/purchase.routes.mjs';
import { agenda } from './scheduler/scheduler.mjs';

export interface ServerConfig {
  port?: number;
  logger?: boolean;
}

export class Server {
  protected fastify: FastifyInstance;
  protected port: number;

  constructor(config: ServerConfig = {}) {
    this.fastify = Fastify({
      logger: config.logger ?? true,
    });
    this.port = config.port ?? 3000;
  }

  async start() {
    // Configure agenda if dbUri is provided
    if (process.env.MONGODB_URI) {
      const agendaInstance = new Agenda({
        db: {
          address: process.env.MONGODB_URI,
          collection: 'agendaJobs',
        },
        processEvery: '1 second',
      });

      // Wait for agenda to be ready
      await agendaInstance.start();
      await agendaInstance.cancel({});

      // Replace the global agenda instance
      Object.assign(agenda, agendaInstance);
    }

    // Register routes
    await this.fastify.register(userRoutes);
    await this.fastify.register(purchaseRoutes);

    // Start server
    try {
      await this.fastify.listen({ port: this.port });
      this.fastify.log.info(`Server is running on port ${this.port}`);
    } catch (err) {
      this.fastify.log.error(err);
      throw err;
    }
  }

  async stop() {
    // Stop agenda if it's running
    await agenda.cancel({});
    await agenda.stop();

    // Stop server
    await this.fastify.close();
    this.fastify.log.info('Server closed');
  }

  get baseUrl() {
    return `http://localhost:${this.port}`;
  }

  setPort(port: number) {
    this.port = port;
  }
}

// Create and export default server instance
const server = new Server();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  try {
    await server.stop();
    process.exit(0);
  } catch (err) {
    console.error('Error closing server:', err);
    process.exit(1);
  }
});

export default server;
