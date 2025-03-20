// Vincent DCA Tool Lit Action (Lit Protocol Format)

// Import utility functions
// Note: In Lit Actions, we can't directly import from external files
// So we'll keep the utility functions inline but mark them as coming from utils.js
function formatPrivateKey(key) {
  // Implementation from utils.js
  if (!key) return null;
  
  // Remove any whitespace
  let formattedKey = key.trim();
  
  // Handle case where key might have duplicate 0x prefix
  if (formattedKey.startsWith('0x0x')) {
    formattedKey = '0x' + formattedKey.substring(4);
  }
  
  // Add 0x prefix if missing
  if (!formattedKey.startsWith('0x')) {
    formattedKey = '0x' + formattedKey;
  }
  
  // If key is too long (more than 66 chars for a standard Ethereum private key)
  // try to extract the correct portion
  if (formattedKey.length > 66) {
    // Try to extract a valid 64-character hex string after the 0x prefix
    const hexPart = formattedKey.substring(2);
    if (hexPart.length >= 64) {
      formattedKey = '0x' + hexPart.substring(0, 64);
    }
  }
  
  return formattedKey;
}

function getUniswapAddresses(chainId, params) {
  // Implementation from utils.js
  // Use params if provided (override chainId-based defaults)
  if (params.uniswapQuoterAddress && params.uniswapRouterAddress) {
    return {
      UNISWAP_V3_QUOTER: params.uniswapQuoterAddress,
      UNISWAP_V3_ROUTER: params.uniswapRouterAddress
    };
  }
  
  // Base Mainnet (chainId: 8453)
  if (chainId === '8453' || chainId === 8453) {
    return {
      UNISWAP_V3_QUOTER: '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a',
      UNISWAP_V3_ROUTER: '0x2626664c2603336e57b271c5c0b26f421741e481'
    };
  }
  
  // Default to Base Mainnet
  return {
    UNISWAP_V3_QUOTER: '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a',
    UNISWAP_V3_ROUTER: '0x2626664c2603336e57b271c5c0b26f421741e481'
  };
}

(async () => {
  try {
    // Parse parameters from Lit
    let params;
    
    // Handle both direct params and litActionParams formats
    if (typeof litActionParams !== 'undefined') {
      params = JSON.parse(litActionParams);
      console.log('DCA Swap Tool received params for', params.tokenIn, 'to', params.tokenOut);
    } else if (typeof params !== 'undefined') {
      // params is already defined, use it directly
      console.log('DCA Swap Tool received direct params');
    } else {
      throw new Error("No parameters provided to DCA Swap Tool");
    }
    
    // Validate and format the private key
    const privateKey = formatPrivateKey(params.privateKey);
    
    // Create ethers provider
    const provider = new ethers.providers.JsonRpcProvider(params.rpcUrl);
    
    // Create wallet
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Get token information
    const tokenInfo = await getTokenInfo(
      provider,
      params.tokenIn,
      params.tokenOut,
      params.amountIn, // Use the amountIn parameter directly
      wallet.address,
      params.wethAddress
    );
    
    // Check if policy IPFS ID is provided
    if (params.policyIpfsId) {
      console.log(`Policy IPFS ID found: ${params.policyIpfsId}`);
      console.log('Running policy check as a child Lit Action');
      
      // Prepare policy params - pass all the original params
      const policyParams = {
        ...params,
        parentToolIpfsCid: LitAuth?.actionIpfsIds?.[0] // Include the parent tool IPFS ID if available
      };
      
      try {
        // Call the policy Lit Action
        const policyResult = await Lit.Actions.call({
          ipfsId: params.policyIpfsId,
          params: {
            litActionParams: JSON.stringify(policyParams)
          }
        });
        
        // Parse the policy result
        const policyResponse = JSON.parse(policyResult);
        console.log('Policy check result:', policyResponse);
        
        // Check if the policy check passed
        if (!policyResponse.success || !policyResponse.allowed) {
          const errorMessage = policyResponse.error || policyResponse.reason || 'Policy check failed';
          console.log(`Policy check failed: ${errorMessage}`);
          return Lit.Actions.setResponse({
            response: JSON.stringify({
              success: false,
              error: errorMessage
            })
          });
        }
        
        console.log('Policy check passed, proceeding with swap execution');
      } catch (policyError) {
        console.error('Error executing policy check:', policyError);
        return Lit.Actions.setResponse({
          response: JSON.stringify({
            success: false,
            error: `Policy check error: ${policyError.message || String(policyError)}`
          })
        });
      }
    } else {
      console.log('No policy IPFS ID provided, skipping policy check');
    }
    
    // Execute the swap
    const result = await executeSwap(params);
    
    // Return the result
    return Lit.Actions.setResponse({
      response: JSON.stringify(result)
    });
  } catch (error) {
    console.log("Error in DCA Swap Tool: " + error.message);
    
    // Extract detailed error information
    const errorDetails = {
      message: error.message,
      code: error.code,
      reason: error.reason,
      error: error.error,
      ...(error.transaction && { transaction: error.transaction }),
      ...(error.receipt && { receipt: error.receipt }),
    };
    
    return Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message || String(error),
        details: errorDetails
      })
    });
  }
})();

