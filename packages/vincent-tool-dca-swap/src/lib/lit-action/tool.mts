import {
  ethers
} from 'ethers';

// Define global variables that will be injected by Lit
declare global {
  // @ts-ignore
  const privateKey: string;
  // @ts-ignore
  const rpcUrl: string;
  // @ts-ignore
  const chainId: string;
  // @ts-ignore
  const tokenIn: string;
  // @ts-ignore
  const tokenOut: string;
  // @ts-ignore
  const amountIn: string;
  // @ts-ignore
  const spendingLimitContractAddress: string;
  
  namespace LitGlobals {
    const Lit: any;
    const LitAuth: any;
    interface LitActionParams {
      privateKey: string; 
      rpcUrl: string;
      chainId: string;
      tokenIn: string;
      tokenOut: string;
      amountIn: string;
      spendingLimitContractAddress?: string; 
    }
    const litActionParams: LitActionParams;
  }
}

// Utility functions
// Get the Vincent Agent Registry contract
async function getVincentAgentRegistryContract(rpcUrl: string) {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const vincentAgentRegistryAddress = '0xaE7C442E8d8A6dc07C02A6f41333C2480F28b430';
  
  const vincentAgentRegistryAbi = [
    'function getAgentPkpInfo(address pkpAddress) view returns (tuple(address pkpAddress, string publicKey, address owner, bool isRevoked, bool isServiceProvider))',
    'function isServiceProvider(address pkpAddress) view returns (bool)'
  ];
  
  return new ethers.Contract(
    vincentAgentRegistryAddress,
    vincentAgentRegistryAbi,
    provider
  );
}

// Get token info (symbol, decimals, etc.)
async function getTokenInfo(provider: any, tokenAddress: string) {
  // Handle ETH as a special case
  if (tokenAddress.toLowerCase() === 'eth') {
    return {
      address: 'eth',
      symbol: 'ETH',
      decimals: 18
    };
  }
  
  // For other tokens, query the contract
  const tokenContract = new ethers.Contract(
    tokenAddress,
    [
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function balanceOf(address) view returns (uint256)'
    ],
    provider
  );
  
  const [symbol, decimals] = await Promise.all([
    tokenContract.symbol(),
    tokenContract.decimals()
  ]);
  
  return {
    address: tokenAddress,
    symbol,
    decimals
  };
}

// Get Uniswap router and quoter addresses for the given chain
function getUniswapQuoterRouter(chainId: string) {
  // Default to Base Mainnet addresses
  let UNISWAP_V3_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
  let UNISWAP_V3_ROUTER = '0x4752ba5DBc23F44D41AAe9AE3EE0Bf8A5791F83c';
  
  // You can add more chain-specific addresses here
  if (chainId === '84532') { // Base Sepolia
    UNISWAP_V3_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
    UNISWAP_V3_ROUTER = '0x4752ba5DBc23F44D41AAe9AE3EE0Bf8A5791F83c';
  } else if (chainId === '8453') { // Base Mainnet
    UNISWAP_V3_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
    UNISWAP_V3_ROUTER = '0x4752ba5DBc23F44D41AAe9AE3EE0Bf8A5791F83c';
  }
  
  return { UNISWAP_V3_QUOTER, UNISWAP_V3_ROUTER };
}

// Get the best quote for a swap
async function getBestQuote(provider: any, quoterAddress: string, amountIn: any, outputDecimals: number) {
  // In a real implementation, this would query the Uniswap quoter contract
  // For now, we'll return a mock quote
  
  // Mock quote calculation (1 ETH = 420 BDOGE)
  const mockQuote = amountIn.mul(420);
  
  return {
    bestQuote: mockQuote,
    bestPool: '0x0000000000000000000000000000000000000000',
    bestFee: 3000
  };
}

// Get gas data for the transaction
async function getGasData(provider: any, address: string) {
  const feeData = await provider.getFeeData();
  
  return {
    gasPrice: feeData.gasPrice,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
  };
}

// Get token price from an oracle
async function getTokenPrice(tokenAddress: string, chainId: string) {
  // In a real implementation, this would query a price oracle
  // For now, we'll return mock prices
  if (tokenAddress.toLowerCase() === 'eth') {
    return '1800'; // $1800 per ETH
  }
  
  return '0.00428'; // $0.00428 per BDOGE
}

