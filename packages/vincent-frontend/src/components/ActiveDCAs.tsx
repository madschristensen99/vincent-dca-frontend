import { useEffect, useState } from 'react';
// Import the SDK for future use with actual implementation
import { VincentSDK } from '@lit-protocol/vincent-sdk';
// These imports will be needed when implementing the actual JWT generation
// import { LitNodeClient } from '@lit-protocol/lit-node-client';
// import { LitRelay } from '@lit-protocol/lit-relay';
// import { EthWalletProvider } from '@lit-protocol/auth-browser';
// import { AUTH_METHOD_SCOPE } from '@lit-protocol/constants';
// import { LitActionResource, LitPKPResource, LIT_ABILITY } from '@lit-protocol/auth-helpers';
// import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
// import { ethers } from 'ethers';
import { dcaService } from '../services/dcaService';
import type { DCAExecutionResult, DCASchedule } from '../services/dcaService';
import { dexService } from '../services/dexService';
import styles from '../styles/ActiveDCAs.module.css';
import { BACKEND_API_URL } from '../config';

// Define token information interface
interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

// Token address to info mapping
const TOKEN_INFO: Record<string, TokenInfo> = {
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { 
    symbol: 'USDC', 
    name: 'USD Coin',
    decimals: 6,
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  '0x4200000000000000000000000000000000000006': { 
    symbol: 'WETH', 
    name: 'Wrapped Ether',
    decimals: 18,
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },
  '0xda3d5a7a0b6b1e1a3fbf91b20d29d9cf0d7bd2ef': { 
    symbol: 'USDT', 
    name: 'Tether USD',
    decimals: 6,
    logoUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { 
    symbol: 'DAI', 
    name: 'Dai Stablecoin',
    decimals: 18,
    logoUrl: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png'
  }
};

// Define the Schedule interface
interface Schedule {
  _id: string;
  scheduleId?: string;
  walletAddress: string;
  purchaseAmount: string;
  active: boolean;
  registeredAt: string;
  tokenAddress?: string;
  frequency?: string;
  lastExecuted?: string;
  token?: string; // Add token property
  purchaseIntervalSeconds?: number;
}

// Initialize Vincent SDK - will be used in the future when we have proper PKP wallet implementation
// @ts-ignore - Temporarily ignoring the unused variable warning
const vincentSDK = new VincentSDK();

// TODO: Add function to retrieve all client PKPs
/**
 * This function will retrieve all PKPs for a given client
 * It will be implemented once the Vincent SDK provides this functionality
 * 
 * Expected implementation:
 * async function getAllClientPKPs(clientId: string) {
 *   // Initialize Vincent SDK and authentication
 *   // Retrieve all PKPs associated with the client
 *   // Return the PKPs for use in JWT generation and DCA operations
 *   return vincentSDK.getClientPKPs(clientId);
 * }
 */

// This function generates a JWT token using the Vincent SDK
const getToken = async (walletAddress: string) => {
  try {
    // For development, use a mock token until we have the full PKP implementation set up
    console.log('Using mock JWT token for development');
    
    // TODO: Implement the actual JWT generation using the code below
    // This is commented out until we have the proper environment set up
    /*
    // TODO: In the future, we'll need to:
    // 1. Retrieve the specific PKP for this wallet address from all client PKPs
    // 2. Use that PKP to generate the JWT token
    // const allPKPs = await getAllClientPKPs(clientId);
    // const pkpForWallet = allPKPs.find(pkp => pkp.associatedWallet === walletAddress);
    
    // Initialize the Lit Node Client
    const litNetwork = 'datil-dev';
    
    const litNodeClient = new LitNodeClient({
      litNetwork,
      debug: false
    });
    await litNodeClient.connect();
    
    // Set up Lit Relay
    const litRelay = new LitRelay({
      relayUrl: LitRelay.getRelayUrl(litNetwork),
      relayApiKey: process.env.NEXT_PUBLIC_LIT_RELAY_API_KEY || 'test-api-key',
    });
    
    // Create a random wallet for testing
    // In production, this would be the user's connected wallet
    const ethersWallet = ethers.Wallet.createRandom();
    
    // Authenticate with the wallet
    const authMethod = await EthWalletProvider.authenticate({
      signer: ethersWallet,
      litNodeClient
    });
    
    // Mint a PKP with auth methods
    const pkp = await litRelay.mintPKPWithAuthMethods([authMethod], {
      pkpPermissionScopes: [[AUTH_METHOD_SCOPE.SignAnything]],
    });
    
    // Get PKP session signatures
    const sessionSigs = await litNodeClient.getPkpSessionSigs({
      chain: 'ethereum',
      expiration: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // 15 minutes
      pkpPublicKey: pkp.pkpPublicKey!,
      authMethods: [authMethod],
      resourceAbilityRequests: [
        {
          resource: new LitActionResource('*'),
          ability: LIT_ABILITY.LitActionExecution,
        },
        {
          resource: new LitPKPResource('*'),
          ability: LIT_ABILITY.PKPSigning,
        },
      ],
    });
    
    // Create a PKP Ethers Wallet
    const pkpWallet = new PKPEthersWallet({
      controllerSessionSigs: sessionSigs,
      pkpPubKey: pkp.pkpPublicKey!,
      litNodeClient,
    });
    
    // Create the JWT token using the new API format
    const jwt = await vincentSDK.createSignedJWT({
      pkpWallet: pkpWallet,
      pkp: { publicKey: pkp.pkpPublicKey },
      payload: { 
        walletAddress: walletAddress,
        timestamp: Date.now(),
      },
      expiresInMinutes: 10, // 10 minutes expiration
      audience: "vincent-dca-service" // Audience
    });
    
    // Verify the JWT token
    const isValid = await vincentSDK.verifyJWT("vincent-dca-service");
    console.log("JWT valid:", isValid);
    
    return jwt;
    */
    
    // Return mock token for now
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3YWxsZXRBZGRyZXNzIjoiMHhENDM4M2MxNTE1OEIxMWE0RmE1MUY0ODlBQkNCM0Q0RTQzNTExYjBhIiwicm9sZUlkIjoiYTViODM0NjctNGFjOS00OWI2LWI0NWMtMjg1NTJmNTFiMDI2IiwiaWF0IjoxNzExMTM0NDY1LCJleHAiOjE3MTExMzgwNjV9.placeholder_signature";
  } catch (error) {
    console.error('Error getting JWT token:', error);
    throw error;
  }
};

// Function to execute a DCA schedule manually
const executeSchedule = async (
  scheduleId: string, 
  schedules: Schedule[], 
  setExecutingSchedule: React.Dispatch<React.SetStateAction<string | null>>,
  setExecutionResults: React.Dispatch<React.SetStateAction<DCAExecutionResult[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  fetchSchedules: () => Promise<void>
) => {
  try {
    setExecutingSchedule(scheduleId);
    
    // Get the schedule to execute
    const schedule = schedules.find(s => s._id === scheduleId || s.scheduleId === scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }
    
    // Convert Schedule to DCASchedule format
    const dcaSchedule: DCASchedule = {
      _id: schedule._id || scheduleId,
      walletAddress: schedule.walletAddress,
      tokenAddress: schedule.tokenAddress || '0x0000000000000000000000000000000000000000', // Default to ETH
      amount: schedule.purchaseAmount || '0.01',
      frequency: schedule.frequency || 'daily',
      active: schedule.active
    };
    
    // In a real implementation, we would get the private key from the PKP
    // For now, we'll use a mock private key for demonstration
    const mockPrivateKey = '0x0000000000000000000000000000000000000000000000000000000000000001';
    
    // Execute the schedule
    const result = await dcaService.executeDCASchedule(dcaSchedule, mockPrivateKey);
    
    // Update execution results state
    setExecutionResults(prevResults => {
      const newResults = Array.from(prevResults);
      newResults.push(result);
      return newResults;
    });
    
    // If successful, refresh schedules to get updated lastExecuted timestamp
    if (result.success) {
      fetchSchedules();
    }
    
    return result;
  } catch (error) {
    console.error('Error executing schedule:', error);
    setError('Failed to execute DCA schedule. Please try again later.');
    return {
      scheduleId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executedAt: new Date()
    };
  } finally {
    setExecutingSchedule(null);
  }
};

export function ActiveDCAs({ walletAddress }: { walletAddress: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingSchedule, setExecutingSchedule] = useState<string | null>(null);
  const [simulatingTransaction, setSimulatingTransaction] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<DCAExecutionResult[]>([]);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<Record<string, TokenInfo>>({});
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    scheduleId: string;
    tokenAmount: string;
    tokenSymbol: string;
    usdValue: string;
    priceImpact: string;
    timestamp: string;
  } | null>(null);

  // Get JWT token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getToken(walletAddress);
        setJwtToken(token);
      } catch (err) {
        console.error('Error getting JWT token:', err);
        setError('Failed to authenticate. Please try again.');
      }
    };
    
    fetchToken();
  }, [walletAddress]);

  // Function to simulate a transaction
  const simulateTransaction = async (
    scheduleId: string,
    amount: string,
    tokenAddress?: string
  ) => {
    try {
      // Find the schedule to get the token address if not provided
      const schedule = schedules.find(s => s._id === scheduleId || s.scheduleId === scheduleId);
      
      // Default to USDC if no token address is provided
      const targetTokenAddress = tokenAddress || schedule?.tokenAddress || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      
      // Set a loading state
      setSimulatingTransaction(scheduleId);
      
      // Simulate the transaction
      const result = await dexService.simulateTokenPurchase(targetTokenAddress, amount);
      
      // Update simulation results state
      setSimulationResult({
        scheduleId,
        tokenAmount: result.estimatedTokenAmount,
        tokenSymbol: result.tokenSymbol,
        usdValue: result.usdValue,
        priceImpact: result.priceImpact,
        timestamp: new Date().toISOString()
      });
      
      // Show the simulation modal
      setShowSimulationModal(true);
      
      return result;
    } catch (error) {
    console.error('Error simulating transaction:', error);
    setError(`Error simulating transaction: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  } finally {
    setSimulatingTransaction(null);
  }
};

  // Fetch token information from a DEX or token list API
  const fetchTokenInfo = async (tokenAddress: string) => {
    if (TOKEN_INFO[tokenAddress]) {
      return TOKEN_INFO[tokenAddress];
    }
    
    try {
      // For tokens not in our predefined list, try to fetch from an API
      // This is a placeholder - in a real implementation, you would fetch from a token list API
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        return {
          symbol: data.symbol.toUpperCase(),
          name: data.name,
          decimals: 18, // Default to 18 if not specified
          logoUrl: data.image?.small
        };
      }
    } catch (error) {
      console.error(`Error fetching token info for ${tokenAddress}:`, error);
    }
    
    // Return a default if we couldn't fetch the token info
    return {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 18
    };
  };

  // Fetch schedules from the backend
  const fetchSchedules = async () => {
    if (!jwtToken) {
      console.error('JWT token not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_API_URL}/dca/schedules?walletAddress=${walletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error fetching schedules: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Fetch token information for each schedule
      const tokenAddresses = data
        .map((schedule: Schedule) => schedule.tokenAddress)
        .filter((address: string | undefined) => address && !tokenData[address]);
      
      // Fix the Set iteration issue by converting to Array first
      const uniqueAddresses = Array.from(new Set(tokenAddresses)) as string[];
      
      const tokenInfoPromises = uniqueAddresses.map((address: string) => fetchTokenInfo(address));
      const tokenInfoResults = await Promise.all(tokenInfoPromises);
      
      const newTokenData = { ...tokenData };
      uniqueAddresses.forEach((address: string, index: number) => {
        if (address) {
          newTokenData[address] = tokenInfoResults[index];
        }
      });
      
      setTokenData(newTokenData);
      setSchedules(data);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to fetch schedules. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [walletAddress, jwtToken]);

  // Function to toggle schedule status
  const toggleScheduleStatus = async (scheduleId: string, activate: boolean) => {
    if (!jwtToken) {
      setError('Authentication token not available. Please refresh the page and try again.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Log the request details for debugging
      console.log(`Attempting to ${activate ? 'activate' : 'deactivate'} schedule ${scheduleId}`);
      
      // Make sure we're using the correct ID format
      // Some schedules might have _id, others might have scheduleId
      const actualSchedule = schedules.find(s => s._id === scheduleId || s.scheduleId === scheduleId);
      if (!actualSchedule) {
        throw new Error(`Schedule with ID ${scheduleId} not found in local state`);
      }
      
      // Use the correct ID from the schedule object
      const idToUse = actualSchedule._id || actualSchedule.scheduleId;
      
      // Use the correct endpoint based on whether we're activating or deactivating
      // The backend has separate endpoints for activation and deactivation
      const action = activate ? 'activate' : 'deactivate';
      const apiUrl = `${BACKEND_API_URL}/dca/schedules/${idToUse}/${action}`;
      console.log(`API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        // Send an empty JSON object as required by the JWT authentication system
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server response: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to ${activate ? 'activate' : 'deactivate'} schedule: ${response.statusText || response.status}`);
      }
      
      // Update the local state
      setSchedules(prevSchedules => 
        prevSchedules.map(schedule => 
          (schedule._id === scheduleId || schedule.scheduleId === scheduleId) 
            ? { ...schedule, active: activate } 
            : schedule
        )
      );
      
      console.log(`Successfully ${activate ? 'activated' : 'deactivated'} schedule ${scheduleId}`);
    } catch (err) {
      console.error('Error toggling schedule status:', err);
      setError(`Failed to ${activate ? 'activate' : 'deactivate'} schedule. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get token symbol
  const getTokenSymbol = (tokenAddress?: string) => {
    if (!tokenAddress) return 'USDC'; // Default to USDC
    
    return tokenData[tokenAddress]?.symbol || TOKEN_INFO[tokenAddress]?.symbol || 'UNKNOWN';
  };

  // Helper function to format frequency
  const formatFrequency = (frequency?: string, intervalSeconds?: number) => {
    if (frequency) {
      return frequency.charAt(0).toUpperCase() + frequency.slice(1);
    }
    
    if (intervalSeconds) {
      if (intervalSeconds === 10) return `10 seconds (Test)`;
      if (intervalSeconds < 60) return `${intervalSeconds} seconds`;
      if (intervalSeconds < 3600) return `${Math.floor(intervalSeconds / 60)} minutes`;
      if (intervalSeconds < 86400) return `${Math.floor(intervalSeconds / 3600)} hours`;
      return `${Math.floor(intervalSeconds / 86400)} days`;
    }
    
    return 'Daily'; // Default
  };

  return (
    <div className={styles.dca_schedules_container}>
      <h2 className={styles.dca_schedules_title}>Active DCA Schedules</h2>
      
      {loading && schedules.length === 0 ? (
        <p className={styles.loading_message}>Loading schedules...</p>
      ) : error ? (
        <div className={styles.error_message}>{error}</div>
      ) : schedules.length === 0 ? (
        <p className={styles.empty_message}>No active DCA schedules found.</p>
      ) : (
        <div className={styles.overflow_auto}>
          <table className={styles.dca_schedules_table}>
            <thead>
              <tr>
                <th>Token</th>
                <th>Amount (USD)</th>
                <th>Frequency</th>
                <th>Last Executed</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => {
                const uniqueKey = schedule._id || schedule.scheduleId || '';
                const tokenSymbol = getTokenSymbol(schedule.tokenAddress);
                
                return (
                  <tr key={uniqueKey}>
                    <td>
                      <div className={styles.token_cell}>
                        {(schedule.tokenAddress && tokenData[schedule.tokenAddress]?.logoUrl) && (
                          <img 
                            src={tokenData[schedule.tokenAddress].logoUrl} 
                            alt={tokenSymbol}
                            className={styles.token_logo}
                          />
                        )}
                        <span className={styles.token_symbol}>{tokenSymbol}</span>
                      </div>
                    </td>
                    <td>${schedule.purchaseAmount}</td>
                    <td className="capitalize">
                      {formatFrequency(schedule.frequency, schedule.purchaseIntervalSeconds)}
                    </td>
                    <td>
                      {schedule.lastExecuted 
                        ? new Date(schedule.lastExecuted).toLocaleString() 
                        : 'Never'}
                    </td>
                    <td>
                      <span className={`${styles.status_badge} ${schedule.active ? styles.status_badge_active : styles.status_badge_inactive}`}>
                        {schedule.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleScheduleStatus(uniqueKey, !schedule.active)}
                        className={`${styles.action_button} ${schedule.active ? styles.action_button_deactivate : styles.action_button_activate}`}
                        disabled={loading}
                      >
                        {schedule.active ? 'Deactivate' : 'Activate'}
                      </button>
                      
                      <button
                        onClick={() => executeSchedule(
                          uniqueKey, 
                          schedules, 
                          setExecutingSchedule, 
                          setExecutionResults, 
                          setError,
                          fetchSchedules
                        )}
                        className={`${styles.action_button} ${styles.action_button_execute}`}
                        disabled={executingSchedule === uniqueKey || !schedule.active}
                      >
                        {executingSchedule === uniqueKey ? 'Processing...' : 'Execute Now'}
                      </button>
                      
                      <button 
                        onClick={() => simulateTransaction(uniqueKey, schedule.purchaseAmount, schedule.tokenAddress)}
                        className={`${styles.action_button} ${styles.action_button_simulate}`}
                        disabled={simulatingTransaction === uniqueKey}
                      >
                        {simulatingTransaction === uniqueKey ? 'Simulating...' : 'Simulate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Simulation Results Modal */}
      {showSimulationModal && simulationResult && (
        <div className={styles.modal_overlay}>
          <div className={styles.modal_container}>
            <h3 className={styles.modal_title}>Transaction Simulation Results</h3>
            
            <div className={styles.modal_content}>
              <div className={styles.result_row}>
                <span className={styles.result_label}>Estimated Tokens:</span>
                <span className={styles.result_value}>{simulationResult.tokenAmount} {simulationResult.tokenSymbol}</span>
              </div>
              <div className={styles.result_row}>
                <span className={styles.result_label}>USD Value:</span>
                <span className={styles.result_value}>${simulationResult.usdValue}</span>
              </div>
              <div className={styles.result_row}>
                <span className={styles.result_label}>Price Impact:</span>
                <span className={styles.result_value}>{simulationResult.priceImpact}</span>
              </div>
              <p className={styles.modal_note}>Note: This is an estimate and actual results may vary.</p>
            </div>
            
            <div className={styles.modal_actions}>
              <button
                onClick={() => setShowSimulationModal(false)}
                className={styles.close_button}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {executionResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Recent Executions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {executionResults.map((result, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(result.executedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.transactionHash ? (
                        <a 
                          href={`https://basescan.org/tx/${result.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {result.transactionHash.substring(0, 10)}...
                        </a>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.error || 'Transaction executed successfully'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}