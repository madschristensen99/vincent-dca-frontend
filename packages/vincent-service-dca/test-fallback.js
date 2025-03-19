import axios from 'axios';

// Simulate a rate limit error response
const mockRateLimitError = {
  response: {
    status: 429,
    data: {
      status: 'fail',
      code: 'RATE_LIMIT_EXCEEDED',
      message: "You've reached the API request limit. Generate a free API key: https://developers.coinranking.com/create-account"
    }
  }
};

// Fallback tokens for Base blockchain
const fallbackTokens = {
  // Common tokens on Base
  'USDC': {
    contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    price: '1.00',
    iconUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png'
  },
  'WETH': {
    contractAddress: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    price: '3500.00',
    iconUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2396.png'
  },
  // Popular meme tokens on Base
  'BALD': {
    contractAddress: '0x27D2DECb4bFC9C76F0309b8E88dec3a601Fe25a8',
    symbol: 'BALD',
    name: 'Baldy',
    price: '0.01',
    iconUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/24133.png'
  },
  'DOG': {
    contractAddress: '0x4535e52cdf3ab787b379b7b72b5990767e6747e8',
    symbol: 'DOG',
    name: 'The Doge',
    price: '0.05',
    iconUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/24252.png'
  }
};

// Test function to simulate getTokenInfo with fallback
async function testGetTokenInfoWithFallback(tokenSymbol) {
  console.log(`Fetching token info for: ${tokenSymbol || 'top memecoin'}`);
  
  try {
    // Simulate API call failure with rate limit error
    throw mockRateLimitError;
    
  } catch (error) {
    console.error(`Error fetching token info from Coinranking API:`, error.response?.data || error);
    
    // Check if it's a rate limit error
    if (error.response && error.response.status === 429) {
      console.log('Rate limit exceeded for Coinranking API, using fallback tokens');
    }
    
    // If a specific token symbol is provided, try to find it in the fallbacks
    if (tokenSymbol && fallbackTokens[tokenSymbol.toUpperCase()]) {
      console.log(`Using fallback info for ${tokenSymbol}`);
      return fallbackTokens[tokenSymbol.toUpperCase()];
    }
    
    // If no specific token or not found in fallbacks, return a default meme token
    console.log('Using default meme token (BALD) as fallback');
    return fallbackTokens['BALD'];
  }
}

// Test with different scenarios
async function runTests() {
  console.log('=== Testing with no token symbol ===');
  const defaultToken = await testGetTokenInfoWithFallback();
  console.log('Default token:', defaultToken);
  
  console.log('\n=== Testing with USDC token symbol ===');
  const usdcToken = await testGetTokenInfoWithFallback('USDC');
  console.log('USDC token:', usdcToken);
  
  console.log('\n=== Testing with non-existent token symbol ===');
  const unknownToken = await testGetTokenInfoWithFallback('NONEXISTENT');
  console.log('Unknown token fallback:', unknownToken);
}

runTests();
