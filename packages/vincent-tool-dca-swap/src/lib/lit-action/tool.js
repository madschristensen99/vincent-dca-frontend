// Vincent DCA Tool Lit Action (Lit Protocol Format)

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
      params.amountIn, // Use the amountIn parameter directly
      wallet.address,
      params.wethAddress
    );
    
    // Get Uniswap router and quoter addresses
    const { UNISWAP_V3_QUOTER, UNISWAP_V3_ROUTER } = getUniswapQuoterRouter(params.chainId, params);
    
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
    
    // Use runOnce to ensure only one node executes the transaction
    try {
      const runOnceResult = await Lit.Actions.runOnce({
        actionId: "swap-transaction",
        callback: function() {
          return new Promise(async (resolve, reject) => {
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
              
              // For ERC20 tokens, we need to approve the router first
              if (tokenInfo.tokenIn.address !== 'ETH') {
                console.log(`Approving ${tokenInfo.tokenIn.symbol} for Uniswap router...`);
                
                // Estimate gas for approval
                const approvalGasLimit = await tokenInfo.tokenIn.contract.estimateGas.approve(
                  UNISWAP_V3_ROUTER,
                  tokenInfo.tokenIn.amount
                ).catch(error => {
                  console.log('Error estimating approval gas:', error);
                  return ethers.BigNumber.from('100000'); // Default gas limit for approval
                });
                
                console.log(`Estimated approval gas limit: ${approvalGasLimit.toString()}`);
                
                // Create and sign approval transaction
                const approvalTx = await createTransaction(
                  UNISWAP_V3_ROUTER,
                  wallet.address,
                  approvalGasLimit,
                  tokenInfo.tokenIn.amount,
                  gasData,
                  true,
                  tokenInfo.tokenIn.contract,
                  null,
                  null
                );
                
                console.log('Signing approval transaction...');
                const signedApprovalTx = await wallet.signTransaction(approvalTx);
                
                console.log('Sending approval transaction...');
                const approvalTxResponse = await provider.sendTransaction(signedApprovalTx);
                
                console.log(`Approval transaction sent: ${approvalTxResponse.hash}`);
                console.log('Waiting for approval confirmation...');
                
                const approvalReceipt = await approvalTxResponse.wait();
                console.log(`Approval confirmed in block ${approvalReceipt.blockNumber}`);
                
                // Update nonce for the swap transaction
                gasData.nonce = nonce + 1;
              }
              
              // Estimate gas for swap
              let swapGasLimit;
              
              if (tokenInfo.tokenIn.address === 'ETH') {
                // For ETH input, we need to use a different method to estimate gas
                const routerAbi = [
                  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
                ];
                
                const routerContract = new ethers.Contract(UNISWAP_V3_ROUTER, routerAbi, provider);
                
                const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
                
                const exactInputSingleParams = {
                  tokenIn: params.wethAddress,
                  tokenOut: tokenInfo.tokenOut.address,
                  fee: bestFee,
                  recipient: params.recipient || wallet.address,
                  deadline: deadline,
                  amountIn: tokenInfo.tokenIn.amount,
                  amountOutMinimum: amountOutMin,
                  sqrtPriceLimitX96: 0
                };
                
                try {
                  swapGasLimit = await routerContract.estimateGas.exactInputSingle(
                    exactInputSingleParams,
                    { value: tokenInfo.tokenIn.amount, from: wallet.address }
                  );
                } catch (error) {
                  console.log('Error estimating swap gas:', error);
                  swapGasLimit = ethers.BigNumber.from('500000'); // Default gas limit for swap
                }
              } else {
                // For ERC20 input, we can estimate gas normally
                const routerAbi = [
                  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)'
                ];
                
                const routerContract = new ethers.Contract(UNISWAP_V3_ROUTER, routerAbi, provider);
                
                const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
                
                const exactInputSingleParams = {
                  tokenIn: tokenInfo.tokenIn.address,
                  tokenOut: tokenInfo.tokenOut.address,
                  fee: bestFee,
                  recipient: params.recipient || wallet.address,
                  deadline: deadline,
                  amountIn: tokenInfo.tokenIn.amount,
                  amountOutMinimum: amountOutMin,
                  sqrtPriceLimitX96: 0
                };
                
                try {
                  swapGasLimit = await routerContract.estimateGas.exactInputSingle(
                    exactInputSingleParams,
                    { from: wallet.address }
                  );
                } catch (error) {
                  console.log('Error estimating swap gas:', error);
                  swapGasLimit = ethers.BigNumber.from('500000'); // Default gas limit for swap
                }
              }
              
              console.log(`Estimated swap gas limit: ${swapGasLimit.toString()}`);
              
              // Add a buffer to the gas limit
              const gasLimitBuffer = 1.2; // 20% buffer
              const updatedGasLimit = ethers.BigNumber.from(Math.floor(swapGasLimit.toNumber() * gasLimitBuffer));
              
              // Update gas data with the new gas limit
              const updatedGasData = {
                ...gasData,
                gasLimit: updatedGasLimit
              };
              
              // Create and sign the swap transaction
              const swapTx = await createTransaction(
                UNISWAP_V3_ROUTER,
                wallet.address,
                updatedGasLimit,
                tokenInfo.tokenIn.amount,
                updatedGasData,
                false,
                tokenInfo.tokenIn.contract,
                tokenInfo.tokenOut.address,
                params.recipient || wallet.address,
                { fee: bestFee, amountOutMin, wethAddress: params.wethAddress }
              );
              
              console.log('Signing swap transaction...');
              const signedSwapTx = await wallet.signTransaction(swapTx);
              
              console.log('Sending swap transaction...');
              const swapTxResponse = await provider.sendTransaction(signedSwapTx);
              
              console.log(`Swap transaction sent: ${swapTxResponse.hash}`);
              console.log('Waiting for swap confirmation...');
              
              const swapReceipt = await swapTxResponse.wait();
              
              if (swapReceipt.status === 0) {
                reject(new Error(`Transaction failed: ${swapTxResponse.hash}`));
                return;
              }
              
              console.log(`Swap confirmed in block ${swapReceipt.blockNumber}`);
              
              // Return the transaction details
              resolve({
                success: true,
                transactionHash: swapTxResponse.hash,
                blockNumber: swapReceipt.blockNumber,
                gasUsed: swapReceipt.gasUsed.toString(),
                effectiveGasPrice: swapReceipt.effectiveGasPrice.toString(),
                from: tokenInfo.tokenIn.symbol,
                to: tokenInfo.tokenOut.symbol,
                amount: ethers.utils.formatUnits(tokenInfo.tokenIn.amount, tokenInfo.tokenIn.decimals)
              });
            } catch (error) {
              console.log(`Error in runOnce callback: ${error}`);
              reject(error);
            }
          });
        }
      });
      
      console.log("runOnce result:", JSON.stringify(runOnceResult));
      
      if (!runOnceResult) {
        throw new Error("RunOnce returned undefined result");
      }
      
      if (runOnceResult.error) {
        throw new Error(`RunOnce failed: ${runOnceResult.error}`);
      }
      
      if (runOnceResult.result) {
        return runOnceResult.result;
      } else {
        // If this node didn't execute the transaction (another node did)
        return {
          success: true,
          message: "Transaction executed by another node",
          transactionHash: runOnceResult.txHash || "Unknown"
        };
      }
    } catch (error) {
      console.log("Error with runOnce:", error);
      
      // If runOnce fails, fall back to direct execution
      console.log("Falling back to direct transaction execution without runOnce");
      
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
      
      // For ERC20 tokens, we need to approve the router first
      if (tokenInfo.tokenIn.address !== 'ETH') {
        console.log(`Approving ${tokenInfo.tokenIn.symbol} for Uniswap router...`);
        
        // Estimate gas for approval
        const approvalGasLimit = await tokenInfo.tokenIn.contract.estimateGas.approve(
          UNISWAP_V3_ROUTER,
          tokenInfo.tokenIn.amount
        ).catch(error => {
          console.log('Error estimating approval gas:', error);
          return ethers.BigNumber.from('100000'); // Default gas limit for approval
        });
        
        console.log(`Estimated approval gas limit: ${approvalGasLimit.toString()}`);
        
        // Create and sign approval transaction
        const approvalTx = await createTransaction(
          UNISWAP_V3_ROUTER,
          wallet.address,
          approvalGasLimit,
          tokenInfo.tokenIn.amount,
          gasData,
          true,
          tokenInfo.tokenIn.contract,
          null,
          null
        );
        
        console.log('Signing approval transaction...');
        const signedApprovalTx = await wallet.signTransaction(approvalTx);
        
        console.log('Sending approval transaction...');
        const approvalTxResponse = await provider.sendTransaction(signedApprovalTx);
        
        console.log(`Approval transaction sent: ${approvalTxResponse.hash}`);
        console.log('Waiting for approval confirmation...');
        
        const approvalReceipt = await approvalTxResponse.wait();
        console.log(`Approval confirmed in block ${approvalReceipt.blockNumber}`);
        
        // Update nonce for the swap transaction
        gasData.nonce = nonce + 1;
      }
      
      // Estimate gas for swap
      let swapGasLimit;
      
      if (tokenInfo.tokenIn.address === 'ETH') {
        // For ETH input, we need to use a different method to estimate gas
        const routerAbi = [
          'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
        ];
        
        const routerContract = new ethers.Contract(UNISWAP_V3_ROUTER, routerAbi, provider);
        
        const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
        
        const exactInputSingleParams = {
          tokenIn: params.wethAddress,
          tokenOut: tokenInfo.tokenOut.address,
          fee: bestFee,
          recipient: params.recipient || wallet.address,
          deadline: deadline,
          amountIn: tokenInfo.tokenIn.amount,
          amountOutMinimum: amountOutMin,
          sqrtPriceLimitX96: 0
        };
        
        try {
          swapGasLimit = await routerContract.estimateGas.exactInputSingle(
            exactInputSingleParams,
            { value: tokenInfo.tokenIn.amount, from: wallet.address }
          );
        } catch (error) {
          console.log('Error estimating swap gas:', error);
          swapGasLimit = ethers.BigNumber.from('500000'); // Default gas limit for swap
        }
      } else {
        // For ERC20 input, we can estimate gas normally
        const routerAbi = [
          'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)'
        ];
        
        const routerContract = new ethers.Contract(UNISWAP_V3_ROUTER, routerAbi, provider);
        
        const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
        
        const exactInputSingleParams = {
          tokenIn: tokenInfo.tokenIn.address,
          tokenOut: tokenInfo.tokenOut.address,
          fee: bestFee,
          recipient: params.recipient || wallet.address,
          deadline: deadline,
          amountIn: tokenInfo.tokenIn.amount,
          amountOutMinimum: amountOutMin,
          sqrtPriceLimitX96: 0
        };
        
        try {
          swapGasLimit = await routerContract.estimateGas.exactInputSingle(
            exactInputSingleParams,
            { from: wallet.address }
          );
        } catch (error) {
          console.log('Error estimating swap gas:', error);
          swapGasLimit = ethers.BigNumber.from('500000'); // Default gas limit for swap
        }
      }
      
      console.log(`Estimated swap gas limit: ${swapGasLimit.toString()}`);
      
      // Add a buffer to the gas limit
      const gasLimitBuffer = 1.2; // 20% buffer
      const updatedGasLimit = ethers.BigNumber.from(Math.floor(swapGasLimit.toNumber() * gasLimitBuffer));
      
      // Update gas data with the new gas limit
      const updatedGasData = {
        ...gasData,
        gasLimit: updatedGasLimit
      };
      
      // Create and sign the swap transaction
      const swapTx = await createTransaction(
        UNISWAP_V3_ROUTER,
        wallet.address,
        updatedGasLimit,
        tokenInfo.tokenIn.amount,
        updatedGasData,
        false,
        tokenInfo.tokenIn.contract,
        tokenInfo.tokenOut.address,
        params.recipient || wallet.address,
        { fee: bestFee, amountOutMin, wethAddress: params.wethAddress }
      );
      
      console.log('Signing swap transaction...');
      const signedSwapTx = await wallet.signTransaction(swapTx);
      
      console.log('Sending swap transaction...');
      const swapTxResponse = await provider.sendTransaction(signedSwapTx);
      
      console.log(`Swap transaction sent: ${swapTxResponse.hash}`);
      console.log('Waiting for swap confirmation...');
      
      const swapReceipt = await swapTxResponse.wait();
      
      if (swapReceipt.status === 0) {
        throw new Error(`Transaction failed: ${swapTxResponse.hash}`);
      }
      
      console.log(`Swap confirmed in block ${swapReceipt.blockNumber}`);
      
      // Return the transaction details
      return {
        success: true,
        transactionHash: swapTxResponse.hash,
        blockNumber: swapReceipt.blockNumber,
        gasUsed: swapReceipt.gasUsed.toString(),
        effectiveGasPrice: swapReceipt.effectiveGasPrice.toString(),
        from: tokenInfo.tokenIn.symbol,
        to: tokenInfo.tokenOut.symbol,
        amount: ethers.utils.formatUnits(tokenInfo.tokenIn.amount, tokenInfo.tokenIn.decimals)
      };
    }
    
  } catch (error) {
    console.log(`Error executing swap: ${error}`);
    
    // Extract transaction details if available
    const txDetails = {};
    
    if (error.transaction) {
      txDetails.transaction = {
        hash: error.transaction.hash,
        from: error.transaction.from,
        to: error.transaction.to,
        value: error.transaction.value ? ethers.utils.formatEther(error.transaction.value) : '0',
        data: error.transaction.data
      };
    }
    
    if (error.receipt) {
      txDetails.receipt = {
        status: error.receipt.status,
        blockNumber: error.receipt.blockNumber,
        gasUsed: error.receipt.gasUsed ? error.receipt.gasUsed.toString() : '0'
      };
    }
    
    return {
      success: false,
      error: error.message || String(error),
      ...txDetails
    };
  }
}

