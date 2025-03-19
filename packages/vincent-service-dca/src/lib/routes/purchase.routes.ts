import type { FastifyInstance } from 'fastify';
import { PurchasedCoin } from '../models/purchased-coin.model';
import { ethers } from 'ethers';
import { LIT_RPC } from '@lit-protocol/constants';
import { VincentSDK } from '@lit-protocol/vincent-sdk';

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

  // ERC20 Transfer Tool endpoint
  fastify.post('/tools/erc20-transfer', async (request, reply) => {
    try {
      const { tokenAddress, recipientAddress, amount, decimals } = request.body as {
        tokenAddress: string;
        recipientAddress: string;
        amount: string;
        decimals: number;
      };
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization as string;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const vincentSDK = new VincentSDK({
        network: process.env.LIT_NETWORK as any || 'datil',
      });
      
      // Set the JWT for authentication
      // @ts-ignore - Ignoring type error as the SDK might have this method
      vincentSDK.setJwt(jwt);
      
      // ERC20 Transfer Tool IPFS CID - replace with your actual deployed tool CID
      const ERC20_TRANSFER_TOOL_IPFS_CID = 'QmY6ztjhbRa5gEmYf4tqjyapX92hAaBDzpPnbPNarNUkyp';
      
      // Execute the tool
      // @ts-ignore - Ignoring type error as the SDK might have this method
      const result = await vincentSDK.executeTool(ERC20_TRANSFER_TOOL_IPFS_CID, {
        tokenAddress,
        recipientAddress,
        amount,
        decimals
      });
      
      reply.send({
        success: true,
        result
      });
    } catch (error: any) {
      console.error('Error executing ERC20 transfer tool:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
}
