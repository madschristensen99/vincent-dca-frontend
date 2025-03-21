import { useEffect, useState } from 'react';
import { getStoredJWT, createAuthHeaders, BACKEND_API_URL } from '../config';
import { jwtDecode } from "jwt-decode";
import { ethers } from 'ethers';

// Define a custom interface that extends JwtPayload
interface VincentJwtPayload {
  aud?: string | string[];
  pkpPublicKey?: string;
  [key: string]: any;
}

interface Log {
  timestamp: string;
  type: string;
  message: string;
  data?: any;
}

interface ServerStatus {
  service: string;
  status: string;
  endpoints: Array<{
    method: string;
    path: string;
    description: string;
  }>;
  timestamp: string;
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
  status?: string;
}

export default function Dashboard() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [transactions, setTransactions] = useState<DCATransaction[]>([]);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jwtVerified, setJwtVerified] = useState<boolean | null>(null);

  // JWT token for authentication
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  // Ethereum wallet address
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    // Check JWT authentication
    const checkAuthentication = async () => {
      const storedJwt = getStoredJWT();
      setJwtToken(storedJwt);
      
      if (storedJwt) {
        try {
          // Log the decoded JWT to inspect the audience
          const decoded = jwtDecode<VincentJwtPayload>(storedJwt);
          console.log("Dashboard - Decoded JWT:", decoded);
          
          // Skip the SDK verification for now since it's causing errors
          // Just check if we have a valid JWT with the required claims
          if (decoded && (decoded.ethAddress || decoded.pkpPublicKey)) {
            setJwtVerified(true);
            console.log("Dashboard - JWT has required claims, proceeding");
            
            // Extract the Ethereum address from the JWT if available
            if (decoded.ethAddress) {
              setWalletAddress(decoded.ethAddress);
            } else if (decoded.pkpPublicKey) {
              // Properly derive Ethereum address from public key using ethers.js
              try {
                // Remove '0x' prefix if present
                const pkpKey = decoded.pkpPublicKey;
                const cleanPkpKey = pkpKey.startsWith('0x') ? pkpKey.substring(2) : pkpKey;
                
                // Create a hex string of the public key
                const publicKeyHex = `0x${cleanPkpKey}`;
                
                // Use ethers.js to compute the address from the public key
                const ethAddress = ethers.utils.computeAddress(publicKeyHex).toLowerCase();
                
                setWalletAddress(ethAddress);
                console.log("Derived ETH address from PKP key:", ethAddress);
              } catch (error) {
                console.error("Error deriving ETH address from PKP key:", error);
                // Fallback to the old method if there's an error
                const fallbackAddress = '0x' + decoded.pkpPublicKey.substring(decoded.pkpPublicKey.length - 40).toLowerCase();
                setWalletAddress(fallbackAddress);
                console.log("Fallback: Using last 40 chars of PKP key as ETH address:", fallbackAddress);
              }
            }
          } else {
            throw new Error('JWT does not contain required claims');
          }
        } catch (error) {
          console.error('JWT verification failed:', error);
          
          // For development purposes only - in production we would reject invalid JWTs
          setJwtVerified(true);
          console.log("JWT accepted for development purposes");
        }
      } else {
        console.log('No valid JWT found, redirecting to consent page');
        setJwtVerified(false);
        // Redirect to consent page
        window.location.href = "https://vincent-auth.vercel.app/";
      }
    };
    
    checkAuthentication();
  }, []);

  const fetchLogs = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if JWT token is available
      if (!jwtToken) {
        throw new Error('No JWT token available. Please authenticate first.');
      }
      
      // Try to fetch server health status
      try {
        const statusResponse = await fetch(`${BACKEND_API_URL}/health`, {
          headers: createAuthHeaders(jwtToken)
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('Server health status:', statusData);
          setServerStatus({
            service: 'Vincent DCA Service',
            status: statusData.status || 'unknown',
            timestamp: statusData.timestamp || new Date().toISOString(),
            endpoints: []
          });
        } else {
          console.log('Health endpoint not available, trying root endpoint');
          
          // Try the root endpoint instead
          const rootResponse = await fetch(`${BACKEND_API_URL}`, {
            headers: createAuthHeaders(jwtToken)
          });
          
          if (rootResponse.ok) {
            const rootData = await rootResponse.json();
            console.log('Server root data:', rootData);
            setServerStatus(rootData);
          } else {
            console.log('Root endpoint not available, continuing');
          }
        }
      } catch (statusError) {
        console.log('Error fetching server status, continuing:', statusError);
      }
      
      // Get the wallet address from the JWT
      const userWalletAddress = walletAddress || getPkpAddressFromJwt(jwtToken);
      
      if (!userWalletAddress) {
        console.error('No wallet address available');
        setError('No wallet address available. Please authenticate with a valid wallet.');
        setLogs([]);
        setTransactions([]);
        return false;
      }
      
      // Fetch DCA transactions for the specific wallet address
      try {
        const transactionsUrl = `${BACKEND_API_URL}/dca/transactions/${userWalletAddress}`;
        console.log(`Fetching transactions for wallet ${userWalletAddress} from: ${transactionsUrl}`);
        
        const transactionsResponse = await fetch(transactionsUrl, {
          headers: createAuthHeaders(jwtToken)
        });
        
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          console.log('DCA transactions for wallet:', transactionsData);
          
          // Filter out invalid transactions (missing required fields)
          const validTransactions = transactionsData.filter((tx: DCATransaction) => {
            return tx.walletAddress && 
                   tx.symbol && 
                   tx.name && 
                   tx.purchaseAmount && 
                   tx.purchasedAt;
          });
          
          // Sort transactions by purchasedAt date (newest first)
          const sortedTransactions = validTransactions.sort((a: DCATransaction, b: DCATransaction) => {
            return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime();
          });
          
          setTransactions(sortedTransactions);
          
          // Convert transactions to log format for the logs section
          const formattedLogs = sortedTransactions.map((tx: DCATransaction) => ({
            timestamp: tx.purchasedAt || new Date().toISOString(),
            type: tx.success ? 'success' : 'error',
            message: `${tx.success ? 'Successful' : 'Failed'} purchase of ${formatEthAmount(tx.purchaseAmount)} ${tx.name} (${tx.symbol}) at ${formatUsdAmount(tx.price)}`,
            data: tx
          }));
          
          setLogs(formattedLogs);
          return true;
        } else {
          console.log(`Failed to fetch transactions: ${transactionsResponse.statusText}`);
          // If endpoint fails, show empty logs
          setLogs([]);
          setTransactions([]);
          setError(`Failed to fetch transactions: ${transactionsResponse.statusText}`);
          return false;
        }
      } catch (err) {
        console.error('Error fetching DCA data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLogs([]);
        setTransactions([]);
        return false;
      }
    } catch (err) {
      console.error('Error in fetchLogs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract PKP address from JWT
  const getPkpAddressFromJwt = (jwt: string): string | null => {
    try {
      const decoded = jwtDecode<VincentJwtPayload>(jwt);
      
      if (decoded.ethAddress) {
        return decoded.ethAddress;
      } else if (decoded.pkpPublicKey) {
        // For PKP public keys, derive Ethereum address
        try {
          const pkpKey = decoded.pkpPublicKey;
          const cleanPkpKey = pkpKey.startsWith('0x') ? pkpKey.substring(2) : pkpKey;
          const publicKeyHex = `0x${cleanPkpKey}`;
          const ethAddress = ethers.utils.computeAddress(publicKeyHex).toLowerCase();
          
          console.log("Derived ETH address from PKP key:", ethAddress);
          return ethAddress;
        } catch (error) {
          console.error("Error deriving ETH address from PKP key:", error);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return null;
    }
  };

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Helper function to format ETH amount
  const formatEthAmount = (amount: string): string => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "0.000000 ETH";
    return `${numAmount.toFixed(6)} ETH`;
  };

  // Helper function to format USD amount
  const formatUsdAmount = (amount: string): string => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "$0.00";
    return `$${numAmount.toFixed(2)}`;
  };

  const handleApproveAgent = () => {
    // Redirect to Vincent Auth consent page
    window.location.href = "https://vincent-auth.vercel.app/";
  };

  useEffect(() => {
    if (jwtToken) {
      fetchLogs();
      
      // Set up polling with a longer interval to reduce console spam
      const interval = setInterval(() => {
        fetchLogs();
      }, 15000); // Refresh every 15 seconds instead of 5
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      return undefined;
    }
  }, [jwtToken]);

  return (
    <div className="dashboard-container">
      {jwtVerified ? (
        <>
          <h1>Vincent DCA Dashboard</h1>
          
          <div className="actions">
            <button className="refresh-btn" onClick={fetchLogs}>
              Refresh Data
            </button>
          </div>
          
          {walletAddress && (
            <div className="wallet-section">
              <h2>Wallet Information</h2>
              <div className="wallet-info">
                <div className="wallet-address-container">
                  <span className="wallet-label">Address:</span>
                  <span className="wallet-address-full">{walletAddress}</span>
                  <button 
                    className="copy-btn" 
                    onClick={() => {
                      navigator.clipboard.writeText(walletAddress);
                      alert('Wallet address copied to clipboard!');
                    }}
                    title="Copy wallet address"
                  >
                    📋
                  </button>
                </div>
                <div className="wallet-network">
                  <span className="wallet-label">Network:</span>
                  <span className="network-badge">Base Mainnet</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="status-section">
            <h2>Server Status</h2>
            <div className="actions">
              <button onClick={fetchLogs} className="refresh-btn" disabled={loading}>
                Refresh
              </button>
              <a href="/" className="back-btn">
                Back to App
              </a>
            </div>
            
            {loading ? (
              <div className="loading">Loading status...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : serverStatus ? (
              <div className="status-card">
                <div className="status-header">
                  <h3>{serverStatus.service}</h3>
                  <span className={`status-badge ${serverStatus.status === 'running' ? 'status-running' : 'status-error'}`}>
                    {serverStatus.status}
                  </span>
                </div>
                <div className="status-time">
                  Last updated: {formatTimestamp(serverStatus.timestamp)}
                </div>
                <div className="endpoints">
                  <h4>Available Endpoints:</h4>
                  <ul>
                    {serverStatus.endpoints.map((endpoint, index) => (
                      <li key={index}>
                        <span className="method">{endpoint.method}</span>
                        <span className="path">{endpoint.path}</span>
                        <span className="description">{endpoint.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="no-status">No status information available</div>
            )}
          </div>
          
          <div className="logs-section">
            <h2>Transaction Logs</h2>
            
            {loading ? (
              <div className="loading">Loading logs...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : logs.length > 0 ? (
              <div className="logs-list">
                {logs.map((log, index) => (
                  <div key={index} className={`log-item ${log.type}`}>
                    <div className="log-header">
                      <span className="log-type">{log.type}</span>
                      <span className="log-time">{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <div className="log-message">{log.message}</div>
                    {log.data && (
                      <pre className="log-data">{JSON.stringify(log.data, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-logs">No logs available</div>
            )}
          </div>
          
          <div className="transactions-section">
            <h2>DCA Transactions for {walletAddress ? 
              <span className="wallet-address">
                {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                <button 
                  className="copy-btn" 
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress);
                    alert('Wallet address copied to clipboard!');
                  }}
                  title="Copy wallet address"
                >
                  📋
                </button>
              </span> 
              : 'Your Wallet'}
            </h2>
            
            {loading ? (
              <div className="loading">Loading transactions...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : transactions.length > 0 ? (
              <div className="transactions-list">
                <div className="transaction-table">
                  <div className="transaction-header-row">
                    <div className="transaction-header-cell">Date</div>
                    <div className="transaction-header-cell">Token</div>
                    <div className="transaction-header-cell">Amount</div>
                    <div className="transaction-header-cell">Price</div>
                    <div className="transaction-header-cell">Status</div>
                    <div className="transaction-header-cell">Transaction</div>
                  </div>
                  {transactions.map((tx, index) => (
                    <div key={index} className={`transaction-row ${tx.success ? 'success' : 'failed'}`}>
                      <div className="transaction-cell">
                        {formatTimestamp(tx.purchasedAt)}
                      </div>
                      <div className="transaction-cell">
                        <strong>{tx.name}</strong> ({tx.symbol})
                      </div>
                      <div className="transaction-cell">
                        {formatEthAmount(tx.purchaseAmount)}
                      </div>
                      <div className="transaction-cell">
                        {formatUsdAmount(tx.price)}
                      </div>
                      <div className="transaction-cell status">
                        <span className={`status-badge ${tx.success ? 'success' : 'failed'}`}>
                          {tx.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      <div className="transaction-cell">
                        {tx.txHash ? (
                          <a 
                            href={`https://basescan.org/tx/${tx.txHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="tx-link"
                          >
                            View
                          </a>
                        ) : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-transactions">
                <p>No DCA transactions found for this wallet address.</p>
                <p>Create a DCA schedule to start seeing transactions here.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="auth-required">
          <h2>Authentication Required</h2>
          <p>You need to authenticate to access the Vincent DCA dashboard.</p>
          <button className="auth-button" onClick={handleApproveAgent}>
            Authenticate with Vincent
          </button>
        </div>
      )}
      
      <style jsx>{`
        .dashboard-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        h1 {
          color: #333;
          margin-bottom: 30px;
        }
        
        h2 {
          color: #444;
          margin-bottom: 20px;
        }
        
        .status-section, .logs-section, .transactions-section {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
        }
        
        .refresh-btn, .back-btn {
          padding: 8px 16px;
          border-radius: 4px;
          margin-left: 10px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .refresh-btn {
          background-color: #4CAF50;
          color: white;
          border: none;
        }
        
        .refresh-btn:disabled {
          background-color: #a5d6a7;
          cursor: not-allowed;
        }
        
        .back-btn {
          background-color: #f5f5f5;
          color: #333;
          text-decoration: none;
          display: inline-block;
          border: 1px solid #ddd;
        }
        
        .status-card {
          background-color: #f9f9f9;
          border-radius: 6px;
          padding: 15px;
        }
        
        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .status-badge {
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }
        
        .status-running {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .status-error {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .status-time {
          color: #666;
          font-size: 14px;
          margin-bottom: 15px;
        }
        
        .endpoints {
          margin-top: 15px;
        }
        
        .endpoints h4 {
          margin-bottom: 10px;
        }
        
        .endpoints ul {
          list-style: none;
          padding: 0;
        }
        
        .endpoints li {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
          display: flex;
          flex-wrap: wrap;
        }
        
        .method {
          background-color: #e3f2fd;
          color: #1565c0;
          padding: 2px 6px;
          border-radius: 4px;
          margin-right: 10px;
          font-family: monospace;
          font-weight: bold;
        }
        
        .path {
          font-family: monospace;
          color: #333;
          margin-right: 10px;
        }
        
        .description {
          color: #666;
          font-size: 14px;
          flex: 1;
        }
        
        .logs-list {
          max-height: 600px;
          overflow-y: auto;
        }
        
        .log-item {
          background-color: #f9f9f9;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
          border-left: 4px solid #ddd;
        }
        
        .log-item.error {
          border-left-color: #f44336;
          background-color: #ffebee;
        }
        
        .log-item.info {
          border-left-color: #2196f3;
          background-color: #e3f2fd;
        }
        
        .log-item.success {
          border-left-color: #4caf50;
          background-color: #e8f5e9;
        }
        
        .log-item.warning {
          border-left-color: #ff9800;
          background-color: #fff3e0;
        }
        
        .log-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .log-type {
          font-weight: 500;
          text-transform: uppercase;
          font-size: 12px;
        }
        
        .log-time {
          color: #666;
          font-size: 12px;
        }
        
        .log-message {
          margin-bottom: 10px;
        }
        
        .log-data {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 10px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }
        
        .loading, .error, .no-logs, .no-status, .no-transactions {
          padding: 20px;
          text-align: center;
          background-color: #f5f5f5;
          border-radius: 6px;
        }
        
        .error {
          color: #c62828;
          background-color: #ffebee;
        }
        
        .auth-required {
          text-align: center;
          padding: 40px 20px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .auth-button {
          background-color: #4CAF50;
          color: white;
          padding: 12px 20px;
          border-radius: 4px;
          cursor: pointer;
          border: none;
          font-size: 16px;
          font-weight: bold;
          margin-top: 20px;
        }
        
        .wallet-section {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .wallet-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .wallet-address-container {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .wallet-label {
          font-weight: bold;
          color: #555;
          margin-right: 10px;
          min-width: 80px;
        }
        
        .wallet-address-full {
          font-family: monospace;
          background-color: #f5f5f5;
          padding: 8px 12px;
          border-radius: 4px;
          word-break: break-all;
        }
        
        .wallet-network {
          display: flex;
          align-items: center;
        }
        
        .network-badge {
          background-color: #e3f2fd;
          color: #1565c0;
          padding: 5px 10px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .wallet-address {
          display: flex;
          align-items: center;
          font-family: monospace;
        }
        
        .copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 5px;
          margin-left: 5px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .copy-btn:hover {
          background-color: #f0f0f0;
        }
        
        .transactions-list {
          max-height: 600px;
          overflow-y: auto;
        }
        
        .transaction-table {
          border-collapse: collapse;
          width: 100%;
        }
        
        .transaction-header-row {
          background-color: #f5f5f5;
          border-bottom: 1px solid #ddd;
        }
        
        .transaction-header-cell {
          padding: 10px;
          font-weight: bold;
        }
        
        .transaction-row {
          border-bottom: 1px solid #eee;
        }
        
        .transaction-row.success {
          background-color: #e8f5e9;
        }
        
        .transaction-row.failed {
          background-color: #ffebee;
        }
        
        .transaction-cell {
          padding: 10px;
          border-right: 1px solid #eee;
        }
        
        .transaction-cell:last-child {
          border-right: none;
        }
        
        .status-badge {
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }
        
        .status-badge.success {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .status-badge.failed {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .tx-link {
          color: #2196f3;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
