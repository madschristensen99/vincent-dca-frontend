// Script to properly register the Vincent DCA app with a version
const { ethers } = require('ethers');
require('dotenv').config();

// Import the app registration functionality
const { 
  registerAppWithVersion, 
  VincentEnvironment, 
  getVincentDiamondAddress 
} = require('@lit-protocol/aw-tool/dist/lib/lit-action-utils/register-app-with-version');

// DCA App registration constants
const APP_ID = 'vincent-dca-app';
const APP_NAME = 'Vincent DCA Service';
const APP_DESCRIPTION = 'Dollar Cost Averaging service powered by Vincent';

// Authorized domains and redirect URIs for the DCA app
const AUTHORIZED_DOMAINS = ['localhost', 'vincent-dca-4e2200eeaaa1.herokuapp.com'];
const AUTHORIZED_REDIRECT_URIS = [
  'http://localhost:3001',
  'https://vincent-dca-4e2200eeaaa1.herokuapp.com'
];

// Tool IPFS CID Hash - using the same one from the working Example App
const TOOL_IPFS_CID_HASH = 'QmZ9mydsUQf3K7JvSDyZn7v9Fv5ZRzNrLMcuLCTdi4JE8h';

// RPC URL for Lit Chronicle Yellowstone
const RPC_URL = process.env.RPC_URL || 'https://yellowstone-rpc.litprotocol.com';

// Private key for signing transactions (from environment variable or hardcoded for testing)
const PRIVATE_KEY = process.env.PRIVATE_KEY || '2dd64126f227109dd915885461340b97ef302bf757ebabeda5d0c058624db4c7';

async function registerOnEnvironment(environment, privateKey) {
  console.log(`========== REGISTERING ON ${environment.toUpperCase()} ENVIRONMENT ==========`);
  
  try {
    // Create a wallet with the private key
    const wallet = new ethers.Wallet(privateKey);
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Create a provider
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    console.log(`Using RPC URL: ${RPC_URL}`);
    
    // Connect the wallet to the provider
    const signer = wallet.connect(provider);
    
    // Prepare the registration parameters
    const registrationParams = {
      appId: APP_ID,
      name: APP_NAME,
      description: APP_DESCRIPTION,
      authorizedDomains: AUTHORIZED_DOMAINS,
      authorizedRedirectUris: AUTHORIZED_REDIRECT_URIS,
      toolIpfsCidHashes: [TOOL_IPFS_CID_HASH],
      delegatees: []
    };
    
    // Register the app with a version in one go
    console.log(`Registering app '${APP_ID}' with version on ${environment.toUpperCase()}...`);
    const result = await registerAppWithVersion(
      environment,
      registrationParams,
      signer,
      RPC_URL
    );
    
    console.log(`App successfully registered with numeric ID: ${result.numericAppId}`);
    console.log(`App version: ${result.version}`);
    
    return {
      success: true,
      appId: APP_ID,
      numericAppId: result.numericAppId,
      version: result.version
    };
  } catch (error) {
    console.error(`${environment.toUpperCase()}: ❌ FAILED (${error})`);
    return {
      success: false,
      error
    };
  }
}

async function main() {
  try {
    // Register on DEV environment
    const devResult = await registerOnEnvironment(VincentEnvironment.DEV, PRIVATE_KEY);
    
    // Register on TEST environment
    const testResult = await registerOnEnvironment(VincentEnvironment.TEST, PRIVATE_KEY);
    
    // Register on PRODUCTION environment
    const prodResult = await registerOnEnvironment(VincentEnvironment.PRODUCTION, PRIVATE_KEY);
    
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