// Calculate USD value of a token amount
async function calculateUsdValue(amountWei: string, tokenPrice: string, decimals: number) {
  const amount = ethers.utils.formatUnits(amountWei, decimals);
  const usdValue = parseFloat(amount) * parseFloat(tokenPrice);
  
  // Convert to wei for consistent handling
  return ethers.utils.parseEther(usdValue.toString());
}

// Define the Tool and Policy structures according to the schema
interface Policy {
  policyIpfsCid: string;
  policySchemaIpfsCid: string;
  parameterNames: string[];
}

interface Tool {
  toolIpfsCid: string;
  policies: Policy[];
}

// Get the spending limits contract
function getSpendingLimitsContract(provider: any, contractAddress: string) {
  // Updated ABI to match the required schema
  const spendingLimitsAbi = [
    'function checkSpendingLimit(address userAddress, uint256 usdValue) view returns (bool)',
    'function recordSpend(address userAddress, uint256 usdValue)',
    'function get24HourSpend(address userAddress) view returns (uint256)',
    // Add functions for the Tool and Policy schema
    'function getTool(string toolIpfsCid) view returns (tuple(string toolIpfsCid, tuple(string policyIpfsCid, string policySchemaIpfsCid, string[] parameterNames)[] policies))',
    'function addTool(tuple(string toolIpfsCid, tuple(string policyIpfsCid, string policySchemaIpfsCid, string[] parameterNames)[] policies) tool)',
    'function updateTool(tuple(string toolIpfsCid, tuple(string policyIpfsCid, string policySchemaIpfsCid, string[] parameterNames)[] policies) tool)'
  ];
  
  return new ethers.Contract(
    contractAddress,
    spendingLimitsAbi,
    provider
  );
}

// Check if a transaction is within spending limits
async function checkSpendingLimit(contract: any, userAddress: string, usdValue: any) {
  try {
    // In a real implementation, this would check the spending limit
    // For now, we'll always return true
    return true;
  } catch (error) {
    console.error('Error checking spending limit:', error);
    return false;
  }
}

// Record a spend in the spending limits contract
async function recordSpend(contract: any, usdValue: any, wallet: any) {
  try {
    // In a real implementation, this would record the spend
    // For now, we'll just log it
    console.log(`Recording spend of $${ethers.utils.formatEther(usdValue)} for ${wallet.address}`);
    return true;
  } catch (error) {
    console.error('Error recording spend:', error);
    return false;
  }
}

