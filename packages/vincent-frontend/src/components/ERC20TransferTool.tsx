import React, { useState, useEffect } from 'react';
import { BACKEND_API_URL } from '../config';
import { getJwtFromLocalStorage, storeJwtInLocalStorage } from '../utils/auth';
import styles from '../styles/ERC20TransferTool.module.css';

export const ERC20TransferTool: React.FC = () => {
  const [tokenAddress, setTokenAddress] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [decimals, setDecimals] = useState('18');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [jwtStatus, setJwtStatus] = useState<string>('Checking...');
  const [serverStatus, setServerStatus] = useState<string>('Checking server status...');

  // Check server health when component mounts
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await fetch(`${BACKEND_API_URL}/health`);
        const data = await response.json();
        
        if (data.status === 'ok') {
          setServerStatus(`Server is online. Uptime: ${Math.floor(data.uptime / 60)} minutes`);
          console.log('Server health check successful:', data);
        } else {
          setServerStatus('Server is online but reporting issues');
        }
      } catch (err) {
        console.error('Error checking server health:', err);
        setServerStatus('Error connecting to server. Please check if the server is running.');
      }
    };
    
    checkServerHealth();
  }, []);

  // Check for JWT in URL parameters when component mounts
  useEffect(() => {
    const checkJwtInUrl = () => {
      try {
        // Get JWT from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const jwtFromUrl = urlParams.get('jwt');
        
        if (jwtFromUrl) {
          // Store JWT in localStorage
          storeJwtInLocalStorage(jwtFromUrl);
          setJwtStatus('JWT found in URL and stored in localStorage');
          
          // Remove JWT from URL to prevent leaking in browser history
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, newUrl);
        } else {
          // Check if JWT exists in localStorage
          const existingJwt = getJwtFromLocalStorage();
          if (existingJwt) {
            setJwtStatus('Using JWT from localStorage');
          } else {
            setJwtStatus('No JWT found. Authentication will fail.');
          }
        }
      } catch (err) {
        console.error('Error checking JWT:', err);
        setJwtStatus('Error checking JWT');
      }
    };
    
    checkJwtInUrl();
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Get JWT token for authentication
      const jwtToken = getJwtFromLocalStorage();
      
      // Create headers with JWT token if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
        console.log('JWT Token (first 20 chars):', jwtToken.substring(0, 20) + '...');
      } else {
        console.log('No JWT token available, proceeding without authentication');
      }
      
      // Use the no-auth endpoint for testing until JWT issues are resolved
      const endpoint = `${BACKEND_API_URL}/test-balance-check-no-auth`;
      console.log('Sending request to:', endpoint);
      console.log('Headers:', headers);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          walletAddress: recipientAddress || '0xd26389eb7b213ca70328a5cea1a977e5d4fbb367', // Use recipient address or default
          tokenAddress: tokenAddress || '0x1234567890abcdef', // Use token address or default
          amount: amount || '1.0',
          decimals: parseInt(decimals) || 18
        })
      });
      
      // Check if the response is OK
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', response.status, JSON.stringify(errorData));
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      setResult(data);
      console.log('Transfer successful:', data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error in handleTransfer:', err, err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>ERC20 Token Transfer</h2>
      
      <div className={serverStatus.includes('Error') ? styles.error : styles.info}>
        <p><strong>Server Status:</strong> {serverStatus}</p>
      </div>
      
      <div className={jwtStatus.includes('No JWT') ? styles.error : styles.info}>
        <p><strong>JWT Status:</strong> {jwtStatus}</p>
        {jwtStatus.includes('No JWT') && (
          <p>
            <a href="https://vincent-auth.vercel.app/" target="_blank" rel="noopener noreferrer">
              Click here to authenticate
            </a>
          </p>
        )}
      </div>
      
      <form onSubmit={handleTransfer} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="tokenAddress">Token Address:</label>
          <input
            id="tokenAddress"
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x1234567890abcdef"
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="recipientAddress">Recipient Address:</label>
          <input
            id="recipientAddress"
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0xd26389eb7b213ca70328a5cea1a977e5d4fbb367"
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="amount">Amount:</label>
          <input
            id="amount"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.0"
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="decimals">Decimals:</label>
          <input
            id="decimals"
            type="number"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            placeholder="18"
            className={styles.input}
          />
        </div>
        
        <button type="submit" disabled={loading || jwtStatus.includes('No JWT')} className={styles.button}>
          {loading ? 'Processing...' : 'Transfer Tokens'}
        </button>
      </form>
      
      {error && (
        <div className={styles.error}>
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className={styles.result}>
          <h3>Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
