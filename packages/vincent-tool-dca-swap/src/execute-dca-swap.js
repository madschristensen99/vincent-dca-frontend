import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitActionResource, createSiweMessage, generateAuthSig } from '@lit-protocol/auth-helpers'
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as LitConstants from '@lit-protocol/constants';

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

// Load IPFS IDs from the file
function loadIpfsIds() {
  try {
    const ipfsIdsPath = path.join(__dirname, '..', 'ipfs-ids.json');
    const ipfsIdsData = fs.readFileSync(ipfsIdsPath, 'utf8');
    return JSON.parse(ipfsIdsData);
  } catch (error) {
    console.error('Error loading IPFS IDs:', error);
    return null;
  }
}

// Load private key from .env file
function loadPrivateKey() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const privateKeyMatch = envContent.match(/PRIVATE_KEY=(.+)/);
    
    if (privateKeyMatch && privateKeyMatch[1]) {
      let privateKey = privateKeyMatch[1].trim();
      
      // Handle case where key might have duplicate 0x prefix
      if (privateKey.startsWith('0x0x')) {
        privateKey = '0x' + privateKey.substring(4);
      }
      
      // Add 0x prefix if missing
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      
      // If key is too long (more than 66 chars for a standard Ethereum private key)
      // try to extract the correct portion
      if (privateKey.length > 66) {
        // Try to extract a valid 64-character hex string after the 0x prefix
        const hexPart = privateKey.substring(2);
        if (hexPart.length >= 64) {
          privateKey = '0x' + hexPart.substring(0, 64);
        }
      }
      
      // Validate that it's a proper private key format
      try {
        // This will throw if the key is invalid
        const wallet = new ethers.Wallet(privateKey);
        console.log(`Successfully validated private key. Wallet address: ${wallet.address}`);
        return privateKey;
      } catch (error) {
        console.error('Invalid private key format:', error.message);
        return null;
      }
    } else {
      console.error('Private key not found in .env file');
      return null;
    }
  } catch (error) {
    console.error('Error loading private key:', error);
    return null;
  }
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
    console.error('Error executing Lit Action:', error);
    throw error;
  }
}

// Main function to execute a DCA swap
async function executeDcaSwap(options) {
  try {
    // Load IPFS IDs if not provided in options
    const ipfsIds = options.toolIpfsId && options.policyIpfsId && options.policySchemaIpfsId
      ? {
          toolIpfsId: options.toolIpfsId,
          policyIpfsId: options.policyIpfsId,
          policySchemaIpfsId: options.policySchemaIpfsId
        }
      : loadIpfsIds();
    
    if (!ipfsIds) {
      throw new Error('Failed to load IPFS IDs');
    }
    
    const { toolIpfsId, policyIpfsId, policySchemaIpfsId } = ipfsIds;
    
    console.log('Using IPFS IDs:');
    console.log(`- Tool: ${toolIpfsId}`);
    console.log(`- Policy: ${policyIpfsId}`);
    console.log(`- Policy Schema: ${policySchemaIpfsId}`);
    
    // Load private key if not provided in options
    const privateKey = options.privateKey || loadPrivateKey();
    
    if (!privateKey) {
      throw new Error('Private key is required to execute the DCA swap');
    }
    
    // Initialize wallet
    const wallet = new ethers.Wallet(privateKey);
    console.log('Wallet address:', wallet.address);
    
    // Default options
    const defaultOptions = {
      fromToken: '0x4200000000000000000000000000000000000006', // WETH on Base
      toToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // USDC on Base
      amount: ethers.utils.parseEther('0.01').toString(),      // 0.01 ETH
      slippage: '50',                                          // 0.5%
      recipient: wallet.address,
      uniswapQuoterAddress: '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a',  // QuoterV2 on Base
      uniswapRouterAddress: '0x2626664c2603336e57b271c5c0b26f421741e481',  // SwapRouter02 on Base
      wethAddress: '0x4200000000000000000000000000000000000006',  // WETH on Base
    };
    
    // Merge options
    const swapOptions = {
      ...defaultOptions,
      ...options,
      recipient: options?.recipient || wallet.address,
    };
    
    console.log('\n--- Executing DCA Swap ---');
    
    // Format the amount properly
    let formattedAmount = '0.01'; // Default amount
    if (swapOptions.amount) {
      if (typeof swapOptions.amount === 'string') {
        // If it's already a string, use it directly
        formattedAmount = swapOptions.amount;
        // If it's a string representing a BigNumber (has only digits), convert it to ETH
        if (/^\d+$/.test(swapOptions.amount)) {
          formattedAmount = ethers.utils.formatEther(swapOptions.amount);
        }
      } else {
        // If it's a BigNumber or other object, format it
        formattedAmount = ethers.utils.formatEther(swapOptions.amount);
      }
    }
    
    // Convert WETH address to 'eth' for the Lit Action
    const tokenIn = swapOptions.fromToken === '0x4200000000000000000000000000000000000006' ? 'eth' : swapOptions.fromToken;
    
    console.log(`Executing swap for ${formattedAmount} ${tokenIn} to ${swapOptions.toToken}`);
    
    // Execute DCA swap
    const swapParams = {
      privateKey: privateKey,
      rpcUrl: 'https://mainnet.base.org',
      chainId: '8453',
      tokenIn: tokenIn,
      tokenOut: swapOptions.toToken,
      amountIn: swapOptions.amountIn || formattedAmount, // Prioritize amountIn if provided
      slippage: swapOptions.slippage || '50',
      recipient: swapOptions.recipient,
      uniswapQuoterAddress: swapOptions.uniswapQuoterAddress,
      uniswapRouterAddress: swapOptions.uniswapRouterAddress,
      wethAddress: swapOptions.wethAddress,
      policyIpfsId: policyIpfsId, // Add the policy IPFS ID for the child Lit Action call
      policySchemaIpfsId: policySchemaIpfsId, // Also pass the schema ID in case it's needed
    };
    
    const swapResponse = await executeIPFSWithDirectParams(
      toolIpfsId,
      swapParams,
      privateKey
    );
    
    console.log('Swap Response:', swapResponse);
    
    // Check if the swap was successful
    if (swapResponse.parsedResponse && !swapResponse.parsedResponse.success) {
      throw new Error(`Swap failed: ${swapResponse.parsedResponse.error || 'Unknown error'}`);
    }
    
    console.log('\n--- DCA Swap Completed Successfully ---');
    
    // Extract transaction hash from the parsed response
    const txHash = swapResponse.parsedResponse?.transactionHash;
    const isMock = swapResponse.parsedResponse?.mock === true;
    
    if (txHash) {
      console.log('Transaction Hash:', txHash);
      if (isMock) {
        console.log('NOTE: This is a mock transaction (not actually executed on-chain)');
      } else {
        console.log('Transaction executed on Base Mainnet');
      }
    }
    
    // Disconnect from Lit network
    await litNodeClient.disconnect();
    console.log('Disconnected from Lit network');
    
    return swapResponse.parsedResponse || swapResponse;
  } catch (error) {
    console.error('Error executing DCA swap:', error);
    
    // Disconnect from Lit network
    try {
      await litNodeClient.disconnect();
      console.log('Disconnected from Lit network');
    } catch (disconnectError) {
      console.error('Error disconnecting from Lit network:', disconnectError);
    }
    
    throw error;
  }
}

export default executeDcaSwap;
