import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitActionResource, createSiweMessage, generateAuthSig } from '@lit-protocol/auth-helpers'
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as LitConstants from '@lit-protocol/constants';
import { 
  formatPrivateKey, 
  validatePrivateKey, 
  loadIpfsIds, 
  loadPrivateKey, 
  CHAIN_CONSTANTS 
} from './lib/utils.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a Lit Node client
const litNodeClient = new LitNodeClient({
  litNetwork: 'datil-dev',
  debug: false
});

// Export the litNodeClient for use in other modules
export { litNodeClient };

// Load private key from .env file
function loadPrivateKeyFromEnv() {
  return loadPrivateKey();
}

// Function to get session signatures
async function getSessionSigs(privateKey) {
  try {
    // Connect to the Lit network if not already connected
    await litNodeClient.connect();
    
    // Initialize Ethereum wallet
    const wallet = new ethers.Wallet(privateKey);
    console.log('Using wallet address for session:', wallet.address);
    
    // Generate Session Signatures with a longer expiration time
    const expiration = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour
    
    const sessionSignatures = await litNodeClient.getSessionSigs({
      chain: "ethereum",
      expiration: expiration,
      resourceAbilityRequests: [
        {
          resource: new LitActionResource("*"),
          ability: LitConstants.LitAbility.LitActionExecution,
        },
      ],
      authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
        try {
          // Create SIWE message using the helper function
          const toSign = await createSiweMessage({
            uri,
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: wallet.address,
            nonce: await litNodeClient.getLatestBlockhash(),
            litNodeClient,
            domain: 'localhost',
            chainId: 1,
          });
          
          // Generate auth signature
          return await generateAuthSig({
            signer: wallet,
            toSign,
          });
        } catch (error) {
          console.error('Error in authNeededCallback:', error);
          throw error;
        }
      },
    });
    
    return sessionSignatures;
  } catch (error) {
    console.error('Error getting session signatures:', error);
    throw error;
  }
}

// Function to execute an IPFS Lit Action with direct parameters
async function executeIPFSWithDirectParams(ipfsCid, params = {}, privateKey) {
  try {
    // Get session signatures
    const sessionSigs = await getSessionSigs(privateKey);
    
    // Create the parameters expected by the Lit Action
    const jsParams = {
      litActionParams: JSON.stringify(params)
    };
    
    console.log('Executing Lit Action with params:', JSON.stringify(jsParams, null, 2));
    
    // Execute the Lit Action
    const response = await litNodeClient.executeJs({
      ipfsId: ipfsCid,
      sessionSigs,
      jsParams: jsParams,
    });
    
    console.log('Raw Lit Action response:', response);
    
    // Parse the response if it's a string
    if (response && response.response) {
      try {
        const parsedResponse = JSON.parse(response.response);
        response.parsedResponse = parsedResponse;
        
        // Log transaction hash if available
        if (parsedResponse && parsedResponse.transactionHash) {
          console.log(`Transaction hash: ${parsedResponse.transactionHash}`);
          console.log(`View transaction on Base block explorer: https://basescan.org/tx/${parsedResponse.transactionHash}`);
          if (parsedResponse.mock) {
            console.log('NOTE: This is a mock transaction (not actually executed on-chain)');
          } else {
            console.log('This is a real transaction executed on Base Mainnet');
          }
        }
      } catch (e) {
        console.log('Failed to parse response JSON:', e.message);
      }
    } else if (response && response.logs) {
      // Try to extract transaction hash from logs if response is empty
      const logs = response.logs;
      const txHashMatch = logs.match(/Swap transaction sent: (0x[a-fA-F0-9]{64})/);
      
      if (txHashMatch && txHashMatch[1]) {
        const txHash = txHashMatch[1];
        console.log(`Transaction hash extracted from logs: ${txHash}`);
        console.log(`View transaction on Base block explorer: https://basescan.org/tx/${txHash}`);
        
        // Create a parsed response object with the extracted transaction hash
        response.parsedResponse = {
          success: true,
          transactionHash: txHash,
          status: "pending",
          extractedFromLogs: true
        };
      }
    }
    
    return response;
  } catch (error) {
    console.error('Error executing IPFS Lit Action:', error);
    throw error;
  }
}

