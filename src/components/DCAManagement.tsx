import { useEffect, useState, useCallback } from 'react';
import { RegisterDCA } from './RegisterDCA';
import { ActiveDCAs } from './ActiveDCAs';
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

// Base Mainnet Etherscan API
const BASE_API_URL = 'https://api.basescan.org/api';
const API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY;

// Define the backend API URL
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
}

interface DCATransaction {
  _id: string;
  scheduleId: string;
  walletAddress: string;
  symbol: string;
  name: string;
  coinAddress: string;
  price: string;
  purchaseAmount: string;
  success: boolean;
  txHash?: string;
  error?: string;
  purchasedAt: string;
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

function TransactionList({ transactions, dcaTransactions }: { 
  transactions: Transaction[],
  dcaTransactions: DCATransaction[] 
}) {
  // Format currency to always show 2 decimal places
  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "$0.00";
    return `$${numValue.toFixed(2)}`;
  };

  // If we have DCA transactions from our backend, show those instead
  if (dcaTransactions.length > 0) {
    return (
      <div className="transactions-list">
        {dcaTransactions.map((tx) => (
          <div key={tx._id} className="transaction-item bg-white shadow-md rounded-lg p-4 mb-4">
            <div className="transaction-header flex justify-between items-center mb-2">
              <span className="transaction-date text-gray-600 font-medium">
                {new Date(tx.purchasedAt).toLocaleDateString()} {new Date(tx.purchasedAt).toLocaleTimeString()}
              </span>
              {tx.txHash && (
                <a 
                  href={`https://basescan.org/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transaction-link text-blue-600 hover:text-blue-800"
                >
                  View on Basescan
                </a>
              )}
            </div>
            <div className="transaction-details grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-center">
                <span className="font-medium mr-2">Token:</span> 
                <span>{tx.name} ({tx.symbol})</span>
              </div>
              <div>
                <span className="font-medium mr-2">Amount:</span> 
                <span>{formatCurrency(tx.purchaseAmount)}</span>
              </div>
              <div>
                <span className="font-medium mr-2">Price:</span> 
                <span>{formatCurrency(tx.price)}</span>
              </div>
              <div className={`status ${tx.success ? 'text-green-600' : 'text-red-600'} font-medium`}>
                Status: {tx.success ? 'Success' : 'Failed'}
              </div>
              {tx.error && (
                <div className="error-message text-red-600 col-span-2 mt-2 p-2 bg-red-100 rounded">
                  Error: {tx.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback to Etherscan transactions if no DCA transactions
  if (transactions.length === 0) {
    return (
      <div className="no-transactions bg-gray-100 p-6 rounded-lg text-center text-gray-600">
        No transactions found for this address
      </div>
    );
  }

  return (
    <div className="transactions-list">
      {transactions.map((tx) => (
        <div key={tx.hash} className="transaction-item bg-white shadow-md rounded-lg p-4 mb-4">
          <div className="transaction-header flex justify-between items-center mb-2">
            <span className="transaction-date text-gray-600 font-medium">
              {new Date(Number(tx.timeStamp) * 1000).toLocaleDateString()} {new Date(Number(tx.timeStamp) * 1000).toLocaleTimeString()}
            </span>
            <a 
              href={`https://basescan.org/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="transaction-link text-blue-600 hover:text-blue-800"
            >
              View on Basescan
            </a>
          </div>
          <div className="transaction-details grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <span className="font-medium mr-2">From:</span>
              <span className="text-sm break-all">{tx.from}</span>
            </div>
            <div>
              <span className="font-medium mr-2">To:</span>
              <span className="text-sm break-all">{tx.to}</span>
            </div>
            <div className="col-span-2">
              <span className="font-medium mr-2">Value:</span>
              <span>{(Number(tx.value) / 1e18).toFixed(6)} ETH</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type Tab = 'register' | 'transactions' | 'view';

interface DCAManagementViewProps {
  walletAddress: string;
}

function DCAManagementView({ walletAddress }: DCAManagementViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('register');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dcaTransactions, setDcaTransactions] = useState<DCATransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  // Get JWT token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getToken(walletAddress);
        setJwtToken(token);
      } catch (error) {
        console.error('Error getting JWT token:', error);
        setError('Failed to authenticate. Please try again.');
      }
    };
    
    fetchToken();
  }, [walletAddress]);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // First try to fetch from our backend
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if JWT token is available
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      
      // Revert to the original endpoint that was working
      const response = await fetch(`${BACKEND_API_URL}/dca/transactions/${walletAddress}`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Process the data to ensure valid values
        const processedData = data.map((tx: DCATransaction) => ({
          ...tx,
          // Ensure symbol is valid, default to "TOKEN" if not
          symbol: tx.symbol && /^[A-Za-z0-9]+$/.test(tx.symbol) ? tx.symbol : "TOKEN",
          // Ensure name is valid, default to "Unknown Token" if not
          name: tx.name && /^[A-Za-z0-9\s]+$/.test(tx.name) ? tx.name : "Unknown Token",
          // Ensure price is a valid number, default to "0.00" if not
          price: isNaN(parseFloat(tx.price)) ? "0.00" : tx.price
        }));
        
        setDcaTransactions(processedData);
        // If we got DCA transactions, we don't need to fetch from Etherscan
        setIsLoading(false);
        return;
      } else if (response.status !== 404) {
        // Only log non-404 errors (404 is expected when no transactions exist)
        console.error('Error fetching DCA transactions:', await response.text());
      }
    } catch (err) {
      console.error('Error fetching from backend:', err);
      // Continue to try Etherscan as fallback
    }
    
    // Fallback to Etherscan
    try {
      const response = await fetch(
        `${BASE_API_URL}?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === '1') {
        setTransactions(data.result || []);
      } else {
        setError(data.message || 'Failed to fetch transactions. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, jwtToken]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab, fetchTransactions]);

  const handleDCASubmit = async (amount: number, frequency: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    // Convert frequency to seconds
    let purchaseIntervalSeconds: number;
    switch (frequency) {
      case 'test':
        purchaseIntervalSeconds = 10; // 10 seconds for testing
        break;
      case 'minute':
        purchaseIntervalSeconds = 60; // 1 minute
        break;
      case 'hourly':
        purchaseIntervalSeconds = 60 * 60; // 1 hour
        break;
      case 'daily':
        purchaseIntervalSeconds = 60 * 60 * 24; // 24 hours
        break;
      case 'weekly':
        purchaseIntervalSeconds = 60 * 60 * 24 * 7; // 7 days
        break;
      case 'monthly':
        purchaseIntervalSeconds = 60 * 60 * 24 * 30; // 30 days
        break;
      default:
        purchaseIntervalSeconds = 60 * 60 * 24; // Default to daily
    }
    
    try {
      // Format the amount as a string with a decimal point
      const formattedAmount = amount.toString();
      
      // Prepare headers with JWT token if available
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      } else {
        setError('Authentication token not available. Please refresh the page and try again.');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`${BACKEND_API_URL}/dca/schedules`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          walletAddress: walletAddress,
          purchaseIntervalSeconds,
          purchaseAmount: formattedAmount,
          active: true,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(`Successfully created DCA schedule with ID: ${data.scheduleId}`);
        // Switch to the view tab to show the newly created schedule
        setActiveTab('view');
      } else {
        const errorText = await response.text();
        let errorMessage = 'Failed to create DCA schedule';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse the error as JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'register':
        return (
          <div className="tab-content">
            <h2>Start DCA</h2>
            <p>This system will automatically purchase cryptocurrency at regular intervals based on your schedule.</p>
            {successMessage && <div className="success-message">{successMessage}</div>}
            {error && <div className="error-message">{error}</div>}
            <RegisterDCA onSubmit={handleDCASubmit} isLoading={isLoading} />
          </div>
        );
      case 'transactions':
        return (
          <div className="tab-content">
            <h2>DCA Transactions</h2>
            {isLoading ? (
              <div className="loading">Loading transactions...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <TransactionList 
                transactions={transactions} 
                dcaTransactions={dcaTransactions} 
              />
            )}
          </div>
        );
      case 'view':
        return (
          <div className="tab-content">
            <h2>View DCAs</h2>
            <ActiveDCAs walletAddress={walletAddress} />
          </div>
        );
    }
  };

  return (
    <div className="card dca-management">
      <header>
        <h1>Automated Dollar Cost Averaging</h1>
        <div className="header-actions">
          <a href="/dashboard" className="dashboard-link">View Server Dashboard</a>
        </div>
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Start DCA
          </button>
          <button 
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            See DCA Transactions
          </button>
          <button 
            className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => setActiveTab('view')}
          >
            View DCAs
          </button>
        </div>
      </header>
      <main>
        {renderTabContent()}
      </main>
    </div>
  );
}

export function DCAManagement({ walletAddress }: { walletAddress: string }) {
  return (
    <div className="dca-management-container">
      <h1>DCA Management</h1>
      <DCAManagementView walletAddress={walletAddress} />
    </div>
  );
}