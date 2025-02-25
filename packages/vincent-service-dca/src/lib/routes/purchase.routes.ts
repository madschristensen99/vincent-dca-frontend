import type { FastifyInstance } from 'fastify';
import { User } from '../models/user.model';
import { PurchasedCoin } from '../models/purchased-coin.model';

export async function purchaseRoutes(fastify: FastifyInstance) {
  // Get all DCA transactions
  fastify.get('/dca/transactions', async () => {
    return await PurchasedCoin.find()
      .sort({ purchasedAt: -1 })
      .populate('userId', 'walletAddress');
  });

  // Get all DCA transactions for a wallet address
  fastify.get('/dca/transactions/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params as { walletAddress: string };
    const user = await User.findOne({ walletAddress });

    if (!user) {
      reply.code(404).send({ error: 'DCA schedule not found' });
      return;
    }

    const purchases = await PurchasedCoin.find({ userId: user._id }).sort({
      purchasedAt: -1,
    });

    return purchases;
  });

  // Get latest DCA transaction for a wallet address
  fastify.get(
    '/dca/transactions/:walletAddress/latest',
    async (request, reply) => {
      const { walletAddress } = request.params as { walletAddress: string };
      const user = await User.findOne({ walletAddress });

      if (!user) {
        reply.code(404).send({ error: 'DCA schedule not found' });
        return;
      }

      const latestPurchase = await PurchasedCoin.findOne({
        userId: user._id,
      }).sort({ purchasedAt: -1 });

      if (!latestPurchase) {
        reply
          .code(404)
          .send({ error: 'No transactions found for this schedule' });
        return;
      }

      return latestPurchase;
    }
  );
}
