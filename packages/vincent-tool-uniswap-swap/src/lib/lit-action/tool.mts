import {
  getVincentAgentRegistryContract,
  getPkpInfo,
  getBestQuote,
  getUniswapQuoterRouter,
  getTokenInfo,
  getGasData,
  estimateGasLimit,
  createTransaction,
  signTx,
  broadcastTransaction,
  getTokenPrice,
  calculateUsdValue,
  getSpendingLimitsContract,
  checkSpendingLimit,
  recordSpend
} from './utils/index.mts';

declare global {
  // Injected By Lit
  const Lit: any;
  const LitAuth: any;
  const ethers: any;
  const litActionParams: {
    pkpEthAddress: string;
    rpcUrl: string;
    chainId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    spendingLimitContractAddress?: string; // Optional parameter for spending limit contract
  };
}

// ABI for SpendingLimits contract
const SPENDING_LIMITS_ABI = [
    {
      "type": "function",
      "name": "checkLimit",
      "inputs": [
        {"name": "user", "type": "address", "internalType": "address"},
        {"name": "amount", "type": "uint256", "internalType": "uint256"}
      ],
      "outputs": [
        {"name": "", "type": "bool", "internalType": "bool"}
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "limit",
      "inputs": [],
      "outputs": [
        {"name": "", "type": "uint256", "internalType": "uint256"}
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "period",
      "inputs": [],
      "outputs": [
        {"name": "", "type": "uint256", "internalType": "uint256"}
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "pruneOldSpends",
      "inputs": [
        {"name": "user", "type": "address", "internalType": "address"}
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "spend",
      "inputs": [
        {"name": "amount", "type": "uint256", "internalType": "uint256"}
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "spends",
      "inputs": [
        {"name": "", "type": "address", "internalType": "address"},
        {"name": "", "type": "uint256", "internalType": "uint256"}
      ],
      "outputs": [
        {"name": "amount", "type": "uint256", "internalType": "uint256"},
        {"name": "timestamp", "type": "uint256", "internalType": "uint256"}
      ],
      "stateMutability": "view"
    },
    {
      "type": "error",
      "name": "SpendLimitExceeded",
      "inputs": [
        {"name": "user", "type": "address", "internalType": "address"},
        {"name": "amount", "type": "uint256", "internalType": "uint256"}
      ]
    }
  ];

// Function to fetch token price in USD from DexScreener
async function getTokenPriceInUSD(tokenAddress: string): Promise<number> {
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
  const data = await response.json();
  if (data.pairs && data.pairs.length > 0) {
    return parseFloat(data.pairs[0].priceUsd);
  }
  throw new Error('Token price not found');
}

(async () => {
  try {
    console.log(`litActionParams: ${JSON.stringify(litActionParams, null, 2)}`);

    const LIT_NETWORK = 'datil';
    const VINCENT_AGENT_REGISTRY_ADDRESS = '0xaE7C442E8d8A6dc07C02A6f41333C2480F28b430';
    // Spending limit contract address for Base Mainnet
    const SPENDING_LIMITS_ADDRESS = '0xdAAe7CE713313b2C62eC5284DD3f3F7f4bA95332';

    console.log(`Using Lit Network: ${LIT_NETWORK}`);
    console.log(`Using Vincent Agent Registry Address: ${VINCENT_AGENT_REGISTRY_ADDRESS}`);
    console.log(`Using Spending Limits Address: ${SPENDING_LIMITS_ADDRESS}`);

    const delegateeAddress = ethers.utils.getAddress(LitAuth.authSigAddress);
    const vincentAgentRegistryContract = await getVincentAgentRegistryContract(
      VINCENT_AGENT_REGISTRY_ADDRESS
    );

    const pkp = await getPkpInfo(litActionParams.pkpEthAddress);

    console.log(
      `Getting App for delegatee ${delegateeAddress} and PKP ${pkp.tokenId}...`
    );
    const app = await vincentAgentRegistryContract.getAppByDelegateeForAgentPkp(
      delegateeAddress,
      pkp.tokenId
    );
    console.log(`Got the App: ${JSON.stringify(app, null, 2)}`);

    if (!app.isEnabled) {
      throw new Error('App is not enabled');
    }

    const toolIpfsCid = LitAuth.actionIpfsIds[0];
    console.log(
      `Checking if tool ${toolIpfsCid} is permitted for PKP. Permitted tools: ${app.toolIpfsCids}`
    );
    const toolIndex = app.toolIpfsCids.indexOf(toolIpfsCid);
    if (toolIndex === -1) {
      throw new Error('Tool is not permitted for this PKP');
    }
    if (!app.toolEnabled[toolIndex]) {
      throw new Error('Tool is not enabled');
    }

    console.log('Starting tool policy check...');

    const policyParameterNames = app.policyParamNames[toolIndex];
    console.log(`Policy parameter names: ${policyParameterNames}`);

    const policyParameterValues = app.policyValues[toolIndex];
    console.log(`Policy parameter values: ${policyParameterValues}`);

    let maxAmountUSD: any;

    for (const [i, parameterName] of policyParameterNames.entries()) {
      switch (parameterName) {
        case 'maxAmountUSD':
          maxAmountUSD = ethers.BigNumber.from(policyParameterValues[i]);
          console.log(`Formatted maxAmountUSD: ${maxAmountUSD.toString()}`);
          break;
        default:
          throw new Error(
            `Unsupported policy parameter name: ${parameterName}`
          );
      }
    }

    const amountInBigNumber = ethers.BigNumber.from(
      ethers.utils.parseEther(litActionParams.amountIn)
    );

    // Fetch token prices in USD
    const tokenInPriceUSD = await getTokenPriceInUSD(litActionParams.tokenIn);
    const tokenOutPriceUSD = await getTokenPriceInUSD(litActionParams.tokenOut);

    // Convert amountIn to USD
    const amountInUSD = amountInBigNumber.mul(ethers.utils.parseUnits(tokenInPriceUSD.toString(), 18)).div(ethers.constants.WeiPerEther);
    console.log(
      `Checking if amount in USD ${amountInUSD.toString()} exceeds maxAmountUSD ${maxAmountUSD.toString()}...`
    );

    if (amountInUSD.gt(maxAmountUSD)) {
      throw new Error(
        `Amount in USD ${ethers.utils.formatUnits(
          amountInUSD
        )} exceeds the maximum amount in USD ${ethers.utils.formatUnits(maxAmountUSD)}`
      );
    }

    console.log('Tool policy check passed');

    console.log('Starting tool execution...');

    // Create provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(
      litActionParams.rpcUrl
    );
    
    // Get the PKP wallet - using publicKey as the private key
    const pkpWallet = new ethers.Wallet(
      pkp.publicKey, // Using publicKey as the private key source
      provider
    );
    console.log(`PKP Wallet Address: ${pkpWallet.address}`);
    
    // Get the wallet balance
    const balanceWei = await provider.getBalance(pkpWallet.address);
    const balanceEth = ethers.utils.formatEther(balanceWei);
    console.log(`PKP Wallet Balance: ${balanceEth} ETH`);

    // Get the spending limit contract address (use default if not provided)
    const spendingLimitContractAddress = litActionParams.spendingLimitContractAddress || SPENDING_LIMITS_ADDRESS;

    // Initialize SpendingLimits contract
    const spendingLimitsContract = getSpendingLimitsContract(provider, spendingLimitContractAddress);
    
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

    // Always use the spending limits flow for Base Sepolia
    console.log(`Using spending limit contract at ${spendingLimitContractAddress}`);
    
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
      pkpWallet.address,
      usdValue
    );
    
    if (!isWithinLimit) {
      throw new Error(`Transaction exceeds spending limit. USD Value: $${ethers.utils.formatEther(usdValue)}`);
    }
    
    console.log(`Transaction is within spending limit. Proceeding with swap...`);
    
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
    
    console.log(`Swap Quote: ${ethers.utils.formatUnits(quote, tokenOutInfo.decimals)} ${tokenOutInfo.symbol}`);
    
    // Get gas data for the transaction
    const gasData = await getGasData(provider, pkpWallet.address);
    
    // Check if we need to approve the token for spending by the router
    let approvalHash = null;
    if (tokenInInfo.address !== 'eth') {
      const tokenContract = new ethers.Contract(
        tokenInInfo.address,
        ['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256)'],
        pkpWallet
      );
      
      const allowance = await tokenContract.allowance(pkpWallet.address, UNISWAP_V3_ROUTER);
      
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
      pkpWallet
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
          pkpWallet.address,
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
          pkpWallet.address,
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
          pkpWallet.address,
          amountInWei,
          minAmountOut,
          deadline,
          0 // sqrtPriceLimitX96
        ],
        { gasLimit: 300000 }
      );
    }
    
    console.log(`Swap transaction hash: ${swapTx.hash}`);
    
    // Wait for the swap to be mined
    const receipt = await swapTx.wait();
    console.log(`Swap confirmed in block ${receipt.blockNumber}`);
    
    // Record the spend in the spending limits contract
    await recordSpend(spendingLimitsContract, usdValue, pkpWallet);
    
    // Return the transaction details
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'success',
        approvalHash,
        swapHash: swapTx.hash,
        inputAmount: litActionParams.amountIn,
        inputToken: tokenInInfo.symbol,
        outputAmount: ethers.utils.formatUnits(quote, tokenOutInfo.decimals),
        outputToken: tokenOutInfo.symbol,
        usdValue: ethers.utils.formatEther(usdValue),
        pkpAddress: pkpWallet.address,
        pkpBalance: balanceEth
      })
    });
  } catch (err: any) {
    console.error('Error:', err);

    // Extract detailed error information
    const errorDetails = {
      message: err.message || 'Unknown error',
      code: err.code,
      reason: err.reason,
      method: err.method,
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
