// Purchase routes module
import { PurchasedCoin } from '../models/purchased-coin.js';

// For the auth middleware, we'll need to dynamically import it since it's a CommonJS module
async function getAuthMiddleware() {
  try {
    const authModule = await import('../../middleware/auth.cjs');
    return authModule.verifyJwtMiddleware;
  } catch (error) {
    console.error('Error importing auth middleware:', error);
    // Return a dummy middleware that does nothing if we can't import the real one
    return (request, reply, done) => done();
  }
}

export default async function purchaseRoutes(fastify, options) {
  // Get the auth middleware
  const verifyJwtMiddleware = await getAuthMiddleware();

  // Get all DCA transactions
  fastify.get('/', async () => {
    return await PurchasedCoin.find()
      .sort({ purchasedAt: -1 })
      .populate('scheduleId', 'walletAddress')
      .lean();
  });

  // Get all DCA transactions for a wallet address
  fastify.get('/:walletAddress', async (request, reply) => {
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
    '/:walletAddress/latest',
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

  // Get all DCA transactions for a schedule
  fastify.get(
    '/schedule/:scheduleId',
    async (request, reply) => {
      const { scheduleId } = request.params;

      const purchases = await PurchasedCoin.find({ scheduleId }).sort({
        purchasedAt: -1,
      }).lean();

      if (purchases.length === 0) {
        reply
          .code(404)
          .send({ error: 'No transactions found for this schedule' });
        return;
      }

      return purchases;
    }
  );

  // Create a new DCA transaction (for testing purposes)
  fastify.post(
    '/',
    { preHandler: verifyJwtMiddleware },
    async (request, reply) => {
      try {
        const transactionData = request.body;
        
        // Validate required fields
        if (!transactionData.walletAddress || !transactionData.purchaseAmount) {
          return reply.code(400).send({
            message: 'Missing required fields: walletAddress and purchaseAmount are required',
          });
        }
        
        // Create a new transaction
        const transaction = new PurchasedCoin({
          ...transactionData,
          purchasedAt: new Date(),
          success: true,
        });
        
        await transaction.save();
        
        reply.code(201).send(transaction);
      } catch (error) {
        console.error(`Error creating DCA transaction: ${error}`);
        reply.code(500).send({
          message: 'Failed to create DCA transaction',
          error: error.message,
        });
      }
    }
  );
}