// Helper functions for the Lit Action

// Execute the swap transaction
async function executeSwap(params) {
  try {
    console.log(`Executing swap from ${params.tokenIn} to ${params.tokenOut}`);
    console.log(`Amount: ${params.amountIn}, Recipient: ${params.recipient}`);
    console.log(`Uniswap addresses - Router: ${params.uniswapRouterAddress}, WETH: ${params.wethAddress}`);
    
    // Setup provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(params.rpcUrl);
    const wallet = new ethers.Wallet(formatPrivateKey(params.privateKey), provider);
    
    // Get network information
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (${network.chainId})`);
    
    // Log wallet address
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Get wallet ETH balance
    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`Wallet ETH balance: ${ethers.utils.formatEther(ethBalance)} ETH`);
    
    // Get token information
    const tokenInfo = await getTokenInfo(
      provider,
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      wallet.address,
      params.wethAddress
    );
    
    // Get Uniswap router and quoter addresses
    const { UNISWAP_V3_QUOTER, UNISWAP_V3_ROUTER } = getUniswapAddresses(params.chainId, params);
    
    // For ETH input, we need to use WETH address for the quoter
    const tokenInAddress = tokenInfo.tokenIn.address === 'ETH' ? params.wethAddress : tokenInfo.tokenIn.address;
    
    // Get the best quote from Uniswap
    console.log(`Getting quotes for ${tokenInfo.tokenIn.amount} input amount`);
    
    let bestFee = 3000; // Default to 0.3% fee tier
    let amountOutMin = 1; // Default to 1 wei as minimum output
    
    try {
      const { bestFee: fee, amountOutMin: minOut } = await getBestQuote(
        provider,
        UNISWAP_V3_QUOTER,
        tokenInfo.tokenIn.amount,
        tokenInfo.tokenOut.decimals,
        tokenInAddress,
        tokenInfo.tokenOut.address,
        params.slippage || '100'
      );
      
      bestFee = fee;
      amountOutMin = minOut;
    } catch (error) {
      console.log('Error getting quote:', error);
      console.log('Using fallback minimum amount out (1 wei)');
    }
    
    console.log(`Best fee tier: ${bestFee}, Minimum output amount: ${amountOutMin}`);
    
    // Execute the transaction directly instead of using runOnce
    try {
      // Get current gas price
      const gasPrice = await provider.getGasPrice();
      console.log(`Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} Gwei`);
      
      // Get current nonce
      const nonce = await provider.getTransactionCount(wallet.address);
      console.log(`Current nonce: ${nonce}`);
      
      // Prepare gas data
      const gasData = {
        gasPrice,
        nonce
      };
      
      // Create the transaction
      let tx;
      let receipt;
      
      // Check if we're swapping from ETH
      if (tokenInfo.tokenIn.address === 'ETH') {
        console.log('Swapping from ETH to token');
        
        // Create the exact input single parameters
        const swapParams = {
          tokenIn: params.wethAddress,
          tokenOut: tokenInfo.tokenOut.address,
          fee: bestFee,
          recipient: params.recipient,
          amountIn: tokenInfo.tokenIn.amount,
          amountOutMinimum: amountOutMin,
          sqrtPriceLimitX96: 0
        };
        
        // Create the transaction
        const routerContract = new ethers.Contract(
          UNISWAP_V3_ROUTER,
          [
            'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
            'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
          ],
          wallet
        );
        
        // Estimate gas limit
        const gasLimit = await routerContract.estimateGas.exactInputSingle(
          swapParams,
          { value: tokenInfo.tokenIn.amount }
        );
        console.log(`Estimated gas limit: ${gasLimit.toString()}`);
        
        // Send the transaction
        tx = await routerContract.exactInputSingle(
          swapParams,
          {
            value: tokenInfo.tokenIn.amount,
            gasPrice: gasData.gasPrice,
            gasLimit: gasLimit.mul(120).div(100), // Add 20% buffer
            nonce: gasData.nonce
          }
        );
      } else {
        console.log('Swapping from token to token');
        
        // Get token contract
        const tokenContract = new ethers.Contract(
          tokenInfo.tokenIn.address,
          [
            'function approve(address spender, uint256 amount) external returns (bool)',
            'function allowance(address owner, address spender) external view returns (uint256)'
          ],
          wallet
        );
        
        // Check allowance
        const allowance = await tokenContract.allowance(wallet.address, UNISWAP_V3_ROUTER);
        console.log(`Current allowance: ${allowance.toString()}`);
        
        // Approve if needed
        if (allowance.lt(tokenInfo.tokenIn.amount)) {
          console.log('Approving token spend...');
          
          // Estimate gas for approval
          const approvalGasLimit = await tokenContract.estimateGas.approve(
            UNISWAP_V3_ROUTER,
            ethers.constants.MaxUint256
          );
          
          // Send approval transaction
          const approvalTx = await tokenContract.approve(
            UNISWAP_V3_ROUTER,
            ethers.constants.MaxUint256,
            {
              gasPrice: gasData.gasPrice,
              gasLimit: approvalGasLimit.mul(120).div(100), // Add 20% buffer
              nonce: gasData.nonce
            }
          );
          
          console.log(`Approval transaction sent: ${approvalTx.hash}`);
          
          // Wait for approval to be mined
          const approvalReceipt = await approvalTx.wait();
          console.log(`Approval confirmed in block ${approvalReceipt.blockNumber}`);
          
          // Increment nonce for the swap transaction
          gasData.nonce++;
        }
        
        // Create the exact input single parameters
        const swapParams = {
          tokenIn: tokenInfo.tokenIn.address,
          tokenOut: tokenInfo.tokenOut.address,
          fee: bestFee,
          recipient: params.recipient,
          amountIn: tokenInfo.tokenIn.amount,
          amountOutMinimum: amountOutMin,
          sqrtPriceLimitX96: 0
        };
        
        // Create the router contract
        const routerContract = new ethers.Contract(
          UNISWAP_V3_ROUTER,
          [
            'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
          ],
          wallet
        );
        
        // Estimate gas limit
        const gasLimit = await routerContract.estimateGas.exactInputSingle(swapParams);
        console.log(`Estimated gas limit: ${gasLimit.toString()}`);
        
        // Send the transaction
        tx = await routerContract.exactInputSingle(
          swapParams,
          {
            gasPrice: gasData.gasPrice,
            gasLimit: gasLimit.mul(120).div(100), // Add 20% buffer
            nonce: gasData.nonce
          }
        );
      }
      
      console.log(`Swap transaction sent: ${tx.hash}`);
      
      // Wait for transaction to be mined
      receipt = await tx.wait();
      console.log(`Swap confirmed in block ${receipt.blockNumber}`);
      
      // Return the result
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Error executing transaction:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error executing swap:', error);
    throw error;
  }
}

// Get token information (symbol, decimals, etc.)
async function getTokenInfo(provider, tokenIn, tokenOut, amountIn, walletAddress, wethAddress) {
  try {
    const result = {
      tokenIn: {},
      tokenOut: {}
    };
    
    // Handle token in
    if (tokenIn.toLowerCase() === 'eth') {
      result.tokenIn = {
        address: 'ETH',
        symbol: 'ETH',
        decimals: 18,
        amount: ethers.utils.parseEther(amountIn.toString())
      };
    } else {
      const tokenInContract = new ethers.Contract(
        tokenIn,
        [
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)',
          'function balanceOf(address owner) view returns (uint256)'
        ],
        provider
      );
      
      const [symbol, decimals, balance] = await Promise.all([
        tokenInContract.symbol(),
        tokenInContract.decimals(),
        tokenInContract.balanceOf(walletAddress)
      ]);
      
      result.tokenIn = {
        address: tokenIn,
        symbol,
        decimals,
        balance: balance.toString(),
        amount: ethers.utils.parseUnits(amountIn.toString(), decimals)
      };
    }
    
    // Handle token out
    const tokenOutContract = new ethers.Contract(
      tokenOut,
      [
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function balanceOf(address owner) view returns (uint256)'
      ],
      provider
    );
    
    const [symbol, decimals, balance] = await Promise.all([
      tokenOutContract.symbol(),
      tokenOutContract.decimals(),
      tokenOutContract.balanceOf(walletAddress)
    ]);
    
    result.tokenOut = {
      address: tokenOut,
      symbol,
      decimals,
      balance: balance.toString()
    };
    
    return result;
  } catch (error) {
    console.error('Error getting token info:', error);
    throw error;
  }
}

// Get the best quote for a swap
async function getBestQuote(provider, quoterAddress, amountIn, decimalsOut, tokenIn, tokenOut, slippageBps) {
  try {
    // Create quoter contract
    const quoterContract = new ethers.Contract(
      quoterAddress,
      [
        'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
      ],
      provider
    );
    
    // Fee tiers to check
    const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    
    // Get quotes for each fee tier
    const quotes = await Promise.all(
      feeTiers.map(async (fee) => {
        try {
          const amountOut = await quoterContract.callStatic.quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0 // No price limit
          );
          
          return {
            fee,
            amountOut
          };
        } catch (error) {
          console.log(`Quote failed for fee tier ${fee/10000}%:`, error.message);
          return {
            fee,
            amountOut: ethers.BigNumber.from(0)
          };
        }
      })
    );
    
    // Find the best quote
    const bestQuote = quotes.reduce((best, current) => {
      return current.amountOut.gt(best.amountOut) ? current : best;
    }, { fee: 0, amountOut: ethers.BigNumber.from(0) });
    
    console.log('Quote results:');
    quotes.forEach(quote => {
      console.log(`- Fee tier ${quote.fee/10000}%: ${ethers.utils.formatUnits(quote.amountOut, decimalsOut)} tokens`);
    });
    
    // If no valid quotes found, use default values instead of throwing an error
    if (bestQuote.amountOut.isZero()) {
      console.log('No valid quotes found for any fee tier, using default fee tier (0.3%) and minimum amount (1 wei)');
      return {
        bestFee: 3000, // Default to 0.3% fee tier
        amountOut: ethers.BigNumber.from(1),
        amountOutMin: ethers.BigNumber.from(1) // Minimum of 1 wei
      };
    }
    
    console.log(`Best quote: ${ethers.utils.formatUnits(bestQuote.amountOut, decimalsOut)} tokens at fee tier ${bestQuote.fee/10000}%`);
    
    // Calculate minimum amount out with slippage
    const slippageMultiplier = ethers.BigNumber.from(10000).sub(ethers.BigNumber.from(slippageBps));
    const amountOutMin = bestQuote.amountOut.mul(slippageMultiplier).div(10000);
    
    console.log(`Minimum amount out with ${slippageBps/100}% slippage: ${ethers.utils.formatUnits(amountOutMin, decimalsOut)} tokens`);
    
    return {
      bestFee: bestQuote.fee,
      amountOut: bestQuote.amountOut,
      amountOutMin
    };
  } catch (error) {
    console.error('Error getting quote:', error);
    // Return default values instead of throwing an error
    console.log('Error in quote process, using default fee tier (0.3%) and minimum amount (1 wei)');
    return {
      bestFee: 3000, // Default to 0.3% fee tier
      amountOut: ethers.BigNumber.from(1),
      amountOutMin: ethers.BigNumber.from(1) // Minimum of 1 wei
    };
  }
}
