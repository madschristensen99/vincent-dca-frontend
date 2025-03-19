// Token routes
const { verifyJwtMiddleware } = require('../middleware/auth.cjs');

async function routes(fastify, options) {
  // Get top memecoin for a specific chain
  fastify.post('/top-memecoin', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { chainId } = request.body;

      // For Base Sepolia, we'll return a mock top memecoin
      // In a real implementation, this would fetch data from an API like CoinGecko
      if (chainId === 84532) {
        // Mock data for Base Sepolia
        return reply.send({
          success: true,
          name: "Base Doge",
          symbol: "BDOGE",
          address: "0x4200000000000000000000000000000000000042", // Example address
          decimals: 18,
          price: "0.0042",
          change24h: "+5.2%",
          marketCap: "4200000",
          volume24h: "420000"
        });
      } else {
        return reply.code(400).send({ 
          success: false, 
          message: 'Unsupported chain ID' 
        });
      }
    } catch (error) {
      console.error('Error fetching top memecoin:', error);
      return reply.code(500).send({ 
        success: false, 
        message: 'Failed to fetch top memecoin',
        error: error.message
      });
    }
  });
}

module.exports = routes;
