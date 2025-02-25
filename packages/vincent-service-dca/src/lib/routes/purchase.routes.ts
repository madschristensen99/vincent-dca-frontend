import type { FastifyInstance } from 'fastify';
import { PurchasedCoin } from '../models/purchased-coin.model';

export async function purchaseRoutes(fastify: FastifyInstance) {
  // Get all DCA transactions
  fastify.get('/dca/transactions', async () => {
    return await PurchasedCoin.find()
      .sort({ purchasedAt: -1 })
      .populate('scheduleId', 'walletAddress');
  });

  // Get all DCA transactions for a wallet address
  fastify.get('/dca/transactions/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params as { walletAddress: string };

    const purchases = await PurchasedCoin.find({ walletAddress }).sort({
      purchasedAt: -1,
    });

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
      const { walletAddress } = request.params as { walletAddress: string };

      const latestPurchase = await PurchasedCoin.findOne({
        walletAddress,
      }).sort({ purchasedAt: -1 });

      if (!latestPurchase) {
        reply
          .code(404)
          .send({ error: 'No transactions found for this wallet address' });
        return;
      }

      return latestPurchase;
    }
  );
}
