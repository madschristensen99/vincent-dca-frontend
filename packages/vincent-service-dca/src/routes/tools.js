import { VincentSDK } from '@lit-protocol/vincent-sdk';
import { verifyJwtMiddleware } from '../middleware/auth';

export default async function (fastify, opts) {
  // Root endpoint for tools
  fastify.post('/', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { tokenAddress, recipientAddress, amount, decimals } = request.body;
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const vincentSDK = new VincentSDK({
        jwt,
        litNetwork: process.env.LIT_NETWORK || 'datil',
      });
      
      // ERC20 Transfer Tool IPFS CID - replace with your actual deployed tool CID
      const ERC20_TRANSFER_TOOL_IPFS_CID = 'QmY6ztjhbRa5gEmYf4tqjyapX92hAaBDzpPnbPNarNUkyp';
      
      // Execute the tool
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
    } catch (error) {
      console.error('Error executing ERC20 transfer tool:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // Keep the original endpoint for backward compatibility
  fastify.post('/execute-erc20-transfer', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { tokenAddress, recipientAddress, amount, decimals } = request.body;
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const vincentSDK = new VincentSDK({
        jwt,
        litNetwork: process.env.LIT_NETWORK || 'datil',
      });
      
      // ERC20 Transfer Tool IPFS CID - replace with your actual deployed tool CID
      const ERC20_TRANSFER_TOOL_IPFS_CID = 'QmY6ztjhbRa5gEmYf4tqjyapX92hAaBDzpPnbPNarNUkyp';
      
      // Execute the tool
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
    } catch (error) {
      console.error('Error executing ERC20 transfer tool:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
}
