import axios from 'axios';

// Test function to get token info using the Coinranking API
async function getTokenInfo(tokenSymbol) {
  console.log(`Fetching token info for: ${tokenSymbol || 'top memecoin'}`);
  
  try {
    // Fetch from Coinranking API for meme tokens on Base
    const response = await axios.get('https://api.coinranking.com/v2/coins', {
      params: {
        'tags[]': 'meme',
        'blockchains[]': 'base'
      },
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': 'coinranking864b3f4ee07472c3ade2a9b1c7c3fba993c13fe502a6a52e'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch token info: ${response.statusText}`);
    }
    
    const data = response.data;
    
    if (!data.data || !data.data.coins || data.data.coins.length === 0) {
      throw new Error('No tokens found from Coinranking API');
    }
    
    // Function to extract Base contract address from contractAddresses array
    const extractBaseAddress = (coin) => {
      if (!coin.contractAddresses || !Array.isArray(coin.contractAddresses)) {
        return null;
      }
      
      // Find the Base blockchain address
      const baseAddress = coin.contractAddresses.find(addr => 
        addr.toLowerCase().startsWith('base/')
      );
      
      if (baseAddress) {
        // Extract just the address part after 'base/'
        return baseAddress.split('/')[1];
      }
      
      return null;
    };
    
    // If tokenSymbol is provided, try to find that specific token
    if (tokenSymbol) {
      const coin = data.data.coins.find(c => 
        c.symbol.toLowerCase() === tokenSymbol.toLowerCase()
      );
      
      if (coin) {
        const contractAddress = extractBaseAddress(coin);
        
        if (!contractAddress) {
          throw new Error(`No Base blockchain contract address found for ${tokenSymbol}`);
        }
        
        return {
          contractAddress,
          symbol: coin.symbol,
          name: coin.name,
          price: coin.price,
          iconUrl: coin.iconUrl
        };
      }
      
      throw new Error(`Token ${tokenSymbol} not found in Coinranking API results`);
    }
    
    // If no tokenSymbol is provided, return the top memecoin
    const topCoin = data.data.coins[0];
    const contractAddress = extractBaseAddress(topCoin);
    
    if (!contractAddress) {
      throw new Error(`No Base blockchain contract address found for top memecoin ${topCoin.symbol}`);
    }
    
    return {
      contractAddress,
      symbol: topCoin.symbol,
      name: topCoin.name,
      price: topCoin.price,
      iconUrl: topCoin.iconUrl
    };
  } catch (error) {
    console.error(`Error fetching token info from Coinranking API:`, error.response?.data || error.message);
    throw error;
  }
}

// Test the function with different tokens
async function runTests() {
  try {
    // Test with no token symbol (should return top memecoin)
    console.log('\n=== Testing with no token symbol ===');
    const topToken = await getTokenInfo();
    console.log('Top memecoin info:', topToken);
    
    // Test with a specific token symbol
    console.log('\n=== Testing with SPX token symbol ===');
    const spxToken = await getTokenInfo('SPX');
    console.log('SPX token info:', spxToken);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();
