import axios from 'axios';

async function testCoinrankingAPI() {
  try {
    console.log('Testing Coinranking API...');
    
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
    
    const topCoin = data.data.coins[0];
    console.log('Top memecoin:', topCoin.symbol);
    console.log('Contract Addresses:', topCoin.contractAddresses);
    
    // Extract Base contract address
    const baseAddress = topCoin.contractAddresses.find(addr => 
      addr.toLowerCase().startsWith('base/')
    );
    
    if (baseAddress) {
      const contractAddress = baseAddress.split('/')[1];
      console.log('Extracted Base contract address:', contractAddress);
      
      // Return token info
      const tokenInfo = {
        contractAddress,
        symbol: topCoin.symbol,
        name: topCoin.name,
        price: topCoin.price,
        iconUrl: topCoin.iconUrl
      };
      
      console.log('Token info:', tokenInfo);
    } else {
      console.error('No Base blockchain contract address found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testCoinrankingAPI();
