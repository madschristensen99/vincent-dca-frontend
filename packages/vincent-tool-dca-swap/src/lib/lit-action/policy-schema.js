// Vincent DCA Policy Schema Lit Action (Lit Protocol Format)

(function() {
  try {
    // Define a comprehensive policy schema
    const schema = {
      type: "object",
      properties: {
        privateKey: {
          type: "string",
          description: "Private key for the wallet"
        },
        tokenIn: {
          type: "string",
          description: "Input token (eth or token address)"
        },
        tokenOut: {
          type: "string",
          description: "Output token address"
        },
        amountIn: {
          type: "string",
          description: "Amount to swap"
        },
        slippage: {
          type: "string",
          description: "Slippage tolerance in basis points (e.g., 50 = 0.5%)"
        },
        recipient: {
          type: "string",
          description: "Address to receive the swapped tokens"
        },
        rpcUrl: {
          type: "string",
          description: "RPC URL for the network"
        },
        chainId: {
          type: "string",
          description: "Chain ID for the network"
        },
        uniswapQuoterAddress: {
          type: "string",
          description: "Address of the Uniswap Quoter contract"
        },
        uniswapRouterAddress: {
          type: "string",
          description: "Address of the Uniswap Router contract"
        },
        wethAddress: {
          type: "string",
          description: "Address of the WETH contract"
        },
        allowedTokens: {
          type: "array",
          description: "List of allowed token addresses",
          items: {
            type: "string"
          }
        }
      },
      required: [
        "privateKey", 
        "tokenIn", 
        "tokenOut", 
        "amountIn", 
        "rpcUrl", 
        "chainId",
        "uniswapQuoterAddress",
        "uniswapRouterAddress",
        "wethAddress"
      ]
    };
    
    // Return the schema
    Lit.Actions.setResponse({response: JSON.stringify(schema)});
  } catch (error) {
    console.log("Error in DCA Swap Policy Schema: " + error.message);
    
    // Return error
    Lit.Actions.setResponse({
      response: JSON.stringify({
        error: error.message || "Unknown error"
      })
    });
  }
})();
