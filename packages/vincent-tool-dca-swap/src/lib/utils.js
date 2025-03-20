// Shared utility functions for DCA swap functionality
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base Mainnet addresses
export const CHAIN_CONSTANTS = {
  BASE_MAINNET: {
    CHAIN_ID: '8453',
    RPC_URL: 'https://mainnet.base.org',
    UNISWAP_QUOTER_ADDRESS: '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a',
    UNISWAP_ROUTER_ADDRESS: '0x2626664c2603336e57b271c5c0b26f421741e481',
    WETH_ADDRESS: '0x4200000000000000000000000000000000000006',
    USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  }
};

// Format and validate private key
export function formatPrivateKey(key) {
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
  
  return formattedKey;
}

// Validate a private key and return a wallet
export function validatePrivateKey(privateKey) {
  try {
    const formattedKey = formatPrivateKey(privateKey);
    // This will throw if the key is invalid
    const wallet = new ethers.Wallet(formattedKey);
    return { valid: true, wallet, privateKey: formattedKey };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Load IPFS IDs from the file
export function loadIpfsIds(customPath) {
  try {
    // Use custom path if provided, otherwise use default path
    const ipfsIdsPath = customPath || path.join(__dirname, '..', '..', 'ipfs-ids.json');
    console.log(`Loading IPFS IDs from: ${ipfsIdsPath}`);
    const ipfsIdsData = fs.readFileSync(ipfsIdsPath, 'utf8');
    return JSON.parse(ipfsIdsData);
  } catch (error) {
    console.error('Error loading IPFS IDs:', error);
    return null;
  }
}

// Load environment variables from .env file
export function loadEnvVariables() {
  try {
    const envPath = path.join(__dirname, '..', '..', '.env');
    dotenv.config({ path: envPath });
    return process.env;
  } catch (error) {
    console.error('Error loading environment variables:', error);
    return {};
  }
}

// Load private key from .env file
export function loadPrivateKey() {
  try {
    const envPath = path.join(__dirname, '..', '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const privateKeyMatch = envContent.match(/PRIVATE_KEY=(.+)/);
    
    if (privateKeyMatch && privateKeyMatch[1]) {
      let privateKey = privateKeyMatch[1].trim();
      return formatPrivateKey(privateKey);
    } else {
      console.error('Private key not found in .env file');
      return null;
    }
  } catch (error) {
    console.error('Error loading private key:', error);
    return null;
  }
}

// Get Uniswap router and quoter addresses for the given chain
export function getUniswapAddresses(chainId) {
  // Default to Base Mainnet
  if (chainId === '8453' || !chainId) {
    return {
      UNISWAP_V3_QUOTER: CHAIN_CONSTANTS.BASE_MAINNET.UNISWAP_QUOTER_ADDRESS,
      UNISWAP_V3_ROUTER: CHAIN_CONSTANTS.BASE_MAINNET.UNISWAP_ROUTER_ADDRESS,
      WETH: CHAIN_CONSTANTS.BASE_MAINNET.WETH_ADDRESS
    };
  }
  
  // Add support for other chains as needed
  
  // Fallback to Base Mainnet if chain not supported
  return {
    UNISWAP_V3_QUOTER: CHAIN_CONSTANTS.BASE_MAINNET.UNISWAP_QUOTER_ADDRESS,
    UNISWAP_V3_ROUTER: CHAIN_CONSTANTS.BASE_MAINNET.UNISWAP_ROUTER_ADDRESS,
    WETH: CHAIN_CONSTANTS.BASE_MAINNET.WETH_ADDRESS
  };
}