// Main function to execute a DCA swap
async function executeDcaSwap(options) {
  try {
    console.log('Executing DCA swap with options:', JSON.stringify({
      ...options,
      privateKey: options.privateKey ? '***redacted***' : undefined
    }, null, 2));
    
    // Load IPFS IDs if not provided
    let ipfsIds;
    if (options.toolIpfsId) {
      ipfsIds = options;
    } else {
      const ipfsIdsPath = path.join(__dirname, '..', 'ipfs-ids.json');
      console.log(`Loading IPFS IDs from: ${ipfsIdsPath}`);
      ipfsIds = loadIpfsIds(ipfsIdsPath);
    }
    
    if (!ipfsIds) {
      throw new Error('Failed to load IPFS IDs');
    }
    
    // Validate required parameters
    if (!options.privateKey) {
      throw new Error('Private key is required');
    }
    
    if (!options.tokenIn || !options.tokenOut) {
      throw new Error('tokenIn and tokenOut are required');
    }
    
    if (!options.amountIn && !options.amount) {
      throw new Error('amountIn or amount is required');
    }
    
    // Format private key
    const privateKey = formatPrivateKey(options.privateKey);
    
    // Validate the private key
    const validation = validatePrivateKey(privateKey);
    if (!validation.valid) {
      throw new Error(`Invalid private key: ${validation.error}`);
    }
    
    // Use the wallet address as recipient if not specified
    const recipient = options.recipient || validation.wallet.address;
    
    // Use Base Mainnet defaults if not specified
    const chainId = options.chainId || CHAIN_CONSTANTS.BASE_MAINNET.CHAIN_ID;
    const rpcUrl = options.rpcUrl || CHAIN_CONSTANTS.BASE_MAINNET.RPC_URL;
    const wethAddress = options.wethAddress || CHAIN_CONSTANTS.BASE_MAINNET.WETH_ADDRESS;
    const uniswapQuoterAddress = options.uniswapQuoterAddress || CHAIN_CONSTANTS.BASE_MAINNET.UNISWAP_QUOTER_ADDRESS;
    const uniswapRouterAddress = options.uniswapRouterAddress || CHAIN_CONSTANTS.BASE_MAINNET.UNISWAP_ROUTER_ADDRESS;
    
    // Use amountIn or amount (for backward compatibility)
    const amountIn = options.amountIn || options.amount;
    
    // Default slippage to 100 basis points (1%) if not specified
    const slippage = options.slippage || '100';
    
    // Prepare parameters for the Lit Action
    const params = {
      privateKey,
      rpcUrl,
      chainId,
      tokenIn: options.tokenIn,
      tokenOut: options.tokenOut,
      amountIn,
      recipient,
      slippage,
      wethAddress,
      uniswapQuoterAddress,
      uniswapRouterAddress,
      policyIpfsId: ipfsIds.policyIpfsId,
      policySchemaIpfsId: ipfsIds.policySchemaIpfsId
    };
    
    // Execute the Lit Action
    console.log(`Executing Lit Action with IPFS ID: ${ipfsIds.toolIpfsId}`);
    const result = await executeIPFSWithDirectParams(ipfsIds.toolIpfsId, params, privateKey);
    
    // Extract and return the parsed response
    if (result && result.parsedResponse) {
      return result.parsedResponse;
    } else if (result && result.response) {
      try {
        return JSON.parse(result.response);
      } catch (e) {
        return { success: false, error: 'Failed to parse response' };
      }
    } else {
      return { success: false, error: 'Empty response from Lit Action' };
    }
  } catch (error) {
    console.error('Error in executeDcaSwap:', error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
}

export default executeDcaSwap;