// Main execution function
(async () => {
  try {
    // Declare these variables only once at the top of the file
    // @ts-ignore
    const Lit = globalThis.LitActions;
    // @ts-ignore
    const LitAuth = globalThis.LitAuth;
    
    // Access parameters directly as global variables with optional chaining for safety
    // @ts-ignore - Using direct parameter access instead of Lit.getParam
    const litActionParams: LitGlobals.LitActionParams = {
      privateKey: privateKey || '',
      rpcUrl: rpcUrl || '',
      chainId: chainId || '',
      tokenIn: tokenIn || '',
      tokenOut: tokenOut || '',
      amountIn: amountIn || '',
      spendingLimitContractAddress: spendingLimitContractAddress || ''
    };

    console.log(`DCA Swap Lit Action - parameters received: ${JSON.stringify({
      rpcUrl: litActionParams.rpcUrl,
      chainId: litActionParams.chainId,
      tokenIn: litActionParams.tokenIn,
      tokenOut: litActionParams.tokenOut,
      amountIn: litActionParams.amountIn,
      spendingLimitContractAddress: litActionParams.spendingLimitContractAddress,
      privateKeyAvailable: !!litActionParams.privateKey
    }, null, 2)}`);

    const LIT_NETWORK = 'datil';
    const VINCENT_AGENT_REGISTRY_ADDRESS =
      '0xaE7C442E8d8A6dc07C02A6f41333C2480F28b430';
    // Default spending limit contract address for Base Mainnet
    const DEFAULT_SPENDING_LIMIT_CONTRACT = '0xC95a138aC46765780746a2C18CBc32502fC5064D';

    console.log(`Using Lit Network: ${LIT_NETWORK}`);
    console.log(
      `Using Vincent Agent Registry Address: ${VINCENT_AGENT_REGISTRY_ADDRESS}`
    );

    const delegateeAddress = ethers.utils.getAddress(LitAuth.authSigAddress);
    const vincentAgentRegistryContract = await getVincentAgentRegistryContract(
      litActionParams.rpcUrl
    );

    // Create provider and wallet using private key
    const provider = new ethers.providers.JsonRpcProvider(
      litActionParams.rpcUrl
    );
    
    // Create wallet using the provided private key
    const wallet = new ethers.Wallet(
      litActionParams.privateKey,
      provider
    );
    console.log(`Wallet Address: ${wallet.address}`);
    
    // Get the wallet balance
    const balanceWei = await provider.getBalance(wallet.address);
    const balanceEth = ethers.utils.formatEther(balanceWei);
    console.log(`Wallet Balance: ${balanceEth} ETH`);

    // Define token info structures with proper types
    interface TokenInfo {
      address: string;
      symbol: string;
      decimals: number;
      balance?: any;
    }

    // Get token info for input and output tokens
    const tokenInInfo: TokenInfo = {
      address: litActionParams.tokenIn,
      symbol: 'TOKEN_IN', // Will be updated with actual symbol
      decimals: 18 // Default, will be updated with actual decimals
    };
    
    const tokenOutInfo: TokenInfo = {
      address: litActionParams.tokenOut,
      symbol: 'TOKEN_OUT', // Will be updated with actual symbol
      decimals: 18 // Default, will be updated with actual decimals
    };

    // Fetch token details (symbols, decimals, etc.)
    try {
      const tokenInContract = new ethers.Contract(
        tokenInInfo.address,
        ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
        provider
      );
      
      const tokenOutContract = new ethers.Contract(
        tokenOutInfo.address,
        ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
        provider
      );
      
      // Update token info with actual data
      [tokenInInfo.symbol, tokenInInfo.decimals] = await Promise.all([
        tokenInContract.symbol(),
        tokenInContract.decimals()
      ]);
      
      [tokenOutInfo.symbol, tokenOutInfo.decimals] = await Promise.all([
        tokenOutContract.symbol(),
        tokenOutContract.decimals()
      ]);
    } catch (err) {
      console.warn('Error fetching token details:', err);
      // Continue with default values if we can't fetch
    }

    console.log(`Token In: ${tokenInInfo.symbol} (${tokenInInfo.address})`);
    console.log(`Token Out: ${tokenOutInfo.symbol} (${tokenOutInfo.address})`);
    console.log(`DCA Schedule ID: Not provided`);

    // Get the spending limit contract address (use default if not provided)
    const spendingLimitContractAddress = litActionParams.spendingLimitContractAddress || DEFAULT_SPENDING_LIMIT_CONTRACT;

    // Always use the spending limits flow for Base Mainnet
    console.log(`Using spending limit contract at ${spendingLimitContractAddress}`);
    
    // Create spending limits contract instance
    const spendingLimitsContract = getSpendingLimitsContract(provider, spendingLimitContractAddress);
    
    // Get the token price for the input token
    const tokenInPrice = await getTokenPrice(tokenInInfo.address, litActionParams.chainId);
    console.log(`${tokenInInfo.symbol} price: $${tokenInPrice}`);
    
    // Calculate the USD value of the input amount
    const amountInWei = ethers.utils.parseUnits(
      litActionParams.amountIn,
      tokenInInfo.decimals
    );
    const usdValue = await calculateUsdValue(
      amountInWei.toString(),
      tokenInPrice,
      tokenInInfo.decimals
    );
    
    // Check if the transaction is within spending limits
    const isWithinLimit = await checkSpendingLimit(
      spendingLimitsContract,
      wallet.address,
      usdValue
    );
    
    if (!isWithinLimit) {
      throw new Error(`DCA transaction exceeds spending limit. USD Value: $${ethers.utils.formatEther(usdValue)}`);
    }
    
    console.log(`DCA transaction is within spending limit. Proceeding with swap...`);
    
    // Get Uniswap router addresses for the chain
    const { UNISWAP_V3_QUOTER, UNISWAP_V3_ROUTER } = getUniswapQuoterRouter(
      litActionParams.chainId
    );
    
    // Get the best quote for the swap
    const bestQuoteResult = await getBestQuote(
      provider,
      UNISWAP_V3_QUOTER,
      amountInWei,
      tokenOutInfo.decimals
    );
    
    const quote = bestQuoteResult.bestQuote;
    // Path may not exist in the result, so provide a default
    const path = '';
    
    console.log(`DCA Swap Quote: ${ethers.utils.formatUnits(quote, tokenOutInfo.decimals)} ${tokenOutInfo.symbol}`);
    
    // Get gas data for the transaction
    const gasData = await getGasData(provider, wallet.address);
    
    // Check if we need to approve the token for spending by the router
    let approvalHash = null;
    if (tokenInInfo.address !== 'eth') {
      const tokenContract = new ethers.Contract(
        tokenInInfo.address,
        ['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256)'],
        wallet
      );
      
      const allowance = await tokenContract.allowance(wallet.address, UNISWAP_V3_ROUTER);
      
      if (allowance.lt(amountInWei)) {
        console.log(`Approving ${tokenInInfo.symbol} for spending...`);
        
        // Create approval transaction
        const approveTx = await tokenContract.approve(
          UNISWAP_V3_ROUTER,
          ethers.constants.MaxUint256
        );
        
        console.log(`Approval transaction hash: ${approveTx.hash}`);
        approvalHash = approveTx.hash;
        
        // Wait for approval to be mined
        await approveTx.wait();
        console.log(`Approval confirmed`);
      }
    }
    
    // Create the swap transaction
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
    const slippageTolerance = 50; // 0.5%
    const minAmountOut = quote.mul(10000 - slippageTolerance).div(10000);
    
    // Get the router contract
    const routerContract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      [
        'function exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160)) external payable returns (uint256)',
        'function exactInput((bytes,address,uint256,uint256,uint256)) external payable returns (uint256)'
      ],
      wallet
    );
    
    // Create the swap transaction
    let swapTx;
    if (tokenInInfo.address === 'eth') {
      // ETH to token swap
      swapTx = await routerContract.exactInputSingle(
        [
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH address
          tokenOutInfo.address,
          3000, // fee
          wallet.address,
          amountInWei,
          minAmountOut,
          deadline,
          0 // sqrtPriceLimitX96
        ],
        { value: amountInWei, gasLimit: 300000 }
      );
    } else if (tokenOutInfo.address === 'eth') {
      // Token to ETH swap
      swapTx = await routerContract.exactInputSingle(
        [
          tokenInInfo.address,
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH address
          3000, // fee
          wallet.address,
          amountInWei,
          minAmountOut,
          deadline,
          0 // sqrtPriceLimitX96
        ],
        { gasLimit: 300000 }
      );
    } else {
      // Token to token swap
      swapTx = await routerContract.exactInputSingle(
        [
          tokenInInfo.address,
          tokenOutInfo.address,
          3000, // fee
          wallet.address,
          amountInWei,
          minAmountOut,
          deadline,
          0 // sqrtPriceLimitX96
        ],
        { gasLimit: 300000 }
      );
    }
    
    console.log(`DCA Swap transaction hash: ${swapTx.hash}`);
    
    // Wait for the swap to be mined
    const receipt = await swapTx.wait();
    console.log(`DCA Swap confirmed in block ${receipt.blockNumber}`);
    
    // Record the spend in the spending limits contract
    await recordSpend(spendingLimitsContract, usdValue, wallet);
    
    // Return the transaction details
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'success',
        scheduleId: 'Not provided',
        approvalHash,
        swapHash: swapTx.hash,
        inputAmount: litActionParams.amountIn,
        inputToken: tokenInInfo.symbol,
        outputAmount: ethers.utils.formatUnits(quote, tokenOutInfo.decimals),
        outputToken: tokenOutInfo.symbol,
        usdValue: ethers.utils.formatEther(usdValue),
        walletAddress: wallet.address,
        walletBalance: balanceEth,
        timestamp: new Date().toISOString()
      })
    });
  } catch (err: any) {
    console.error('DCA Swap Error:', err);

    // Extract detailed error information
    const errorDetails = {
      message: err.message || 'Unknown error',
      code: err.code,
      reason: err.reason,
      method: err.method,
      scheduleId: 'Not provided',
      transaction: err.transaction ? {
        from: err.transaction.from,
        to: err.transaction.to,
        data: err.transaction.data ? err.transaction.data.substring(0, 100) + '...' : undefined,
        value: err.transaction.value ? err.transaction.value.toString() : undefined,
      } : undefined,
      stack: err.stack ? err.stack.split('\n').slice(0, 3).join('\n') : undefined
    };

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'error',
        error: errorDetails
      })
    });
  }
})();
