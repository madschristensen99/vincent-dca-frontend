import { useEffect, useState, useCallback } from 'react';
import { RegisterDCA } from './RegisterDCA';
import { ActiveDCAs } from './ActiveDCAs';
import { ERC20TransferTool } from './ERC20TransferTool';
import SpendingLimitSwap from './SpendingLimitSwap';
import { getStoredJWT } from '../config';

// Define the backend API URL
import { BACKEND_API_URL, createAuthHeaders } from '../config';

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

interface Memecoin {
  uuid: string;
  symbol: string;
  name: string;
  iconUrl: string;
  price: string;
  change: string;
  rank: number;
  marketCap: string;
  contractAddress?: string;
}

// Base Mainnet Etherscan API
const BASE_API_URL = 'https://api.basescan.org/api';
const API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY;

// This function gets the JWT token from localStorage
const getToken = async (walletAddress: string) => {
  try {
    // Get the JWT from localStorage
    const jwt = getStoredJWT();
    
    if (!jwt) {
      throw new Error('No JWT token available. Please authenticate first.');
    }
    
    // Decode the JWT to get the ethAddress
    try {
      const payload = jwt.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      
      // Log the ethAddress from the JWT
      if (decodedPayload.ethAddress) {
        console.log('Getting JWT token for Ethereum address:', decodedPayload.ethAddress);
      } else if (decodedPayload.pkpPublicKey) {
        // If we have a PKP public key, derive the Ethereum address properly
        const pkpKey = decodedPayload.pkpPublicKey;
        
        // Import ethers dynamically if needed
        const { ethers } = await import('ethers');
        
        try {
          // Remove '0x' prefix if present
          const cleanPkpKey = pkpKey.startsWith('0x') ? pkpKey.substring(2) : pkpKey;
          
          // Create a hex string of the public key
          const publicKeyHex = `0x${cleanPkpKey}`;
          
          // Use ethers.js to compute the address from the public key
          const derivedAddress = ethers.utils.computeAddress(publicKeyHex).toLowerCase();
          console.log('Derived Ethereum address from PKP key:', derivedAddress);
        } catch (derivationError) {
          console.error('Error deriving Ethereum address:', derivationError);
          console.log('Getting JWT token for wallet address:', walletAddress);
        }
      } else {
        console.log('Getting JWT token for wallet address:', walletAddress);
      }
    } catch (decodeError) {
      console.error('Error decoding JWT:', decodeError);
      console.log('Getting JWT token for wallet address:', walletAddress);
    }
    
    return jwt;
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

type Tab = 'register' | 'transactions' | 'view' | 'tools' | 'spending-limits';

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
      const headers: HeadersInit = createAuthHeaders(jwtToken || undefined);
      
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

  const handleDCASubmit = async (amount: number, frequency: string, tokenInfo: Memecoin | null) => {
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
      const headers: HeadersInit = createAuthHeaders(jwtToken || undefined);
      
      if (!jwtToken) {
        setError('Authentication token not available. Please refresh the page and try again.');
        setIsLoading(false);
        return;
      }
      
      // Prepare the request body with token information if available
      const requestBody: any = {
        walletAddress: walletAddress,
        purchaseIntervalSeconds,
        purchaseAmount: formattedAmount,
        active: true,
      };
      
      // Add token information if available
      if (tokenInfo) {
        requestBody.tokenInfo = {
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          contractAddress: tokenInfo.contractAddress || '',
          uuid: tokenInfo.uuid
        };
      }
      
      const response = await fetch(`${BACKEND_API_URL}/dca/schedules`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(`Successfully created DCA schedule for ${tokenInfo?.symbol || 'top memecoin'} with ID: ${data.scheduleId}`);
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
            <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>Start DCA with Top Base Memecoin</h2>
            <p style={{ textAlign: 'center', marginBottom: '20px', maxWidth: '600px', margin: '0 auto 20px' }}>
              This system will automatically purchase the top memecoin on Base at regular intervals based on your schedule.
            </p>
            {successMessage && (
              <div style={{ 
                backgroundColor: '#f6ffed', 
                border: '1px solid #b7eb8f', 
                color: '#52c41a', 
                padding: '12px', 
                borderRadius: '6px', 
                marginBottom: '16px',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '0 auto 20px'
              }}>
                {successMessage}
              </div>
            )}
            {error && (
              <div style={{ 
                backgroundColor: '#fff1f0', 
                border: '1px solid #ffa39e', 
                color: '#ff4d4f', 
                padding: '12px', 
                borderRadius: '6px', 
                marginBottom: '16px',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '0 auto 20px'
              }}>
                {error}
              </div>
            )}
            <RegisterDCA onSubmit={handleDCASubmit} isLoading={isLoading} />
          </div>
        );
      case 'transactions':
        return (
          <div className="tab-content">
            <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>DCA Transactions</h2>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>Loading transactions...</div>
            ) : error ? (
              <div style={{ 
                backgroundColor: '#fff1f0', 
                border: '1px solid #ffa39e', 
                color: '#ff4d4f', 
                padding: '12px', 
                borderRadius: '6px', 
                marginBottom: '16px',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '0 auto 20px'
              }}>
                {error}
              </div>
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
            <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>Active DCA Schedules</h2>
            <ActiveDCAs 
              walletAddress={walletAddress} 
              jwtToken={jwtToken || ''} 
              onRefresh={() => {
                // After canceling a schedule, refresh transactions
                if (activeTab === 'view') {
                  fetchTransactions();
                }
              }}
            />
          </div>
        );
      case 'tools':
        return (
          <div className="tab-content">
            <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>ERC20 Transfer Tool</h2>
            <ERC20TransferTool 
              jwtToken={jwtToken || ''} 
              walletAddress={walletAddress} 
            />
          </div>
        );
      case 'spending-limits':
        return (
          <div className="tab-content">
            <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>Wallet Balance</h2>
            <SpendingLimitSwap 
              jwtToken={jwtToken || ''} 
              walletAddress={walletAddress} 
              spendingLimitContractAddress=""
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dca-management" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div className="tabs" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <button 
          className={`tab ${activeTab === 'register' ? 'active' : ''}`} 
          onClick={() => setActiveTab('register')}
          style={{ 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '8px',
            backgroundColor: activeTab === 'register' ? '#fa8c16' : '#f0f0f0',
            color: activeTab === 'register' ? 'white' : '#333',
            fontWeight: activeTab === 'register' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Start DCA
        </button>
        <button 
          className={`tab ${activeTab === 'view' ? 'active' : ''}`} 
          onClick={() => setActiveTab('view')}
          style={{ 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '8px',
            backgroundColor: activeTab === 'view' ? '#fa8c16' : '#f0f0f0',
            color: activeTab === 'view' ? 'white' : '#333',
            fontWeight: activeTab === 'view' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Active DCAs
        </button>
        <button 
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`} 
          onClick={() => setActiveTab('transactions')}
          style={{ 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '8px',
            backgroundColor: activeTab === 'transactions' ? '#fa8c16' : '#f0f0f0',
            color: activeTab === 'transactions' ? 'white' : '#333',
            fontWeight: activeTab === 'transactions' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Transactions
        </button>
        <button 
          className={`tab ${activeTab === 'tools' ? 'active' : ''}`} 
          onClick={() => setActiveTab('tools')}
          style={{ 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '8px',
            backgroundColor: activeTab === 'tools' ? '#fa8c16' : '#f0f0f0',
            color: activeTab === 'tools' ? 'white' : '#333',
            fontWeight: activeTab === 'tools' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Transfer Tool
        </button>
        <button 
          className={`tab ${activeTab === 'spending-limits' ? 'active' : ''}`} 
          onClick={() => setActiveTab('spending-limits')}
          style={{ 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '8px',
            backgroundColor: activeTab === 'spending-limits' ? '#fa8c16' : '#f0f0f0',
            color: activeTab === 'spending-limits' ? 'white' : '#333',
            fontWeight: activeTab === 'spending-limits' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Wallet Balance
        </button>
      </div>
      
      {renderTabContent()}
    </div>
  );
}

export function DCAManagement({ walletAddress }: { walletAddress: string }) {
  return (
    <div>
      <DCAManagementView walletAddress={walletAddress} />
    </div>
  );
}
