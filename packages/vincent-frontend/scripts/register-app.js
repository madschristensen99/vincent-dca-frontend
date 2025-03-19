// Script to register the Vincent DCA app with the Vincent Auth service
const { ethers } = require('ethers');
require('dotenv').config();

// App registration constants
const APP_ID = 'vincent-dca-app';
const APP_VERSION = '1';
const APP_NAME = 'Vincent DCA Service';
const APP_DESCRIPTION = 'Dollar Cost Averaging service powered by Vincent';

async function main() {
  try {
    // Check for private key in environment
    if (!process.env.PRIVATE_KEY) {
      console.error('Error: PRIVATE_KEY environment variable is required');
      process.exit(1);
    }

    // Setup provider and signer
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.RPC_URL || 'https://rpc-mumbai.maticvigil.com'
    );
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Get the contract address from environment or use a default
    const contractAddress = process.env.APP_REGISTRY_CONTRACT_ADDRESS || 
                           '0x4F6b2058c2F7c9D2f4Dd2232D8A5E12Ec2A552C4'; // Replace with actual contract address
    
    // ABI for the registerAppWithVersion function
    const abi = [
      "function registerAppWithVersion(string memory appId, string memory name, string memory description, string[] memory authorizedDomains, string[] memory authorizedRedirectUris, string[] memory toolIpfsCidHashes) external returns (uint256)"
    ];
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const contractWithSigner = contract.connect(wallet);
    
    // Authorized domains and redirect URIs
    const authorizedDomains = ['localhost', 'vincent-dca-4e2200eeaaa1.herokuapp.com'];
    const authorizedRedirectUris = [
      'http://localhost:3001',
      'https://vincent-dca-4e2200eeaaa1.herokuapp.com'
    ];
    
    // Tool IPFS CID hashes (empty array for now)
    const toolIpfsCidHashes = [];
    
    // Register the app
    console.log('Registering app with Vincent Auth service...');
    console.log(`App ID: ${APP_ID}`);
    console.log(`App Name: ${APP_NAME}`);
    console.log(`App Description: ${APP_DESCRIPTION}`);
    console.log(`Authorized Domains: ${authorizedDomains.join(', ')}`);
    console.log(`Authorized Redirect URIs: ${authorizedRedirectUris.join(', ')}`);
    
    const tx = await contractWithSigner.registerAppWithVersion(
      APP_ID,
      APP_NAME,
      APP_DESCRIPTION,
      authorizedDomains,
      authorizedRedirectUris,
      toolIpfsCidHashes,
      {
        gasLimit: 1000000
      }
    );
    
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for transaction confirmation...');
    
    const receipt = await tx.wait();
    console.log('App registration successful!');
    console.log('Transaction receipt:', receipt);
    
    console.log('\nYour app is now registered with Vincent Auth.');
    console.log(`You can now use the appId "${APP_ID}" in your authentication flow.`);
    
  } catch (error) {
    console.error('Error registering app:', error);
    process.exit(1);
  }
}

main();
