// Simple script to register the Vincent DCA app
const { ethers } = require('ethers');
require('dotenv').config();

// Constants for app registration
const APP_ID = 'vincent-dca-app';
const APP_NAME = 'Vincent DCA Service';
const APP_DESCRIPTION = 'Dollar Cost Averaging service powered by Vincent';
const AUTHORIZED_DOMAINS = ['localhost', 'vincent-dca-4e2200eeaaa1.herokuapp.com'];
const AUTHORIZED_REDIRECT_URIS = [
  'http://localhost:3001',
  'https://vincent-dca-4e2200eeaaa1.herokuapp.com'
];
const TOOL_IPFS_CID_HASH = 'QmZ9mydsUQf3K7JvSDyZn7v9Fv5ZRzNrLMcuLCTdi4JE8h';

// Contract addresses for different environments
const CONTRACT_ADDRESSES = {
  DEV: '0x9397B2fB3F5bb83382cEb2c17C798Bb3e655EEaf',
  TEST: '0x2C94F3975af4B7e13C29701EFB8E800b4b786E3a',
  PRODUCTION: '0x523E2944795Ae3C8d9D292335389dc33E954e9Bc'
};

// RPC URL
const RPC_URL = process.env.RPC_URL || 'https://yellowstone-rpc.litprotocol.com';

// Private key for signing transactions
const PRIVATE_KEY = process.env.PRIVATE_KEY || '2dd64126f227109dd915885461340b97ef302bf757ebabeda5d0c058624db4c7';

// ABI for app registration
const APP_FACET_ABI = [
  "function registerApp(string name, string description, string[] authorizedDomains, string[] authorizedRedirectUris, address[] delegatees) returns (uint256 newAppId)",
  "function registerNextAppVersion(string memory appId, string[] memory toolIpfsCidHashes) external returns (uint256)"
];

async function registerApp(environment) {
  console.log(`========== REGISTERING ON ${environment} ENVIRONMENT ==========`);
  
  try {
    // Create a wallet with the private key
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Create a provider
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    console.log(`Using RPC URL: ${RPC_URL}`);
    
    // Connect the wallet to the provider
    const signer = wallet.connect(provider);
    
    // Get the contract address for the environment
    const contractAddress = CONTRACT_ADDRESSES[environment];
    console.log(`Using contract address: ${contractAddress}`);
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, APP_FACET_ABI, signer);
    
    // Step 1: Register the app
    console.log(`Registering app '${APP_ID}' on ${environment}...`);
    console.log(`App Name: ${APP_NAME}`);
    console.log(`App Description: ${APP_DESCRIPTION}`);
    console.log(`Authorized Domains: ${AUTHORIZED_DOMAINS.join(', ')}`);
    console.log(`Authorized Redirect URIs: ${AUTHORIZED_REDIRECT_URIS.join(', ')}`);
    
    // Send the transaction to register the app
    const tx = await contract.registerApp(
      APP_NAME,
      APP_DESCRIPTION,
      AUTHORIZED_DOMAINS,
      AUTHORIZED_REDIRECT_URIS,
      [], // No delegatees
      {
        gasLimit: 1000000
      }
    );
    
    console.log(`Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Get the numeric app ID from the event logs
    const numericAppId = receipt.events?.[0]?.args?.appId || 0;
    console.log(`App registered with numeric ID: ${numericAppId}`);
    
    // Step 2: Register the first version
    console.log(`Registering version 1 for app '${APP_ID}'...`);
    
    // Send the transaction to register the first version
    const versionTx = await contract.registerNextAppVersion(
      APP_ID,
      [TOOL_IPFS_CID_HASH],
      {
        gasLimit: 1000000
      }
    );
    
    console.log(`Transaction sent: ${versionTx.hash}`);
    const versionReceipt = await versionTx.wait();
    console.log(`Transaction confirmed in block ${versionReceipt.blockNumber}`);
    
    // Get the version from the event logs
    const version = versionReceipt.events?.[0]?.args?.version || 1;
    console.log(`App version registered: ${version}`);
    
    return {
      success: true,
      numericAppId,
      version
    };
  } catch (error) {
    console.error(`${environment}: ❌ FAILED (${error})`);
    return {
      success: false,
      error
    };
  }
}

async function main() {
  try {
    // Register on DEV environment
    const devResult = await registerApp('DEV');
    
    // Register on TEST environment
    const testResult = await registerApp('TEST');
    
    // Register on PRODUCTION environment
    const prodResult = await registerApp('PRODUCTION');
    
    // Output the results
    console.log('\n========== REGISTRATION RESULTS ==========');
    console.log(`DEV: ${devResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (devResult.success) {
      console.log(`  Numeric App ID: ${devResult.numericAppId}`);
      console.log(`  App Version: ${devResult.version}`);
    }
    
    console.log(`TEST: ${testResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (testResult.success) {
      console.log(`  Numeric App ID: ${testResult.numericAppId}`);
      console.log(`  App Version: ${testResult.version}`);
    }
    
    console.log(`PRODUCTION: ${prodResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (prodResult.success) {
      console.log(`  Numeric App ID: ${prodResult.numericAppId}`);
      console.log(`  App Version: ${prodResult.version}`);
    }
    
    // Determine which environment to use based on success
    let environment = 'DEV';
    let numericAppId = devResult.numericAppId;
    
    if (prodResult.success) {
      environment = 'PRODUCTION';
      numericAppId = prodResult.numericAppId;
    } else if (testResult.success) {
      environment = 'TEST';
      numericAppId = testResult.numericAppId;
    }
    
    console.log('\n========== NEXT STEPS ==========');
    console.log(`1. Update the ApproveView.tsx component to use the numeric app ID from ${environment}:`);
    console.log(`   window.location.href = "https://vincent-auth.vercel.app/?appId=${numericAppId}";`);
    console.log('2. Test the authentication flow by accessing the app and being redirected to Vincent Auth');
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
