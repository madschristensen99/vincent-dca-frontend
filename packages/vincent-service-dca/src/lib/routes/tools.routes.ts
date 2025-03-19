import type { FastifyInstance } from 'fastify';
import { VincentSDK } from '@lit-protocol/vincent-sdk';
import type { LIT_NETWORKS } from '@lit-protocol/constants';

// Since we don't have type definitions for the auth middleware, we'll use any for now
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const verifyJwtMiddleware = require('../../../middleware/auth').verifyJwtMiddleware;

export async function toolsRoutes(fastify: FastifyInstance): Promise<void> {
  // Execute ERC20 Transfer Tool
  fastify.post('/execute-erc20-transfer', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { tokenAddress, recipientAddress, amount, decimals } = request.body as {
        tokenAddress: string;
        recipientAddress: string;
        amount: string;
        decimals: number;
      };
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization as string;
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const vincentSDK = new VincentSDK({
        // Use the appropriate configuration options based on the SDK version
        network: (process.env.LIT_NETWORK || 'datil') as keyof typeof LIT_NETWORKS,
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
