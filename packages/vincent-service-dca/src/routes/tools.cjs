// CommonJS version of tools routes
const { VincentSDK } = require('@lit-protocol/vincent-sdk');
const { verifyJwtMiddleware } = require('../middleware/auth.cjs');

console.log('Loading tools.cjs routes file...');

module.exports = async function (fastify, opts) {
  console.log('Initializing tools routes with prefix:', opts.prefix);
  
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
      
      // Mock implementation for ERC20 transfer
      console.log('Using mock implementation for ERC20 transfer (root endpoint)');
      const result = {
        success: true,
        message: 'Mock ERC20 transfer execution (root endpoint)',
        params: {
          tokenAddress,
          recipientAddress,
          amount,
          decimals
        },
        timestamp: new Date().toISOString()
      };
      
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
    console.log('Received request to /execute-erc20-transfer endpoint');
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
      
      // Mock implementation for ERC20 transfer
      console.log('Using mock implementation for ERC20 transfer');
      const result = {
        success: true,
        message: 'Mock ERC20 transfer execution',
        params: {
          tokenAddress,
          recipientAddress,
          amount,
          decimals
        },
        timestamp: new Date().toISOString()
      };
      
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
  
  // No-auth version of the ERC20 transfer endpoint for testing
  fastify.post('/execute-erc20-transfer-no-auth', async (request, reply) => {
    console.log('Received request to /execute-erc20-transfer-no-auth endpoint');
    try {
      const { pkpEthAddress, tokenIn, tokenOut, amountIn, privateKey } = request.body;
      
      console.log('ERC20 transfer request params (no-auth):', {
        pkpEthAddress,
        tokenIn,
        tokenOut,
        amountIn,
        privateKeyProvided: !!privateKey
      });
      
      // Initialize Vincent SDK without JWT
      const vincentSDK = new VincentSDK({
        litNetwork: process.env.LIT_NETWORK || 'datil',
      });
      
      // For testing, simulate a successful swap transaction
      const mockTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const outputAmount = (parseFloat(amountIn) * 420).toString(); // Mock conversion rate
      const price = (parseFloat(amountIn) * 1800).toString(); // Mock ETH price in USD
      
      reply.send({
        success: true,
        message: 'ERC20 transfer executed successfully (no-auth)',
        txHash: mockTxHash,
        inputAmount: amountIn,
        inputToken: tokenIn,
        outputAmount: outputAmount,
        outputToken: tokenOut,
        price: price,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in execute-erc20-transfer-no-auth endpoint:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Uniswap Swap Lit Action endpoint
  fastify.post('/execute-uniswap-swap', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    console.log('Received request to /execute-uniswap-swap endpoint');
    try {
      const { pkpEthAddress, rpcUrl, chainId, tokenIn, tokenOut, amountIn, spendingLimitContractAddress } = request.body;
      
      if (!pkpEthAddress || !tokenIn || !tokenOut || !amountIn || !chainId || !rpcUrl) {
        return reply.code(400).send({
          status: 'error',
          error: {
            message: 'Missing required parameters'
          }
        });
      }

      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) // Remove 'Bearer ' prefix
        : null;
      
      if (!jwt) {
        return reply.code(401).send({
          status: 'error',
          error: {
            message: 'JWT token is required'
          }
        });
      }
      
      console.log(`Executing Uniswap swap for ${amountIn} ${tokenIn} to ${tokenOut}`);
      
      // In a real implementation, this would execute the Lit Action
      // For now, we'll simulate a successful swap
      
      // Simulate a random transaction hash
      const mockTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      // Simulate output amount (for demo purposes)
      const outputAmount = (parseFloat(amountIn) * 420).toString(); // Mock conversion rate
      
      // Simulate USD value
      const usdValue = (parseFloat(amountIn) * 1800).toString(); // Mock ETH price in USD
      
      // Return a response that matches the Lit Action's response format
      reply.send({
        status: 'success',
        approvalHash: null, // No approval needed for ETH
        swapHash: mockTxHash,
        inputAmount: amountIn,
        inputToken: tokenIn === 'ETH' ? 'ETH' : tokenIn,
        outputAmount: outputAmount,
        outputToken: tokenOut === 'ETH' ? 'ETH' : 'BDOGE', // Default to BDOGE for demo
        usdValue: usdValue,
        pkpAddress: pkpEthAddress,
        pkpBalance: '0.5' // Mock balance
      });
    } catch (error) {
      console.error('Error executing Uniswap swap:', error);
      reply.code(500).send({
        status: 'error',
        error: {
          message: error.message,
          code: error.code,
          reason: error.reason
        }
      });
    }
  });

  // DCA Swap Lit Action endpoint
  fastify.post('/execute-dca-swap', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    console.log('Received request to /execute-dca-swap endpoint');
    try {
      const { 
        pkpEthAddress, 
        rpcUrl, 
        chainId, 
        tokenIn, 
        tokenOut, 
        amountIn, 
        scheduleId,
        spendingLimitContractAddress,
        toolIpfsId,
        policyIpfsId
      } = request.body;
      
      if (!pkpEthAddress || !tokenIn || !tokenOut || !amountIn || !chainId || !rpcUrl || !scheduleId) {
        return reply.code(400).send({
          status: 'error',
          error: {
            message: 'Missing required parameters'
          }
        });
      }

      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) // Remove 'Bearer ' prefix
        : null;
      
      if (!jwt) {
        return reply.code(401).send({
          status: 'error',
          error: {
            message: 'JWT token is required'
          }
        });
      }
      
      console.log(`Executing DCA swap for schedule ${scheduleId}: ${amountIn} ${tokenIn} to ${tokenOut}`);
      console.log(`Using tool IPFS ID: ${toolIpfsId || 'Not provided'}`);
      console.log(`Using policy IPFS ID: ${policyIpfsId || 'Not provided'}`);
      
      // In a real implementation, this would execute the Lit Action using the IPFS IDs
      // For now, we'll simulate a successful swap
      
      // Simulate a random transaction hash
      const mockTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      // Simulate output amount (for demo purposes)
      const outputAmount = (parseFloat(amountIn) * 420).toString(); // Mock conversion rate
      
      // Simulate USD value
      const usdValue = (parseFloat(amountIn) * 1800).toString(); // Mock ETH price in USD
      
      // Return a response that matches the Lit Action's response format
      reply.send({
        status: 'success',
        scheduleId: scheduleId,
        approvalHash: null, // No approval needed for ETH
        swapHash: mockTxHash,
        inputAmount: amountIn,
        inputToken: tokenIn === 'ETH' ? 'ETH' : tokenIn,
        outputAmount: outputAmount,
        outputToken: tokenOut === 'ETH' ? 'ETH' : 'BDOGE', // Default to BDOGE for demo
        usdValue: usdValue,
        pkpAddress: pkpEthAddress,
        pkpBalance: '0.5', // Mock balance
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error executing DCA swap:', error);
      reply.code(500).send({
        status: 'error',
        error: {
          message: error.message,
          code: error.code,
          reason: error.reason,
          scheduleId: request.body?.scheduleId
        }
      });
    }
  });

  // DCA Swap Lit Action endpoint (no auth - for testing only)
  fastify.post('/execute-dca-swap-no-auth', async (request, reply) => {
    console.log('Received request to /execute-dca-swap-no-auth endpoint (NO AUTH - FOR TESTING ONLY)');
    try {
      const { 
        pkpEthAddress, 
        rpcUrl, 
        chainId, 
        tokenIn, 
        tokenOut, 
        amountIn, 
        scheduleId,
        spendingLimitContractAddress,
        toolIpfsId,
        policyIpfsId
      } = request.body;
      
      if (!pkpEthAddress || !tokenIn || !tokenOut || !amountIn) {
        return reply.code(400).send({
          status: 'error',
          error: {
            message: 'Missing required parameters'
          }
        });
      }
      
      console.log(`[NO AUTH] Executing DCA swap for schedule ${scheduleId || 'Unknown'}: ${amountIn} ${tokenIn} to ${tokenOut}`);
      console.log(`[NO AUTH] Using tool IPFS ID: ${toolIpfsId || 'Not provided'}`);
      console.log(`[NO AUTH] Using policy IPFS ID: ${policyIpfsId || 'Not provided'}`);
      
      // Simulate a random transaction hash
      const mockTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      // Simulate output amount (for demo purposes)
      const outputAmount = (parseFloat(amountIn) * 420).toString(); // Mock conversion rate
      
      // Simulate USD value
      const usdValue = (parseFloat(amountIn) * 1800).toString(); // Mock ETH price in USD
      
      // Return a response that matches the Lit Action's response format
      reply.send({
        status: 'success',
        scheduleId: scheduleId || 'test-schedule',
        approvalHash: null, // No approval needed for ETH
        swapHash: mockTxHash,
        inputAmount: amountIn,
        inputToken: tokenIn === 'ETH' ? 'ETH' : tokenIn,
        outputAmount: outputAmount,
        outputToken: tokenOut === 'ETH' ? 'ETH' : 'BDOGE', // Default to BDOGE for demo
        usdValue: usdValue,
        pkpAddress: pkpEthAddress,
        pkpBalance: '0.5', // Mock balance
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[NO AUTH] Error executing DCA swap:', error);
      reply.code(500).send({
        status: 'error',
        error: {
          message: error.message,
          code: error.code,
          reason: error.reason,
          scheduleId: request.body?.scheduleId || 'test-schedule'
        }
      });
    }
  });

  // Spending Limits Info endpoint
  fastify.post('/spending-limits/info', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    console.log('Received request to /spending-limits/info endpoint');
    try {
      const { walletAddress, contractAddress, chainId } = request.body;
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const vincentSDK = new VincentSDK({
        jwt,
        litNetwork: process.env.LIT_NETWORK || 'datil',
      });
      
      console.log('Spending limits info request params:', {
        walletAddress,
        contractAddress,
        chainId
      });
      
      // Mock implementation for spending limits info
      // In a real implementation, this would query the SpendingLimits contract
      const mockSpendingLimitData = {
        limit: '100.0',
        spent: '25.5',
        remaining: '74.5',
        period: '86400', // 24 hours in seconds
        lastSpendTimestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      
      reply.send(mockSpendingLimitData);
    } catch (error) {
      console.error('Error fetching spending limits info:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // Wallet Balance endpoint
  fastify.post('/wallet/balance', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    console.log('Received request to /wallet/balance endpoint');
    try {
      const { walletAddress, chainId } = request.body;
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const vincentSDK = new VincentSDK({
        jwt,
        litNetwork: process.env.LIT_NETWORK || 'datil',
      });
      
      console.log('Wallet balance request params:', {
        walletAddress,
        chainId
      });
      
      // Base Sepolia RPC URL
      const rpcUrl = 'https://sepolia.base.org';
      
      // In a real implementation, this would use ethers.js to query the wallet balance
      // For now, we'll return a mock balance
      // This could be replaced with actual implementation using:
      // const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      // const balanceWei = await provider.getBalance(walletAddress);
      // const balanceEth = ethers.utils.formatEther(balanceWei);
      
      // Mock balance - in a real implementation, this would be fetched from the blockchain
      const mockBalance = (Math.random() * 2).toFixed(4); // Random balance between 0 and 2 ETH
      
      reply.send({
        success: true,
        balance: mockBalance,
        walletAddress,
        chainId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // Top Memecoin endpoint
  fastify.post('/tokens/top-memecoin', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    console.log('Received request to /tokens/top-memecoin endpoint');
    try {
      const { chainId } = request.body;
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const vincentSDK = new VincentSDK({
        jwt,
        litNetwork: process.env.LIT_NETWORK || 'datil',
      });
      
      console.log('Top memecoin request params:', {
        chainId
      });
      
      // In a real implementation, this would query a token API or DEX for top memecoins
      // For now, we'll return a mock memecoin
      
      // List of popular memecoins on Base Sepolia (mock data)
      const memecoins = [
        {
          name: 'Base Doge',
          symbol: 'BDOGE',
          address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed',
          decimals: 18,
          price: '0.00025',
          marketCap: '2500000',
          volume24h: '500000'
        },
        {
          name: 'Base Pepe',
          symbol: 'BPEPE',
          address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
          decimals: 18,
          price: '0.00015',
          marketCap: '1500000',
          volume24h: '300000'
        },
        {
          name: 'Base Shiba',
          symbol: 'BSHIB',
          address: '0x8E870D67F660D95d5be530380D0eC0bd388289E1',
          decimals: 18,
          price: '0.0000085',
          marketCap: '850000',
          volume24h: '250000'
        }
      ];
      
      // Select a random memecoin from the list
      const randomIndex = Math.floor(Math.random() * memecoins.length);
      const selectedMemecoin = memecoins[randomIndex];
      
      reply.send({
        success: true,
        ...selectedMemecoin,
        chainId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching top memecoin:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // Swap Quote endpoint
  fastify.post('/swap/quote', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    console.log('Received request to /swap/quote endpoint');
    try {
      const { tokenIn, tokenOut, amount, chainId } = request.body;
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const vincentSDK = new VincentSDK({
        jwt,
        litNetwork: process.env.LIT_NETWORK || 'datil',
      });
      
      console.log('Swap quote request params:', {
        tokenIn,
        tokenOut,
        amount,
        chainId
      });
      
      // Mock implementation for swap quote
      // In a real implementation, this would query a DEX like Uniswap
      const mockQuoteData = {
        inputAmount: amount,
        outputAmount: (parseFloat(amount) * 1850).toString(), // Mock exchange rate
        priceImpact: '0.05',
        gasEstimate: '150000',
        route: [tokenIn, tokenOut],
        usdValue: (parseFloat(amount) * 1850).toString(),
      };
      
      reply.send(mockQuoteData);
    } catch (error) {
      console.error('Error getting swap quote:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
  
  // Execute Swap with Spending Limits endpoint
  fastify.post('/swap/execute-with-limits', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    console.log('Received request to /swap/execute-with-limits endpoint');
    try {
      const { 
        tokenIn, 
        tokenOut, 
        amount, 
        walletAddress, 
        spendingLimitContractAddress, 
        chainId 
      } = request.body;
      
      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Initialize Vincent SDK with the JWT
      const vincentSDK = new VincentSDK({
        jwt,
        litNetwork: process.env.LIT_NETWORK || 'datil',
      });
      
      console.log('Execute swap with limits request params:', {
        tokenIn,
        tokenOut,
        amount,
        walletAddress,
        spendingLimitContractAddress,
        chainId
      });
      
      // Check spending limits first
      // In a real implementation, this would query the SpendingLimits contract
      const mockSpendingLimitData = {
        limit: '100.0',
        spent: '25.5',
        remaining: '74.5',
        period: '86400', // 24 hours in seconds
      };
      
      const amountInUsd = parseFloat(amount) * 1850; // Mock conversion to USD
      
      // Check if the swap would exceed spending limits
      if (amountInUsd > parseFloat(mockSpendingLimitData.remaining)) {
        return reply.code(400).send({
          success: false,
          error: `Swap amount exceeds remaining spending limit. Available: $${mockSpendingLimitData.remaining}, Required: $${amountInUsd}`
        });
      }
      
      // Mock implementation for swap execution
      // In a real implementation, this would execute a swap on a DEX like Uniswap
      const mockSwapResult = {
        txHash: '0x' + Math.random().toString(16).substring(2, 42),
        inputAmount: amount,
        outputAmount: (parseFloat(amount) * 1850).toString(),
        gasUsed: '120000',
        status: 'success',
        timestamp: new Date().toISOString()
      };
      
      reply.send({
        success: true,
        ...mockSwapResult
      });
    } catch (error) {
      console.error('Error executing swap with spending limits:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Simulate Buy endpoint
  fastify.post('/simulate-buy', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const { pkpEthAddress, tokenIn, tokenOut, amountIn, spendingLimitContractAddress } = request.body;
      
      if (!pkpEthAddress || !tokenIn || !tokenOut || !amountIn) {
        return reply.code(400).send({
          success: false,
          message: 'Missing required parameters'
        });
      }

      // Get JWT from auth header
      const authHeader = request.headers.authorization;
      const jwt = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) // Remove 'Bearer ' prefix
        : null;
      
      if (!jwt) {
        return reply.code(401).send({
          success: false,
          message: 'JWT token is required'
        });
      }

      console.log(`Simulating buy for ${amountIn} of ${tokenIn} to ${tokenOut}`);
      
      // In a real implementation, this would use the Lit Action to simulate the swap
      // For now, we'll return mock data
      const simulationResult = {
        status: 'success',
        approvalHash: '0x' + '0'.repeat(64),
        swapHash: '0x' + '1'.repeat(64),
        inputAmount: amountIn,
        inputToken: 'ETH',
        outputAmount: (parseFloat(amountIn) * 420).toString(),
        outputToken: 'BDOGE',
        usdValue: (parseFloat(amountIn) * 1800).toString(), // Assuming ETH price of $1800
        pkpAddress: pkpEthAddress,
        pkpBalance: '0.5' // Mock balance
      };
      
      reply.send({
        success: true,
        message: 'Simulation completed successfully',
        data: simulationResult
      });
    } catch (error) {
      console.error('Error simulating buy:', error);
      reply.code(500).send({
        success: false,
        message: 'Failed to simulate buy',
        error: error.message
      });
    }
  });
}
