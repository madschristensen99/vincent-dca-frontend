// Wallet routes
const { ethers } = require('ethers');
const { verifyJwtMiddleware } = require('../middleware/auth.cjs');

async function routes(fastify, options) {
  // Get wallet balance
  fastify.post('/balance', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { walletAddress, chainId } = request.body;

      if (!walletAddress) {
        return reply.code(400).send({ 
          success: false, 
          message: 'Wallet address is required' 
        });
      }

      // Determine RPC URL based on chain ID
      let rpcUrl;
      if (chainId === 84532) {
        // Base Sepolia
        rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
      } else {
        return reply.code(400).send({ 
          success: false, 
          message: 'Unsupported chain ID' 
        });
      }

      // Create provider
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      
      // Get balance
      const balanceWei = await provider.getBalance(walletAddress);
      const balanceEth = ethers.utils.formatEther(balanceWei);

      return reply.send({
        success: true,
        balance: balanceEth,
        address: walletAddress,
        chainId
      });
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return reply.code(500).send({ 
        success: false, 
        message: 'Failed to fetch wallet balance',
        error: error.message
      });
    }
  });

  // Add any additional wallet-related endpoints here
}

module.exports = routes;
