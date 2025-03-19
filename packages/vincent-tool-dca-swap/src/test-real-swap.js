// Test script for executing a real DCA swap
import executeDcaSwap from './execute-dca-swap.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

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
const ipfsIdsPath = path.join(__dirname, '../ipfs-ids.json');
const ipfsIds = JSON.parse(fs.readFileSync(ipfsIdsPath, 'utf8'));

// Format and validate private key
function formatPrivateKey(key) {
  if (!key) return null;
  
  // Remove any whitespace
  let formattedKey = key.trim();
  
  // Handle case where key might have duplicate 0x prefix
  if (formattedKey.startsWith('0x0x')) {
    formattedKey = '0x' + formattedKey.substring(4);
  }
  
  // Add 0x prefix if missing
  if (!formattedKey.startsWith('0x')) {
    formattedKey = '0x' + formattedKey;
  }
  
  // If key is too long (more than 66 chars for a standard Ethereum private key)
  // try to extract the correct portion
  if (formattedKey.length > 66) {
    // Try to extract a valid 64-character hex string after the 0x prefix
    const hexPart = formattedKey.substring(2);
    if (hexPart.length >= 64) {
      formattedKey = '0x' + hexPart.substring(0, 64);
    }
  }
  
  // Validate that it's a proper private key format
  try {
    // This will throw if the key is invalid
    const wallet = new ethers.Wallet(formattedKey);
    console.log(`Successfully validated private key. Wallet address: ${wallet.address}`);
    return formattedKey;
  } catch (error) {
    console.error('Invalid private key format:', error.message);
    return null;
  }
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
    const rawPrivateKey = process.env.PRIVATE_KEY;
    if (!rawPrivateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    
    const privateKey = formatPrivateKey(rawPrivateKey);
    if (!privateKey) {
      throw new Error('Invalid private key format. Please check your .env file.');
    }
    
    // Initialize wallet
    const wallet = new ethers.Wallet(privateKey);
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Base Mainnet addresses
    const UNISWAP_QUOTER_ADDRESS = '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a';
    const UNISWAP_ROUTER_ADDRESS = '0x2626664c2603336e57b271c5c0b26f421741e481';
    const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
    const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    
    // Set swap options
    const swapOptions = {
      privateKey: privateKey,
      rpcUrl: 'https://mainnet.base.org',
      chainId: '8453',
      tokenIn: 'eth',
      tokenOut: USDC_ADDRESS,
      amountIn: '0.00005', // Even smaller amount to ensure success
      amount: '0.00005', // Also set the amount property to ensure it's used correctly
      slippage: '100', // 1%
      recipient: wallet.address,
      // Uniswap addresses for Base Mainnet
      uniswapQuoterAddress: UNISWAP_QUOTER_ADDRESS,
      uniswapRouterAddress: UNISWAP_ROUTER_ADDRESS,
      wethAddress: WETH_ADDRESS,
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
