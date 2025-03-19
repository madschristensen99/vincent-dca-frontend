// Script to check app registration status directly on the blockchain
const { ethers } = require('ethers');

// App IDs to check
const APP_IDS = {
  DCA: 'vincent-dca-app',
  EXAMPLE: 'my-example-app'
};

// Vincent Diamond contract addresses for different environments
const DIAMOND_ADDRESSES = {
  DEV: '0x9397B2fB3F5bb83382cEb2c17C798Bb3e655EEaf',
  TEST: '0x2C94F3975af4B7e13C29701EFB8E800b4b786E3a',
  PRODUCTION: '0x523E2944795Ae3C8d9D292335389dc33E954e9Bc'
};

// RPC URL for Lit Chronicle Yellowstone
const RPC_URL = 'https://yellowstone-rpc.litprotocol.com';

// ABI for app-related functions
const APP_FACET_ABI = [
  "function getAppIdByName(string appId) view returns (uint256)",
  "function getAppVersions(uint256 appId) view returns (uint256[])",
  "function getAppInfo(uint256 appId) view returns (tuple(string name, string description, string[] authorizedDomains, string[] authorizedRedirectUris, address[] delegatees))",
  "function getAppToolIpfsCidHashes(uint256 appId, uint256 version) view returns (string[])"
];

async function checkAppRegistration(environment, appId) {
  console.log(`\nChecking app '${appId}' on ${environment} environment...`);
  
  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const diamondAddress = DIAMOND_ADDRESSES[environment];
    const contract = new ethers.Contract(diamondAddress, APP_FACET_ABI, provider);
    
    console.log(`Using Vincent Diamond at ${diamondAddress}`);
    
    // Try to get the numeric app ID by name
    console.log(`Querying getAppIdByName for '${appId}'...`);
    const numericAppId = await contract.getAppIdByName(appId);
    
    if (numericAppId && numericAppId.toString() !== '0') {
      console.log(`✅ App '${appId}' is registered with numeric ID: ${numericAppId.toString()}`);
      
      // Get app versions
      console.log(`Querying getAppVersions for app ID ${numericAppId}...`);
      const versions = await contract.getAppVersions(numericAppId);
      console.log(`✅ App has ${versions.length} versions: ${versions.map(v => v.toString()).join(', ')}`);
      
      // Get app info
      console.log(`Querying getAppInfo for app ID ${numericAppId}...`);
      const appInfo = await contract.getAppInfo(numericAppId);
      console.log(`✅ App name: ${appInfo.name}`);
      console.log(`✅ App description: ${appInfo.description}`);
      console.log(`✅ Authorized domains: ${appInfo.authorizedDomains.join(', ')}`);
      console.log(`✅ Authorized redirect URIs: ${appInfo.authorizedRedirectUris.join(', ')}`);
      
      // Get tool IPFS CID hashes for each version
      for (const version of versions) {
        console.log(`Querying getAppToolIpfsCidHashes for version ${version}...`);
        try {
          const toolIpfsCidHashes = await contract.getAppToolIpfsCidHashes(numericAppId, version);
          console.log(`✅ Version ${version} has ${toolIpfsCidHashes.length} tool IPFS CID hashes: ${toolIpfsCidHashes.join(', ') || 'None'}`);
        } catch (error) {
          console.error(`❌ Error getting tool IPFS CID hashes for version ${version}:`, error.message);
        }
      }
      
      return {
        isRegistered: true,
        numericAppId: numericAppId.toString(),
        versions: versions.map(v => v.toString()),
        appInfo
      };
    } else {
      console.log(`❌ App '${appId}' is NOT registered on ${environment}`);
      return { isRegistered: false };
    }
  } catch (error) {
    console.error(`❌ Error checking app registration on ${environment}:`, error.message);
    return { isRegistered: false, error: error.message };
  }
}

async function main() {
  console.log('Checking app registration status across all environments...');
  
  // Check all environments and apps
  const environments = ['DEV', 'TEST', 'PRODUCTION'];
  
  console.log('\n========== CHECKING EXAMPLE APP ==========');
  for (const env of environments) {
    try {
      await checkAppRegistration(env, APP_IDS.EXAMPLE);
    } catch (error) {
      console.error(`Error checking ${env}:`, error);
    }
  }
  
  console.log('\n========== CHECKING VINCENT DCA APP ==========');
  for (const env of environments) {
    try {
      await checkAppRegistration(env, APP_IDS.DCA);
    } catch (error) {
      console.error(`Error checking ${env}:`, error);
    }
  }
  
  console.log('\nCheck complete. Comparison between Example App and Vincent DCA App:');
  console.log('1. If Example App is properly registered but Vincent DCA App is not, we need to fix the registration');
  console.log('2. If both are registered but Example App works and Vincent DCA App does not, check:');
  console.log('   - Case sensitivity of app ID (must be exact)');
  console.log('   - Version numbers (should have at least version 1)');
  console.log('   - Authorized domains and redirect URIs');
  console.log('   - Tool IPFS CID hashes (if any)');
}

main().catch(console.error);
