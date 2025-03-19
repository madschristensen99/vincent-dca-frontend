// Simple server that only handles wallet balance endpoint
const fastify = require('fastify')({ logger: true });
const { ethers } = require('ethers');
const cors = require('@fastify/cors');

// Register CORS to allow requests from frontend
fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Simple wallet balance endpoint
fastify.post('/wallet/balance', async (request, reply) => {
  try {
    const { walletAddress, chainId } = request.body;
    console.log(`Request received for wallet balance: ${walletAddress}, chainId: ${chainId}`);

    if (!walletAddress) {
      return reply.code(400).send({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }

    // Determine RPC URL based on chain ID
    let rpcUrl = 'https://sepolia.base.org'; // Default to Base Sepolia

    console.log(`Fetching balance for ${walletAddress} on chain ${chainId}`);
    
    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Get balance
    const balanceWei = await provider.getBalance(walletAddress);
    const balanceEth = ethers.utils.formatEther(balanceWei);

    console.log(`Balance for ${walletAddress}: ${balanceEth} ETH`);

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

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`Server is running on port 3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
