// Spending Limits Lit Action for Vincent DCA
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ethers } from 'ethers';

// Constants
const SPENDING_LIMITS_CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS"; // Replace with actual deployed address
const CHAIN = "ethereum"; // Default to Ethereum, can be parameterized

// ABI for the SpendingLimits contract (minimal version for the action)
const SPENDING_LIMITS_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "checkLimit",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "recordSpend",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Function to initialize Lit client
async function initLitClient() {
  const litNodeClient = new LitNodeClient({
    litNetwork: "serrano", // Use appropriate network
    debug: false
  });
  await litNodeClient.connect();
  return litNodeClient;
}

// Function to get token price from TradingView API
async function getTokenPriceFromTradingView(symbol) {
  try {
    // Map token addresses to TradingView symbols
    const symbolMap = {
      "eth": "BINANCE:ETHUSDT",
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": "BINANCE:ETHUSDT", // WETH
      "0x6B175474E89094C44Da98b954EedeAC495271d0F": "BINANCE:DAIUSDT", // DAI
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "BINANCE:USDCUSDT", // USDC
      // Add more mappings as needed
    };
    
    // Get the TradingView symbol for the token
    const tvSymbol = symbolMap[symbol.toLowerCase()] || `BINANCE:${symbol}USDT`;
    
    // Make request to TradingView API
    const apiKey = process.env.TRADINGVIEW_API_KEY || "your-api-key";
    const url = `https://tradingview-api.example.com/quote?symbol=${tvSymbol}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TradingView API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.price || data.last || data.close;
  } catch (error) {
    console.error("Error fetching price from TradingView:", error);
    
    // Fallback to a mock price for testing
    console.log("Using fallback price for testing");
    const mockPrices = {
      "eth": 2000,
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": 2000, // WETH
      "0x6B175474E89094C44Da98b954EedeAC495271d0F": 1, // DAI
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": 1, // USDC
      // Add more fallback prices as needed
    };
    
    return mockPrices[symbol.toLowerCase()] || 100; // Default fallback price
  }
}

// Convert token amount to USD with 18 decimals precision
function convertToUSD(amount, decimals, price) {
  // Convert to base units
  const baseAmount = amount / (10 ** decimals);
  // Calculate USD value
  const usdValue = baseAmount * price;
  // Convert to contract format (18 decimals)
  return ethers.utils.parseUnits(usdValue.toString(), 18);
}

// Main function to check and enforce spending limits
export async function checkSpendingLimits(params) {
  const {
    userAddress,
    tokenAddress,
    tokenAmount,
    tokenDecimals = 18, // Default to 18 decimals (ETH standard)
    agentPkpWallet,
    scheduleId,
    contractAddress,
    rpcUrl,
    chainId
  } = params;
  
  try {
    // Initialize Lit client
    const litClient = await initLitClient();
    
    // Get token price in USD using TradingView API
    const tokenPrice = await getTokenPriceFromTradingView(tokenAddress);
    
    // Convert token amount to USD value
    const usdValue = convertToUSD(tokenAmount, tokenDecimals, tokenPrice);
    
    // Create provider and contract instance
    const provider = new ethers.providers.JsonRpcProvider(
      rpcUrl || process.env.RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-api-key"
    );
    
    // Create contract instance for checking limits
    const spendingLimitsContract = new ethers.Contract(
      contractAddress || SPENDING_LIMITS_CONTRACT_ADDRESS,
      SPENDING_LIMITS_ABI,
      provider
    );
    
    // Check if the spend is within limits
    const isWithinLimit = await spendingLimitsContract.checkLimit(userAddress, usdValue);
    
    if (!isWithinLimit) {
      return {
        success: false,
        error: "Spending limit exceeded",
        scheduleId,
        usdValue: ethers.utils.formatUnits(usdValue, 18),
        tokenAmount,
        tokenPrice
      };
    }
    
    // If within limits, record the spend using the agent PKP wallet
    const contractWithSigner = spendingLimitsContract.connect(agentPkpWallet);
    const tx = await contractWithSigner.recordSpend(userAddress, usdValue);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash,
      scheduleId,
      usdValue: ethers.utils.formatUnits(usdValue, 18),
      tokenAmount,
      tokenPrice
    };
  } catch (error) {
    console.error("Error in spending limits check:", error);
    return {
      success: false,
      error: error.message,
      scheduleId
    };
  }
}

// Function to get current spending for a user
export async function getCurrentSpending(userAddress) {
  try {
    // Create provider and contract instance
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-api-key"
    );
    
    // Create contract instance
    const spendingLimitsContract = new ethers.Contract(
      SPENDING_LIMITS_CONTRACT_ADDRESS,
      [
        {
          "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
          "name": "getCurrentSpent",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
          "name": "getPolicy",
          "outputs": [
            {"internalType": "uint256", "name": "limit", "type": "uint256"},
            {"internalType": "uint256", "name": "period", "type": "uint256"},
            {"internalType": "bool", "name": "isActive", "type": "bool"}
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      provider
    );
    
    // Get current spent amount
    const currentSpent = await spendingLimitsContract.getCurrentSpent(userAddress);
    
    // Get policy details
    const policy = await spendingLimitsContract.getPolicy(userAddress);
    
    return {
      success: true,
      currentSpent: ethers.utils.formatUnits(currentSpent, 18),
      limit: ethers.utils.formatUnits(policy.limit, 18),
      period: policy.period.toString(),
      isActive: policy.isActive
    };
  } catch (error) {
    console.error("Error getting current spending:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