// Format and validate private key
function formatPrivateKey(key) {
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
  
  // Validate that it's a proper private key format
  try {
    // This will throw if the key is invalid
    const wallet = new ethers.Wallet(formattedKey);
    console.log(`Successfully validated private key. Wallet address: ${wallet.address}`);
    return formattedKey;
  } catch (error) {
    console.error('Invalid private key format:', error.message);
    return null;
  }
}

// Get token info (symbol, decimals, etc.)
async function getTokenInfo(provider, tokenIn, tokenOut, amountIn, walletAddress, wethAddress) {
  const result = {
    tokenIn: {},
    tokenOut: {}
  };
  
  // Handle ETH as a special case for tokenIn
  if (tokenIn.toLowerCase() === 'eth') {
    result.tokenIn = {
      address: 'ETH',
      symbol: 'ETH',
      decimals: 18,
      amount: ethers.utils.parseEther(amountIn),
      contract: 'ETH'
    };
  } else {
    // For ERC20 tokens, query the contract
    const tokenInContract = new ethers.Contract(
      tokenIn,
      [
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)'
      ],
      provider
    );
    
    const [symbol, decimals, balance] = await Promise.all([
      tokenInContract.symbol(),
      tokenInContract.decimals(),
      tokenInContract.balanceOf(walletAddress)
    ]);
    
    const amount = ethers.utils.parseUnits(amountIn, decimals);
    
    result.tokenIn = {
      address: tokenIn,
      symbol,
      decimals,
      balance,
      amount,
      contract: tokenInContract
    };
  }
  
  // Get token out info
  const tokenOutContract = new ethers.Contract(
    tokenOut,
    [
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function balanceOf(address) view returns (uint256)'
    ],
    provider
  );
  
  try {
    const [symbol, decimals, balance] = await Promise.all([
      tokenOutContract.symbol(),
      tokenOutContract.decimals(),
      tokenOutContract.balanceOf(walletAddress)
    ]);
    
    result.tokenOut = {
      address: tokenOut,
      symbol,
      decimals,
      balance
    };
    
    console.log(`Swapping ${ethers.utils.formatUnits(result.tokenIn.amount, result.tokenIn.decimals)} ${result.tokenIn.symbol} to ${result.tokenOut.symbol}`);
  } catch (error) {
    console.error(`Error getting token out info: ${error.message}`);
    
    // Fallback to basic info
    result.tokenOut = {
      address: tokenOut,
      decimals: 18 // Assume 18 decimals as fallback
    };
  }
  
  return result;
}

