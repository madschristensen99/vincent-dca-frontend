import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { userRoutes } from '../../src/lib/routes/user.routes.mjs';
import { purchaseRoutes } from '../../src/lib/routes/purchase.routes.mjs';

export class TestServer {
  private server: FastifyInstance;
  private port: number;

  constructor(port = 3001) {
    this.server = Fastify({ logger: false });
    this.port = port;
  }

  async start() {
    // Register routes
    await this.server.register(userRoutes);
    await this.server.register(purchaseRoutes);

    // Start server
    await this.server.listen({ port: this.port });
    console.log(`Test server running on port ${this.port}`);
  }

  async stop() {
    await this.server.close();
  }

  get baseUrl() {
    return `http://localhost:${this.port}`;
  }
}
