// Test script for executing a real DCA swap
import executeDcaSwap from './execute-dca-swap.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { 
  formatPrivateKey, 
  validatePrivateKey, 
  loadIpfsIds, 
  loadEnvVariables,
  CHAIN_CONSTANTS 
} from './lib/utils.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from src/.env
const envPath = path.join(__dirname, '.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

// Debug environment variables (without showing the full private key)
console.log('Environment variables loaded:');
if (process.env.PRIVATE_KEY) {
  const keyStart = process.env.PRIVATE_KEY.substring(0, 6);
  const keyEnd = process.env.PRIVATE_KEY.substring(process.env.PRIVATE_KEY.length - 4);
  console.log(`PRIVATE_KEY: ${keyStart}...${keyEnd} (${process.env.PRIVATE_KEY.length} chars)`);
} else {
  console.log('PRIVATE_KEY: Not found');
}

// Load IPFS IDs from the ipfs-ids.json file
const ipfsIdsPath = path.join(__dirname, '..', 'ipfs-ids.json');
console.log(`Loading IPFS IDs from: ${ipfsIdsPath}`);
const ipfsIds = loadIpfsIds(ipfsIdsPath);

if (!ipfsIds) {
  console.error('Failed to load IPFS IDs. Make sure the ipfs-ids.json file exists and is valid.');
  process.exit(1);
}

async function testRealSwap() {
  try {
    console.log('Starting real DCA swap test...');
    
    // Get IPFS IDs from the loaded JSON file
    console.log('Using IPFS IDs:');
    console.log(`- Tool: ${ipfsIds.toolIpfsId}`);
    console.log(`- Policy: ${ipfsIds.policyIpfsId}`);
    console.log(`- Policy Schema: ${ipfsIds.policySchemaIpfsId}`);
    console.log(`- Deployed at: ${ipfsIds.deployedAt}`);
    
    // Get private key from environment variables
    const rawPrivateKey = loadEnvVariables().PRIVATE_KEY;
    if (!rawPrivateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    
    const privateKey = formatPrivateKey(rawPrivateKey);
    if (!privateKey) {
      throw new Error('Invalid private key format. Please check your .env file.');
    }
    
    // Validate the private key
    const validation = validatePrivateKey(privateKey);
    if (!validation.valid) {
      throw new Error(`Invalid private key: ${validation.error}`);
    }
    
    // Initialize wallet
    const wallet = validation.wallet;
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Use constants from utils module
    const BASE_MAINNET = CHAIN_CONSTANTS.BASE_MAINNET;
    
    // Set swap options
    const swapOptions = {
      privateKey: privateKey,
      rpcUrl: BASE_MAINNET.RPC_URL,
      chainId: BASE_MAINNET.CHAIN_ID,
      tokenIn: 'eth',
      tokenOut: BASE_MAINNET.USDC_ADDRESS,
      amountIn: '0.00005', // Even smaller amount to ensure success
      amount: '0.00005', // Also set the amount property to ensure it's used correctly
      slippage: '100', // 1%
      recipient: wallet.address,
      // Uniswap addresses for Base Mainnet
      uniswapQuoterAddress: BASE_MAINNET.UNISWAP_QUOTER_ADDRESS,
      uniswapRouterAddress: BASE_MAINNET.UNISWAP_ROUTER_ADDRESS,
      wethAddress: BASE_MAINNET.WETH_ADDRESS,
      // IPFS IDs
      toolIpfsId: ipfsIds.toolIpfsId,
      policyIpfsId: ipfsIds.policyIpfsId,
      policySchemaIpfsId: ipfsIds.policySchemaIpfsId
    };
    
    console.log('Swap options:', {
      fromToken: swapOptions.tokenIn,
      toToken: swapOptions.tokenOut,
      amount: swapOptions.amountIn + ' ETH',
      slippage: (parseInt(swapOptions.slippage) / 100) + '%',
      recipient: swapOptions.recipient
    });
    
    // Execute the DCA swap
    console.log('Executing DCA swap...');
    const result = await executeDcaSwap(swapOptions);
    
    console.log('\n--- DCA Swap Result ---');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.transactionHash) {
      console.log(`\nTransaction hash: ${result.transactionHash}`);
      console.log(`View on Base explorer: https://basescan.org/tx/${result.transactionHash}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error executing DCA swap test:', error);
    throw error;
  }
}

// Run the test
testRealSwap()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
