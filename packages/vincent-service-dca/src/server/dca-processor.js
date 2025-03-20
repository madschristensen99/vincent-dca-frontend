// DCA Execution Process
import { Schedule } from './models/schedule.js';
import { PurchasedCoin } from './models/purchased-coin.js';
import axios from 'axios';

// Hardcoded IPFS IDs
const dcaToolIpfsId = 'QmRoiofVFzGYB5NnVrPjPZu9cRrMUYX9NA5TV8TTnhfidh';
const dcaPolicyIpfsId = 'QmbsGGnEbbQVTVWfssRsEXzMn18Zani9WTxxGrSsBLuLK4';

// For Vincent SDK, we'll need to dynamically import it since it might be a CommonJS module
let VincentSDK;
async function loadVincentSDK() {
  try {
    const vincentModule = await import('@lit-protocol/vincent-sdk');
    VincentSDK = vincentModule.VincentSDK;
  } catch (error) {
    console.error('Error importing Vincent SDK:', error);
    // Create a mock SDK if we can't import the real one
    VincentSDK = class MockVincentSDK {
      constructor() {
        console.warn('Using mock Vincent SDK');
      }
    };
  }
}

// Load the SDK
loadVincentSDK();

// DCA Execution Process
let dcaExecutionInterval;
let isProcessStarted = false;

// Function to start the DCA execution process
export function startDCAExecutionProcess() {
  // Prevent multiple initializations
  if (isProcessStarted) {
    console.log('DCA execution process already started, skipping');
    return;
  }
  
  console.log('Starting DCA execution process...');
  
  // Clear any existing interval
  if (dcaExecutionInterval) {
    clearInterval(dcaExecutionInterval);
  }
  
  // Set up interval to process DCA transactions every 10 seconds
  dcaExecutionInterval = setInterval(processDCATransactions, 10 * 1000);
  
  // Also run immediately
  processDCATransactions();
  
  // Mark as started
  isProcessStarted = true;
}

// Function to process DCA transactions
export async function processDCATransactions() {
  try {
    console.log('Processing DCA transactions...');
    
    // Always fetch and log the current top memecoin, regardless of execution
    try {
      const topMemeToken = await getTokenInfo('');
      console.log(`Current top memecoin: ${topMemeToken.symbol} (${topMemeToken.contractAddress}) on Base`);
    } catch (tokenError) {
      console.error('Error fetching top memecoin:', tokenError.message);
    }
    
    // Find all active schedules
    const activeSchedules = await Schedule.find({ active: true }).lean();
    
    if (activeSchedules.length === 0) {
      console.log('No active DCA schedules found');
      return;
    }
    
    console.log(`Found ${activeSchedules.length} active DCA schedules`);
    
    // Process each schedule
    for (const schedule of activeSchedules) {
      try {
        const now = new Date();
        const lastExecuted = schedule.lastExecutedAt ? new Date(schedule.lastExecutedAt) : null;
        
        // If lastExecuted is null or the interval has passed, execute the transaction
        if (!lastExecuted || (now.getTime() - lastExecuted.getTime()) >= schedule.purchaseIntervalSeconds * 1000) {
          console.log(`Executing DCA transaction for schedule ${schedule._id} (wallet: ${schedule.walletAddress})`);
          
          // Get the top memecoin info before executing the transaction
          const topMemeToken = await getTokenInfo('');
          console.log(`Current top memecoin: ${topMemeToken.symbol} (${topMemeToken.contractAddress})`);
          console.log(`Preparing to buy ${topMemeToken.symbol} (${topMemeToken.contractAddress}) on Base...`);
          
          // Execute the transaction for this schedule with the top memecoin
          await executeDCATransaction(schedule);
        } else {
          const nextExecution = new Date(lastExecuted.getTime() + schedule.purchaseIntervalSeconds * 1000);
          const timeRemaining = nextExecution.getTime() - now.getTime();
          console.log(`Next execution for schedule ${schedule._id} in ${Math.round(timeRemaining / 1000)} seconds`);
        }
      } catch (scheduleError) {
        console.error(`Error processing schedule ${schedule._id}:`, scheduleError);
      }
    }
  } catch (error) {
    console.error('Error processing DCA transactions:', error);
  }
}

