import type { FastifyInstance } from 'fastify';
import { PurchasedCoin } from '../models/purchased-coin.model';
import { ethers } from 'ethers';
import { LIT_RPC } from '@lit-protocol/constants';

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

  // Test balance check functionality
  fastify.post('/dca/test/balance-check', async (request, reply) => {
    const { walletAddress, simulatedBalance } = request.body as {
      walletAddress: string;
      simulatedBalance?: string;
    };

    if (!walletAddress) {
      reply.code(400).send({ error: 'Wallet address is required' });
      return;
    }

    try {
      // In a real scenario, we'd use the actual wallet balance
      // For testing, we can use a simulated balance if provided
      let walletBalance;
      const minRequiredBalance = ethers.utils.parseEther("0.01");
      
      if (simulatedBalance) {
        // Use the simulated balance for testing
        walletBalance = ethers.utils.parseEther(simulatedBalance);
      } else {
        // In a real scenario, we'd get the actual balance
        // This is just for demonstration - in production, you'd use your actual wallet
        const provider = new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
        walletBalance = await provider.getBalance(walletAddress);
      }

      const isBalanceSufficient = walletBalance.gte(minRequiredBalance);

      return {
        walletAddress,
        balance: ethers.utils.formatEther(walletBalance),
        minRequiredBalance: ethers.utils.formatEther(minRequiredBalance),
        isBalanceSufficient,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error('Balance check error:', error);
      reply.code(500).send({ 
        error: 'Failed to check balance', 
        details: (error as Error).message 
      });
    }
  });
}
