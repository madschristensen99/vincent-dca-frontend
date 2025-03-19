const axios = require('axios');

// Function to get token info from Coinranking API
async function getTokenInfo(tokenSymbol) {
  console.log(`Fetching token info from Coinranking API`);
  
  // Fetch from Coinranking API for meme tokens on Base
  const response = await axios.get('https://api.coinranking.com/v2/coins', {
    params: {
      'blockchains[]': 'base',
      'tags[]': 'meme'
    },
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Failed to fetch token info: ${response.statusText}`);
  }
  
  const data = response.data;
  
  if (!data.data || !data.data.coins || data.data.coins.length === 0) {
    throw new Error('No tokens found from Coinranking API');
  }
  
  // If tokenSymbol is provided, try to find that specific token
  if (tokenSymbol) {
    const coin = data.data.coins.find(c => 
      c.symbol.toLowerCase() === tokenSymbol.toLowerCase()
    );
    
    if (coin) {
      return {
        contractAddress: coin.contractAddress,
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
  return {
    contractAddress: topCoin.contractAddress,
    symbol: topCoin.symbol,
    name: topCoin.name,
    price: topCoin.price,
    iconUrl: topCoin.iconUrl
  };
}

// Test the function
async function testGetTokenInfo() {
  try {
    // Test with no symbol (should return top memecoin)
    const topToken = await getTokenInfo('');
    console.log('Top memecoin:', topToken);
    
    // Test with a specific symbol if available
    try {
      const specificToken = await getTokenInfo('BALD');
      console.log('Specific token (BALD):', specificToken);
    } catch (err) {
      console.log('Could not find specific token:', err.message);
    }
  } catch (error) {
    console.error('Error testing getTokenInfo:', error);
  }
}

testGetTokenInfo();