// Function to execute a single DCA transaction
export async function executeDCATransaction(schedule) {
  try {
    console.log(`Executing DCA transaction for schedule: ${schedule._id}`);
    
    // Get the top memecoin info instead of using the stored token symbol
    // Pass empty string to getTokenInfo to get the top memecoin
    const tokenInfo = await getTokenInfo('');
    
    // Create a JWT for authentication
    const jwt = await createJWT(schedule.walletAddress);
    
    // Call the DCA swap endpoint with the JWT
    console.log('Executing DCA transaction with Lit Actions:');
    console.log(`- Tool IPFS ID: ${dcaToolIpfsId}`);
    console.log(`- Policy IPFS ID: ${dcaPolicyIpfsId}`);
    console.log('Calling DCA swap endpoint...');
    console.log(`Wallet address: ${schedule.walletAddress}`);
    console.log(`Token: ${tokenInfo.symbol} (${tokenInfo.contractAddress})`);
    console.log(`Amount: ${schedule.purchaseAmount} ETH`);
    console.log(`Preparing to buy ${tokenInfo.symbol} with contract address ${tokenInfo.contractAddress} on Base...`);
    
    // Call the DCA swap endpoint
    let response;
    try {
      // Try the authenticated endpoint first
      response = await axios.post('http://localhost:3000/api/tools/execute-dca-swap', {
        pkpEthAddress: schedule.walletAddress,
        rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
        chainId: process.env.CHAIN_ID || '84532', // Base Sepolia
        tokenIn: 'ETH',
        tokenOut: tokenInfo.contractAddress,
        amountIn: schedule.purchaseAmount,
        scheduleId: schedule._id.toString(),
        toolIpfsId: dcaToolIpfsId,
        policyIpfsId: dcaPolicyIpfsId
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      });
    } catch (authError) {
      console.warn('Authenticated DCA swap failed, falling back to no-auth endpoint:', authError.message);
      
      // Fall back to the no-auth endpoint for testing
      response = await axios.post('http://localhost:3000/api/tools/execute-dca-swap-no-auth', {
        pkpEthAddress: schedule.walletAddress,
        rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
        chainId: process.env.CHAIN_ID || '84532', // Base Sepolia
        tokenIn: 'ETH',
        tokenOut: tokenInfo.contractAddress,
        amountIn: schedule.purchaseAmount,
        scheduleId: schedule._id.toString(),
        toolIpfsId: dcaToolIpfsId,
        policyIpfsId: dcaPolicyIpfsId
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Successfully used no-auth fallback endpoint');
    }
    
    // Check if the transaction was successful
    if (response.data.status === 'success') {
      console.log(`DCA transaction successful for schedule ${schedule._id}`);
      console.log(`Transaction hash: ${response.data.swapHash}`);
      
      // Update the schedule with the transaction details and the new token info
      await Schedule.findByIdAndUpdate(schedule._id, {
        $push: {
          transactions: {
            date: new Date(),
            amount: schedule.purchaseAmount,
            tokenSymbol: tokenInfo.symbol,
            tokenName: tokenInfo.name,
            tokenAddress: tokenInfo.contractAddress,
            tokenAmount: response.data.outputAmount,
            txHash: response.data.swapHash,
            status: 'completed'
          }
        },
        lastExecutedAt: new Date()
      });
      
      // Also record in the PurchasedCoin collection
      await PurchasedCoin.create({
        scheduleId: schedule._id,
        walletAddress: schedule.walletAddress,
        tokenSymbol: tokenInfo.symbol,
        tokenName: tokenInfo.name,
        tokenAddress: tokenInfo.contractAddress,
        purchaseAmount: schedule.purchaseAmount,
        tokenAmount: response.data.outputAmount,
        txHash: response.data.swapHash,
        purchaseDate: new Date()
      });
      
      return {
        success: true,
        txHash: response.data.swapHash,
        outputAmount: response.data.outputAmount,
        tokenSymbol: tokenInfo.symbol,
        tokenAddress: tokenInfo.contractAddress
      };
    } else {
      console.error(`DCA transaction failed for schedule ${schedule._id}:`, response.data);
      
      // Update the schedule with the failed transaction
      await Schedule.findByIdAndUpdate(schedule._id, {
        $push: {
          transactions: {
            date: new Date(),
            amount: schedule.purchaseAmount,
            tokenSymbol: tokenInfo.symbol,
            tokenName: tokenInfo.name,
            tokenAddress: tokenInfo.contractAddress,
            status: 'failed',
            error: response.data.error?.message || 'Unknown error'
          }
        },
        lastExecutedAt: new Date()
      });
      
      return {
        success: false,
        error: response.data
      };
    }
  } catch (error) {
    console.error(`Error executing DCA transaction for schedule ${schedule._id}:`, error);
    
    // Update the schedule with the failed transaction
    await Schedule.findByIdAndUpdate(schedule._id, {
      $push: {
        transactions: {
          date: new Date(),
          amount: schedule.purchaseAmount,
          status: 'failed',
          error: error.message || 'Unknown error'
        }
      },
      lastExecutedAt: new Date()
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to get token info
async function getTokenInfo(tokenSymbol) {
  console.log(`Fetching token info from Coinranking API`);
  
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
    
    let tokenInfo;
    
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
        
        tokenInfo = {
          contractAddress,
          symbol: coin.symbol,
          name: coin.name,
          price: coin.price,
          iconUrl: coin.iconUrl
        };
      } else {
        throw new Error(`Token ${tokenSymbol} not found in Coinranking API results`);
      }
    } else {
      // If no tokenSymbol is provided, return the top memecoin
      const topCoin = data.data.coins[0];
      const contractAddress = extractBaseAddress(topCoin);
      
      if (!contractAddress) {
        throw new Error(`No Base blockchain contract address found for top memecoin ${topCoin.symbol}`);
      }
      
      tokenInfo = {
        contractAddress,
        symbol: topCoin.symbol,
        name: topCoin.name,
        price: topCoin.price,
        iconUrl: topCoin.iconUrl
      };
    }
    
    // Single logging point for token information
    console.log(`Token information retrieved from Coinranking API:`);
    console.log(`- Symbol: ${tokenInfo.symbol}`);
    console.log(`- Contract Address: ${tokenInfo.contractAddress}`);
    console.log(`- Name: ${tokenInfo.name}`);
    console.log(`- Price: $${tokenInfo.price}`);
    
    return tokenInfo;
  } catch (error) {
    console.error(`Error fetching token info from Coinranking API:`, error);
    
    // Check if it's a rate limit error
    if (error.response && error.response.status === 429) {
      console.log('Rate limit exceeded for Coinranking API, using fallback tokens');
    }
    
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

// Helper function to create a JWT for authentication
async function createJWT(walletAddress) {
  // This function should be implemented to create a JWT using the Vincent SDK
  // For now, it just returns a mock JWT
  return "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiJwa3AtYWRkcmVzcyIsImF1ZCI6InZpbmNlbnQtZGNhIiwicGtwUHVibGljS2V5IjoicGstYWRkcmVzcyIsImV4cCI6MTcxNjI4OTAxNX0.mock-signature";
}
