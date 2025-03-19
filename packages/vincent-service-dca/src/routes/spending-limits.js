import { verifyJwtMiddleware } from '../middleware/auth';
import { ethers } from 'ethers';

// ABI for the SpendingLimits contract (minimal version for API endpoints)
const SPENDING_LIMITS_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "checkLimit",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "recordSpend",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getCurrentSpent",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getPolicy",
    "outputs": [
      {"internalType": "uint256", "name": "limit", "type": "uint256"},
      {"internalType": "uint256", "name": "period", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "uint256", "name": "limit", "type": "uint256"},
      {"internalType": "uint256", "name": "period", "type": "uint256"}
    ],
    "name": "setPolicy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "delegatee", "type": "address"},
      {"internalType": "bool", "name": "status", "type": "bool"}
    ],
    "name": "setDelegateeStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export default async function (fastify, opts) {
  // Get spending limit info
  fastify.post('/info', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { walletAddress, contractAddress, chainId, rpcUrl } = request.body;
      
      if (!walletAddress || !contractAddress) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address and contract address are required'
        });
      }
      
      // Determine RPC URL based on chain ID
      let providerRpcUrl = rpcUrl;
      if (chainId === 84532) {
        // Base Sepolia
        providerRpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
      } else if (!providerRpcUrl) {
        providerRpcUrl = process.env.RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-api-key";
      }
      
      // Create provider and contract instance
      const provider = new ethers.providers.JsonRpcProvider(providerRpcUrl);
      
      // Create contract instance
      const spendingLimitsContract = new ethers.Contract(
        contractAddress,
        SPENDING_LIMITS_ABI,
        provider
      );
      
      // Get current spent amount
      const currentSpent = await spendingLimitsContract.getCurrentSpent(walletAddress);
      
      // Get policy details
      const policy = await spendingLimitsContract.getPolicy(walletAddress);
      
      // Calculate remaining amount
      const limit = ethers.utils.formatUnits(policy.limit, 18);
      const spent = ethers.utils.formatUnits(currentSpent, 18);
      const remaining = Math.max(0, parseFloat(limit) - parseFloat(spent)).toFixed(18);
      
      reply.send({
        success: true,
        walletAddress,
        contractAddress,
        spent,
        limit,
        remaining,
        period: policy.period.toString(),
        isActive: policy.isActive
      });
    } catch (error) {
      console.error('Error getting spending limit info:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // Set spending policy
  fastify.post('/set-policy', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { walletAddress, contractAddress, limit, period, chainId, rpcUrl } = request.body;
      
      if (!walletAddress || !contractAddress || !limit || !period) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address, contract address, limit, and period are required'
        });
      }
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const { VincentSDK } = await import('@lit-protocol/vincent-sdk');
      const vincentSDK = new VincentSDK({
        jwt,
        litNetwork: process.env.LIT_NETWORK || 'datil',
      });
      
      // Get PKP info from Vincent SDK
      const pkpInfo = await vincentSDK.getPkpInfo();
      
      // Create provider and wallet
      const provider = new ethers.providers.JsonRpcProvider(
        rpcUrl || process.env.RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-api-key"
      );
      
      // Create wallet from PKP
      const wallet = new ethers.Wallet(pkpInfo.privateKey, provider);
      
      // Create contract instance with signer
      const spendingLimitsContract = new ethers.Contract(
        contractAddress,
        SPENDING_LIMITS_ABI,
        wallet
      );
      
      // Convert limit to wei (18 decimals)
      const limitInWei = ethers.utils.parseUnits(limit.toString(), 18);
      
      // Set policy
      const tx = await spendingLimitsContract.setPolicy(
        walletAddress,
        limitInWei,
        period
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      reply.send({
        success: true,
        transactionHash: receipt.transactionHash,
        walletAddress,
        limit,
        period
      });
    } catch (error) {
      console.error('Error setting spending policy:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // Authorize delegatee
  fastify.post('/authorize', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { walletAddress, delegateeAddress, status, contractAddress, chainId, rpcUrl } = request.body;
      
      if (!walletAddress || !delegateeAddress || status === undefined || !contractAddress) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address, delegatee address, status, and contract address are required'
        });
      }
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const { VincentSDK } = await import('@lit-protocol/vincent-sdk');
      const vincentSDK = new VincentSDK({
        jwt,
        litNetwork: process.env.LIT_NETWORK || 'datil',
      });
      
      // Get PKP info from Vincent SDK
      const pkpInfo = await vincentSDK.getPkpInfo();
      
      // Create provider and wallet
      const provider = new ethers.providers.JsonRpcProvider(
        rpcUrl || process.env.RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-api-key"
      );
      
      // Create wallet from PKP
      const wallet = new ethers.Wallet(pkpInfo.privateKey, provider);
      
      // Create contract instance with signer
      const spendingLimitsContract = new ethers.Contract(
        contractAddress,
        SPENDING_LIMITS_ABI,
        wallet
      );
      
      // Set delegatee status
      const tx = await spendingLimitsContract.setDelegateeStatus(
        delegateeAddress,
        status
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      reply.send({
        success: true,
        transactionHash: receipt.transactionHash,
        walletAddress,
        delegateeAddress,
        status
      });
    } catch (error) {
      console.error('Error authorizing delegatee:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // Simulate transaction
  fastify.post('/simulate', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { 
        walletAddress, 
        contractAddress, 
        tokenAddress, 
        tokenAmount, 
        tokenDecimals,
        chainId, 
        rpcUrl 
      } = request.body;
      
      if (!walletAddress || !contractAddress || !tokenAddress || !tokenAmount) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address, contract address, token address, and token amount are required'
        });
      }
      
      // Create provider and contract instance
      const provider = new ethers.providers.JsonRpcProvider(
        rpcUrl || process.env.RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-api-key"
      );
      
      // Create contract instance
      const spendingLimitsContract = new ethers.Contract(
        contractAddress,
        SPENDING_LIMITS_ABI,
        provider
      );
      
      // Get token price in USD
      const tokenPrice = await getTokenPrice(tokenAddress);
      
      // Convert token amount to USD value (18 decimals)
      const decimals = tokenDecimals || 18;
      const baseAmount = parseFloat(tokenAmount) / (10 ** (decimals - 18));
      const usdValue = baseAmount * tokenPrice;
      const usdValueInWei = ethers.utils.parseUnits(usdValue.toString(), 18);
      
      // Check if the spend is within limits
      const isWithinLimit = await spendingLimitsContract.checkLimit(walletAddress, usdValueInWei);
      
      // Get current spent amount
      const currentSpent = await spendingLimitsContract.getCurrentSpent(walletAddress);
      
      // Get policy details
      const policy = await spendingLimitsContract.getPolicy(walletAddress);
      
      reply.send({
        success: true,
        walletAddress,
        tokenAddress,
        tokenAmount,
        tokenPrice,
        usdValue: ethers.utils.formatUnits(usdValueInWei, 18),
        isWithinLimit,
        currentSpent: ethers.utils.formatUnits(currentSpent, 18),
        limit: ethers.utils.formatUnits(policy.limit, 18),
        period: policy.period.toString(),
        isActive: policy.isActive
      });
    } catch (error) {
      console.error('Error simulating transaction:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // Execute swap with spending limit check
  fastify.post('/execute-swap', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { 
        tokenIn, 
        tokenOut, 
        amountIn,
        spendingLimitContractAddress,
        chainId, 
        rpcUrl 
      } = request.body;
      
      if (!tokenIn || !tokenOut || !amountIn || !spendingLimitContractAddress) {
        return reply.code(400).send({
          success: false,
          error: 'Token in, token out, amount in, and spending limit contract address are required'
        });
      }
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const { VincentSDK } = await import('@lit-protocol/vincent-sdk');
      const vincentSDK = new VincentSDK({
        jwt,
        litNetwork: process.env.LIT_NETWORK || 'datil',
      });
      
      // Uniswap Swap Tool IPFS CID - replace with your actual deployed tool CID
      const UNISWAP_SWAP_TOOL_IPFS_CID = 'QmY6ztjhbRa5gEmYf4tqjyapX92hAaBDzpPnbPNarNUkyp';
      
      // Execute the tool with spending limit contract address
      const result = await vincentSDK.executeTool(UNISWAP_SWAP_TOOL_IPFS_CID, {
        tokenIn,
        tokenOut,
        amountIn,
        chainId: chainId || '1',
        rpcUrl: rpcUrl || process.env.RPC_URL,
        spendingLimitContractAddress
      });
      
      reply.send({
        success: true,
        result
      });
    } catch (error) {
      console.error('Error executing swap with spending limit:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
}

// Helper function to get token price from an API
async function getTokenPrice(tokenAddress) {
  try {
    // Map common token addresses to their symbols
    const tokenMap = {
      'eth': 'ETH',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'WETH', // WETH
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'DAI', // DAI
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC', // USDC
    };
    
    // Get the symbol for the token
    const symbol = tokenMap[tokenAddress.toLowerCase()] || tokenAddress;
    
    // Use DexScreener API to get the token price
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.pairs && data.pairs.length > 0) {
      // Sort by liquidity and get the highest liquidity pair
      const sortedPairs = data.pairs.sort((a, b) => 
        parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0)
      );
      
      return parseFloat(sortedPairs[0].priceUsd || 0);
    }
    
    // Fallback prices for common tokens
    const fallbackPrices = {
      'ETH': 2000,
      'WETH': 2000,
      'DAI': 1,
      'USDC': 1,
    };
    
    return fallbackPrices[symbol] || 100; // Default fallback price
  } catch (error) {
    console.error('Error fetching token price:', error);
    
    // Fallback prices for common tokens
    const fallbackPrices = {
      'eth': 2000,
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 2000, // WETH
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': 1, // DAI
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 1, // USDC
    };
    
    return fallbackPrices[tokenAddress.toLowerCase()] || 100; // Default fallback price
  }
}
