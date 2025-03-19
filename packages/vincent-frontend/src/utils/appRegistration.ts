import { ethers } from 'ethers';

// App registration constants
export const APP_ID = 'vincent-dca-app'; // A unique identifier for your DCA app
export const APP_VERSION = '1'; // Initial version
export const APP_NAME = 'Vincent DCA Service';
export const APP_DESCRIPTION = 'Dollar Cost Averaging service powered by Vincent';

/**
 * Register the app with Vincent Auth service
 * @param provider Ethers provider
 * @param signer Ethers signer
 * @returns Transaction receipt
 */
export const registerAppWithVersion = async (
  provider: ethers.providers.Provider,
  signer: ethers.Signer
): Promise<ethers.providers.TransactionReceipt> => {
  try {
    // Get the contract address from environment or use a default
    const contractAddress = process.env.NEXT_PUBLIC_APP_REGISTRY_CONTRACT_ADDRESS || 
                           '0x4F6b2058c2F7c9D2f4Dd2232D8A5E12Ec2A552C4'; // Replace with actual contract address
    
    // ABI for the registerAppWithVersion function
    const abi = [
      "function registerAppWithVersion(string memory appId, string memory name, string memory description, string[] memory authorizedDomains, string[] memory authorizedRedirectUris, string[] memory toolIpfsCidHashes) external returns (uint256)"
    ];
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const contractWithSigner = contract.connect(signer);
    
    // Authorized domains and redirect URIs
    const authorizedDomains = ['localhost', 'vincent-dca-4e2200eeaaa1.herokuapp.com'];
    const authorizedRedirectUris = [
      'http://localhost:3001',
      'https://vincent-dca-4e2200eeaaa1.herokuapp.com'
    ];
    
    // Tool IPFS CID hashes (empty array for now)
    const toolIpfsCidHashes: string[] = [];
    
    // Register the app
    console.log('Registering app with Vincent Auth service...');
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
    const receipt = await tx.wait();
    console.log('App registration successful:', receipt);
    
    return receipt;
  } catch (error) {
    console.error('Error registering app:', error);
    throw error;
  }
};

/**
 * Get the Vincent Auth URL with appId parameter
 * @returns URL string for Vincent Auth with appId
 */
export const getVincentAuthUrl = (): string => {
  const baseUrl = 'https://vincent-auth.vercel.app/';
  const url = new URL(baseUrl);
  url.searchParams.set('appId', APP_ID);
  url.searchParams.set('version', APP_VERSION);
  
  return url.toString();
};
