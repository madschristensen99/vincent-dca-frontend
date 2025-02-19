import { Server } from '../../src/lib/server.mjs';

export class TestServer extends Server {
  constructor() {
    // Generate random port between 3000 and 3100
    const port = Math.floor(Math.random() * (3100 - 3000 + 1)) + 3000;

    super({
      port,
      logger: false,
    });
  }

  override async start() {
    try {
      await super.start();
    } catch (err) {
      // If port is in use, try another random port
      if ((err as any).code === 'EADDRINUSE') {
        const newPort = Math.floor(Math.random() * (3100 - 3000 + 1)) + 3000;
        this.setPort(newPort);
        await super.start();
      } else {
        throw err;
      }
    }
  }
}
