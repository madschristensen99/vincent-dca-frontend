/**
 * Retrieves the USD price of a token using DexScreener API.
 * @param {string} tokenAddress - The token contract address.
 * @param {string} chainId - The chain ID.
 * @returns {Promise<number>} Token price in USD.
 */
export async function getTokenPrice(tokenAddress: string, chainId: string): Promise<number> {
  console.log(`Getting price for token ${tokenAddress} on chain ${chainId}...`);
  
  // Map chain ID to DexScreener chain name
  const chainMap: Record<string, string> = {
    '1': 'ethereum',
    '137': 'polygon',
    '56': 'bsc',
    '42161': 'arbitrum',
    '10': 'optimism',
    '8453': 'base',
    '84532': 'base-sepolia',
    // Add more chains as needed
  };
  
  const chainName = chainMap[chainId] || 'ethereum';
  
  try {
    // Special case for ETH/WETH
    if (
      tokenAddress.toLowerCase() === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' || // WETH on mainnet
      tokenAddress.toLowerCase() === 'eth'
    ) {
      // Use Ethereum price directly
      const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2');
      const data = await response.json();
      
      if (data && data.pairs && data.pairs.length > 0) {
        // Sort by liquidity to get the most reliable price
        const sortedPairs = data.pairs.sort((a: any, b: any) => 
          parseFloat(b.liquidity?.usd || '0') - parseFloat(a.liquidity?.usd || '0')
        );
        
        const price = parseFloat(sortedPairs[0].priceUsd);
        console.log(`ETH/WETH price: $${price}`);
        return price;
      }
    }
    
    // For other tokens
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
    const data = await response.json();
    
    if (data && data.pairs && data.pairs.length > 0) {
      // Filter pairs by the correct chain
      const chainPairs = data.pairs.filter((pair: any) => pair.chainId === chainName);
      
      // If we have pairs on the correct chain, use those, otherwise fall back to all pairs
      const pairsToUse = chainPairs.length > 0 ? chainPairs : data.pairs;
      
      // Sort by liquidity to get the most reliable price
      const sortedPairs = pairsToUse.sort((a: any, b: any) => 
        parseFloat(b.liquidity?.usd || '0') - parseFloat(a.liquidity?.usd || '0')
      );
      
      const price = parseFloat(sortedPairs[0].priceUsd);
      console.log(`Token price: $${price}`);
      return price;
    }
    
    throw new Error('No price data found for token');
  } catch (error) {
    console.error('Error fetching token price:', error);
    throw new Error(`Failed to get token price: ${error}`);
  }
}

/**
 * Calculates the USD value of a token amount.
 * @param {string} amount - The token amount (in token units).
 * @param {number} price - The token price in USD.
 * @param {number} decimals - The token decimals.
 * @returns {string} The USD value with 18 decimals (for the SpendingLimits contract).
 */
export async function calculateUsdValue(amount: string, price: number, decimals: number): Promise<string> {
  const amountInEther = ethers.utils.formatUnits(amount, decimals);
  const usdValue = parseFloat(amountInEther) * price;
  
  // Convert to wei (18 decimals) for the SpendingLimits contract
  const usdValueInWei = ethers.utils.parseEther(usdValue.toString());
  
  console.log(`Amount: ${amountInEther}, Price: $${price}, USD Value: $${usdValue} (${usdValueInWei.toString()} wei)`);
  
  return usdValueInWei.toString();
}
