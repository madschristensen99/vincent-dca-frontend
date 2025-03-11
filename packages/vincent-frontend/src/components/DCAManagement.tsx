import { useEffect, useState, useCallback } from 'react';
import { RegisterDCA } from './RegisterDCA';
import { ActiveDCAs } from './ActiveDCAs';

// Base Mainnet Etherscan API
const BASE_API_URL = 'https://api.basescan.org/api';
const API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY;

// Backend API URL
const BACKEND_API_URL = 'http://localhost:3000';

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

function TransactionList({ transactions, dcaTransactions }: { 
  transactions: Transaction[],
  dcaTransactions: DCATransaction[] 
}) {
  // If we have DCA transactions from our backend, show those instead
  if (dcaTransactions.length > 0) {
    return (
      <div className="transactions-list">
        {dcaTransactions.map((tx) => (
          <div key={tx._id} className="transaction-item">
            <div className="transaction-header">
              <span className="transaction-date">
                {new Date(tx.purchasedAt).toLocaleDateString()}
              </span>
              {tx.txHash && (
                <a 
                  href={`https://basescan.org/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transaction-link"
                >
                  View
                </a>
              )}
            </div>
            <div className="transaction-details">
              <div>Token: {tx.name} ({tx.symbol})</div>
              <div>Amount: ${tx.purchaseAmount}</div>
              <div>Price: ${tx.price}</div>
              <div className={`status ${tx.success ? 'success' : 'failed'}`}>
                Status: {tx.success ? 'Success' : 'Failed'}
              </div>
              {tx.error && <div className="error-message">Error: {tx.error}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback to Etherscan transactions if no DCA transactions
  if (transactions.length === 0) {
    return (
      <div className="no-transactions">
        No transactions found for this address
      </div>
    );
  }

  return (
    <div className="transactions-list">
      {transactions.map((tx) => (
        <div key={tx.hash} className="transaction-item">
          <div className="transaction-header">
            <span className="transaction-date">
              {new Date(Number(tx.timeStamp) * 1000).toLocaleDateString()}
            </span>
            <a 
              href={`https://basescan.org/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="transaction-link"
            >
              View
            </a>
          </div>
          <div className="transaction-details">
            <div>From: {tx.from}</div>
            <div>To: {tx.to}</div>
            <div>Value: {Number(tx.value) / 1e18} ETH</div>
          </div>
        </div>
      ))}
    </div>
  );
}

type Tab = 'register' | 'transactions' | 'view';

interface DCAManagementViewProps {
  address: string;
}

export function DCAManagementView({ address }: DCAManagementViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('register');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dcaTransactions, setDcaTransactions] = useState<DCATransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // First try to fetch from our backend
    try {
      const response = await fetch(`${BACKEND_API_URL}/dca/transactions/${address}`);
      
      if (response.ok) {
        const data = await response.json();
        setDcaTransactions(data);
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
        `${BASE_API_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`
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
  }, [address]);

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
      
      const response = await fetch(`${BACKEND_API_URL}/dca/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
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
            <h2>Register New DCA</h2>
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
            <h2>Active DCAs</h2>
            <ActiveDCAs address={address} />
          </div>
        );
    }
  };

  return (
    <div className="card dca-management">
      <header>
        <h1>Dollar Cost Average (DCA) Dashboard</h1>
        <div className="header-actions">
          <a href="/dashboard" className="dashboard-link">View Server Dashboard</a>
        </div>
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register DCA
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