// Get Uniswap router and quoter addresses for the given chain
function getUniswapQuoterRouter(chainId, params) {
  // Use provided addresses if available
  if (params.uniswapQuoterAddress && params.uniswapRouterAddress) {
    return {
      UNISWAP_V3_QUOTER: params.uniswapQuoterAddress,
      UNISWAP_V3_ROUTER: params.uniswapRouterAddress
    };
  }
  
  // Default to Base Mainnet addresses
  let UNISWAP_V3_QUOTER = '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a';
  let UNISWAP_V3_ROUTER = '0x2626664c2603336e57b271c5c0b26f421741e481';
  
  // Chain-specific addresses
  if (chainId === '84532') { // Base Sepolia
    UNISWAP_V3_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
    UNISWAP_V3_ROUTER = '0x4752ba5DBc23F44D41AAe9AE3EE0Bf8A5791F83c';
  } else if (chainId === '8453') { // Base Mainnet
    UNISWAP_V3_QUOTER = '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a';
    UNISWAP_V3_ROUTER = '0x2626664c2603336e57b271c5c0b26f421741e481';
  }
  
  return { UNISWAP_V3_QUOTER, UNISWAP_V3_ROUTER };
}

// Get the best quote for a swap
async function getBestQuote(provider, quoterAddress, amountIn, decimalsOut, tokenIn, tokenOut, slippageBps) {
  console.log(`Getting best quote for ${amountIn} of ${tokenIn} to ${tokenOut} with ${slippageBps} bps slippage`);
  
  // Define fee tiers to check
  const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
  
  // Quoter contract interface
  const quoterAbi = [
    'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
  ];
  
  const quoterContract = new ethers.Contract(quoterAddress, quoterAbi, provider);
  
  let bestQuote = ethers.BigNumber.from(0);
  let bestFee = 3000; // Default to 0.3% fee tier
  let foundLiquidity = false;
  
  // Try each fee tier
  for (const fee of feeTiers) {
    try {
      console.log(`Checking ${fee} fee tier...`);
      const amountOut = await quoterContract.callStatic.quoteExactInputSingle(
        tokenIn,
        tokenOut,
        fee,
        amountIn,
        0 // No price limit
      );
      
      console.log(`Quote for ${fee} fee tier: ${amountOut.toString()}`);
      
      // If this is the best quote so far, update
      if (amountOut.gt(bestQuote)) {
        bestQuote = amountOut;
        bestFee = fee;
        foundLiquidity = true;
      }
    } catch (error) {
      console.log(`No liquidity found for ${fee} fee tier: ${error}`);
    }
  }
  
  // If no liquidity found in any fee tier, use default values
  if (!foundLiquidity) {
    console.log('No liquidity found in any fee tier, using default fee tier (3000) and minimum amount out (1)');
    return {
      bestFee: 3000,
      amountOutMin: 1
    };
  }
  
  // Calculate minimum amount out based on slippage
  const slippageFactor = 10000 - parseInt(slippageBps);
  const amountOutMin = bestQuote.mul(slippageFactor).div(10000);
  
  console.log(`Best fee tier: ${bestFee}, Best quote: ${bestQuote.toString()}, Minimum out: ${amountOutMin.toString()}`);
  
  return {
    bestFee,
    amountOutMin
  };
}

