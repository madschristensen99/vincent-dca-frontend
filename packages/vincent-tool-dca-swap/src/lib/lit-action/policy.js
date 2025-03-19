// Vincent DCA Policy Lit Action (Lit Protocol Format)

(async function() {
  try {
    // Parse parameters from Lit
    let params;
    
    // Handle both direct params and litActionParams formats
    if (typeof litActionParams !== 'undefined') {
      params = JSON.parse(litActionParams);
    } else if (typeof params !== 'undefined') {
      // params is already defined, use it directly
    } else {
      throw new Error("No parameters provided to policy check");
    }
    
    // Extract required parameters
    const {
      privateKey,
      rpcUrl,
      chainId,
      tokenIn,
      tokenOut,
      amountIn,
      slippage,
      recipient,
      uniswapQuoterAddress,
      uniswapRouterAddress,
      wethAddress,
      policySchemaIpfsId,
      allowedTokens = [],
      parentToolIpfsCid
    } = params;
    
    console.log(`Checking policy for swap from ${tokenIn} to ${tokenOut}`);
    console.log(`Amount: ${amountIn}, Recipient: ${recipient}`);
    console.log(`Uniswap addresses - Quoter: ${uniswapQuoterAddress}, Router: ${uniswapRouterAddress}, WETH: ${wethAddress}`);
    
    if (parentToolIpfsCid) {
      console.log(`Called from parent tool: ${parentToolIpfsCid}`);
    }
    
    // Setup ethers provider to check on-chain data if needed
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    console.log('Provider created');
    
    // Check provider connection
    try {
      const networkInfo = await provider.getNetwork();
      console.log(`Connected to network: ${networkInfo.name} (${networkInfo.chainId})`);
    } catch (error) {
      console.log(`Error connecting to provider: ${error.message}`);
      throw new Error("Provider connection failed: " + error.message);
    }
    
    // Validate token addresses if allowedTokens is provided
    if (allowedTokens.length > 0) {
      // For ETH input, we don't need to check the allowlist
      if (tokenIn.toLowerCase() !== 'eth') {
        const isTokenInAllowed = allowedTokens.some(
          token => token.toLowerCase() === tokenIn.toLowerCase()
        );
        
        if (!isTokenInAllowed) {
          throw new Error(`Input token ${tokenIn} is not in the allowed tokens list`);
        }
      }
      
      // Check if output token is in the allowed list
      const isTokenOutAllowed = allowedTokens.some(
        token => token.toLowerCase() === tokenOut.toLowerCase()
      );
      
      if (!isTokenOutAllowed) {
        throw new Error(`Output token ${tokenOut} is not in the allowed tokens list`);
      }
      
      console.log('Token addresses validated against allowlist');
    }
    
    // Parse the amount to validate it's a positive number
    const amountValue = parseFloat(amountIn);
    if (isNaN(amountValue) || amountValue <= 0) {
      throw new Error(`Invalid amount: ${amountIn}. Amount must be a positive number.`);
    }
    
    // Validate slippage (must be between 1 and 5000, representing 0.01% to 50%)
    const slippageValue = parseInt(slippage);
    if (isNaN(slippageValue) || slippageValue < 1 || slippageValue > 5000) {
      throw new Error(`Invalid slippage: ${slippage}. Slippage must be between 1 and 5000 (0.01% to 50%).`);
    }
    
    // Validate recipient address
    if (!recipient || !ethers.utils.isAddress(recipient)) {
      throw new Error(`Invalid recipient address: ${recipient}`);
    }
    
    // Validate Uniswap addresses
    if (!uniswapQuoterAddress || !ethers.utils.isAddress(uniswapQuoterAddress)) {
      throw new Error(`Invalid Uniswap Quoter address: ${uniswapQuoterAddress}`);
    }
    
    if (!uniswapRouterAddress || !ethers.utils.isAddress(uniswapRouterAddress)) {
      throw new Error(`Invalid Uniswap Router address: ${uniswapRouterAddress}`);
    }
    
    if (!wethAddress || !ethers.utils.isAddress(wethAddress)) {
      throw new Error(`Invalid WETH address: ${wethAddress}`);
    }
    
    // Initialize wallet to check balance
    const wallet = new ethers.Wallet(privateKey, provider);
    const walletAddress = wallet.address;
    console.log(`Using wallet address: ${walletAddress}`);
    
    // Check wallet balance for ETH swaps
    if (tokenIn.toLowerCase() === 'eth') {
      const balance = await provider.getBalance(walletAddress);
      console.log(`Wallet ETH balance: ${ethers.utils.formatEther(balance)} ETH`);
      
      // Convert amountIn to wei for comparison
      const amountInWei = ethers.utils.parseEther(amountIn);
      
      // Ensure wallet has enough ETH (including some for gas)
      const gasBuffer = ethers.utils.parseEther('0.001'); // Reduced from 0.005 to 0.001 ETH for gas
      
      // For very small transactions (less than 0.001 ETH), use a smaller gas buffer
      if (amountInWei.lt(ethers.utils.parseEther('0.001'))) {
        // For micro transactions, use a smaller buffer
        if (balance.lt(amountInWei.add(gasBuffer))) {
          throw new Error(`Insufficient ETH balance. Have ${ethers.utils.formatEther(balance)} ETH, need ${ethers.utils.formatEther(amountInWei.add(gasBuffer))} ETH (including gas buffer).`);
        }
      } else {
        // For larger transactions, use the standard buffer
        if (balance.lt(amountInWei.add(gasBuffer))) {
          throw new Error(`Insufficient ETH balance. Have ${ethers.utils.formatEther(balance)} ETH, need ${ethers.utils.formatEther(amountInWei.add(gasBuffer))} ETH (including gas buffer).`);
        }
      }
    } else {
      // For token swaps, check token balance
      const tokenContract = new ethers.Contract(
        tokenIn,
        [
          'function balanceOf(address) view returns (uint256)',
          'function decimals() view returns (uint8)'
        ],
        provider
      );
      
      try {
        const decimals = await tokenContract.decimals();
        const balance = await tokenContract.balanceOf(walletAddress);
        const formattedBalance = ethers.utils.formatUnits(balance, decimals);
        console.log(`Wallet token balance: ${formattedBalance} tokens`);
        
        // Convert amountIn to token units for comparison
        const amountInUnits = ethers.utils.parseUnits(amountIn, decimals);
        
        if (balance.lt(amountInUnits)) {
          throw new Error(`Insufficient token balance. Have ${formattedBalance} tokens, need ${amountIn} tokens.`);
        }
      } catch (error) {
        throw new Error(`Error checking token balance: ${error.message}`);
      }
    }
    
    // All checks passed, approve the transaction
    console.log('Policy check passed');
    const result = {
      success: true,
      allowed: true,
      reason: "Transaction is within spending limits and uses allowed tokens"
    };
    
    Lit.Actions.setResponse({response: JSON.stringify(result)});
  } catch (error) {
    console.log("Error in DCA Swap Policy: " + error.message);
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        allowed: false,
        error: error.message || "Unknown error"
      })
    });
  }
})();
