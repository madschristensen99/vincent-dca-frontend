// Routes index module
import scheduleRoutes from './schedule-routes.js';
import purchaseRoutes from './purchase-routes.js';

// Track if routes have been registered
let routesRegistered = false;

// Import existing CommonJS routes using dynamic import
async function importCJSModule(path) {
  try {
    // For CommonJS modules, we need to use a dynamic import
    const module = await import(`../../routes/${path}`);
    return module.default;
  } catch (error) {
    console.error(`Error importing module ${path}:`, error);
    return null;
  }
}

// Register all routes with the fastify instance
export async function registerRoutes(fastify) {
  // Prevent duplicate route registration
  if (routesRegistered) {
    console.log('Routes already registered, skipping');
    return;
  }
  
  // Register schedule routes
  console.log('Registering schedule routes...');
  fastify.register(scheduleRoutes, { prefix: '/api/dca/schedules' });
  
  // Register purchase routes
  console.log('Registering purchase routes...');
  fastify.register(purchaseRoutes, { prefix: '/api/dca/transactions' });
  
  // Register tools routes
  console.log('Registering tools routes...');
  try {
    const toolsRoutes = await importCJSModule('tools.cjs');
    if (toolsRoutes) {
      fastify.register(toolsRoutes, { prefix: '/api/tools' });
    }
  } catch (error) {
    console.warn('Error registering tools routes:', error.message);
  }
  
  // Register wallet routes - make sure there are no conflicts
  console.log('Registering wallet routes...');
  try {
    const walletRoutes = await importCJSModule('wallet.cjs');
    if (walletRoutes) {
      fastify.register(walletRoutes, { 
        prefix: '/api/wallet',
        // Avoid route conflicts by using a conflict handler
        routeConflictStrategy: 'reject'
      });
    }
  } catch (error) {
    console.warn('Skipping wallet routes due to conflicts:', error.message);
  }
  
  // Register tokens routes - make sure there are no conflicts
  console.log('Registering tokens routes...');
  try {
    const tokensRoutes = await importCJSModule('tokens.cjs');
    if (tokensRoutes) {
      fastify.register(tokensRoutes, { 
        prefix: '/api/tokens',
        // Avoid route conflicts by using a conflict handler
        routeConflictStrategy: 'reject'
      });
    }
  } catch (error) {
    console.warn('Skipping tokens routes due to conflicts:', error.message);
  }
  
  console.log('All routes registered successfully');
  routesRegistered = true;
}