// Get gas data for transactions
async function getGasData(provider, address) {
  const feeData = await provider.getFeeData();
  const nonce = await provider.getTransactionCount(address);
  
  console.log(`Current gas price: ${ethers.utils.formatUnits(feeData.gasPrice, 'gwei')} Gwei`);
  console.log(`Current nonce: ${nonce}`);
  
  return {
    gasPrice: feeData.gasPrice,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    nonce
  };
}

// Estimate gas limit for a transaction
async function estimateGasLimit(provider, from, to, tokenContract, amount, isApproval, swapParams = {}) {
  try {
    if (isApproval) {
      // For approval transactions
      const approvalData = tokenContract.interface.encodeFunctionData('approve', [to, amount]);
      
      const gasEstimate = await provider.estimateGas({
        from,
        to: tokenContract.address,
        data: approvalData
      });
      
      // Add 20% buffer for safety
      return gasEstimate.mul(12).div(10);
    } else {
      // For swap transactions, use a conservative estimate
      return ethers.BigNumber.from(500000);
    }
  } catch (error) {
    console.error('Error estimating gas limit:', error);
    // Fallback to a conservative gas limit
    return ethers.BigNumber.from(500000);
  }
}

// Create a transaction
async function createTransaction(to, from, gasLimit, amount, gasData, isApproval, tokenContract, tokenOut, recipient, swapParams = {}) {
  if (isApproval) {
    // Create approval transaction
    const approvalData = tokenContract.interface.encodeFunctionData('approve', [to, amount]);
    
    return {
      from,
      to: tokenContract.address,
      data: approvalData,
      gasLimit,
      gasPrice: gasData.gasPrice,
      nonce: gasData.nonce
    };
  } else {
    // Create swap transaction
    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
    
    // For ETH input, we need to use the exactInputSingleETH function
    if (tokenContract === 'ETH') {
      // Create router contract with SwapRouter02 interface for ETH input
      const routerAbi = [
        'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
        'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
      ];
      
      const routerContract = new ethers.Contract(to, routerAbi, ethers.provider);
      
      // For ETH input, we use the WETH address as tokenIn
      const exactInputSingleParams = {
        tokenIn: swapParams.wethAddress,
        tokenOut: tokenOut,
        fee: swapParams.fee || 3000,
        recipient: recipient,
        deadline: deadline,
        amountIn: amount,
        amountOutMinimum: swapParams.amountOutMin || 1,
        sqrtPriceLimitX96: 0 // No price limit
      };
      
      const swapData = routerContract.interface.encodeFunctionData('exactInputSingle', [exactInputSingleParams]);
      
      return {
        from,
        to,
        data: swapData,
        value: amount,
        gasLimit,
        gasPrice: gasData.gasPrice,
        nonce: gasData.nonce
      };
    } else {
      // Create router contract with SwapRouter02 interface for ERC20 input
      const routerAbi = [
        'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)'
      ];
      
      const routerContract = new ethers.Contract(to, routerAbi, ethers.provider);
      
      // Prepare swap parameters for ERC20 input
      const exactInputSingleParams = {
        tokenIn: tokenContract.address,
        tokenOut: tokenOut,
        fee: swapParams.fee || 3000,
        recipient: recipient,
        deadline: deadline,
        amountIn: amount,
        amountOutMinimum: swapParams.amountOutMin || 1,
        sqrtPriceLimitX96: 0 // No price limit
      };
      
      const swapData = routerContract.interface.encodeFunctionData('exactInputSingle', [exactInputSingleParams]);
      
      return {
        from,
        to,
        data: swapData,
        gasLimit,
        gasPrice: gasData.gasPrice,
        nonce: gasData.nonce
      };
    }
  }
}
