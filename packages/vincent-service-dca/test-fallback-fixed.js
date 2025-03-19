import axios from 'axios';

// Test the fallback mechanism for token info
async function testTokenFallback() {
  console.log('Testing token fallback mechanism');
  
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

  // Function to get token info with fallback
  function getTokenInfoFallback(tokenSymbol) {
    console.log(`Getting fallback info for: ${tokenSymbol || 'default token'}`);
    
    // If a specific token symbol is provided, try to find it in the fallbacks
    if (tokenSymbol && fallbackTokens[tokenSymbol.toUpperCase()]) {
      console.log(`Using fallback info for ${tokenSymbol}`);
      return fallbackTokens[tokenSymbol.toUpperCase()];
    }
    
    // If no specific token or not found in fallbacks, return a default meme token
    console.log('Using default meme token (BALD) as fallback');
    return fallbackTokens['BALD'];
  }

  // Test with different scenarios
  console.log('\n=== Testing with no token symbol ===');
  const defaultToken = getTokenInfoFallback();
  console.log('Default token:', defaultToken);
  
  console.log('\n=== Testing with USDC token symbol ===');
  const usdcToken = getTokenInfoFallback('USDC');
  console.log('USDC token:', usdcToken);
  
  console.log('\n=== Testing with non-existent token symbol ===');
  const unknownToken = getTokenInfoFallback('NONEXISTENT');
  console.log('Unknown token fallback:', unknownToken);
}

testTokenFallback();
