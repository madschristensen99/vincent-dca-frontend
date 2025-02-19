import Fastify from 'fastify';
import { userRoutes } from './routes/user.routes.mjs';
import { purchaseRoutes } from './routes/purchase.routes.mjs';

const server = Fastify({
  logger: true,
});

// Register routes
await server.register(userRoutes);
await server.register(purchaseRoutes);

// Start server
try {
  await server.listen({ port: 3000 });
  console.log('Server is running on port 3000');
} catch (err) {
  server.log.error(err);
  process.exit(1);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  try {
    await server.close();
    console.log('Server closed');
    process.exit(0);
  } catch (err) {
    console.error('Error closing server:', err);
    process.exit(1);
  }
});
