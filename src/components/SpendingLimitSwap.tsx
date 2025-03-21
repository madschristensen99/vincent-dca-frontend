import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Styles
const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
    borderBottom: '2px solid #f0f0f0',
    paddingBottom: '10px'
  },
  infoBox: {
    marginBottom: '24px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#666',
    fontSize: '14px'
  },
  infoValue: {
    color: '#333',
    fontSize: '16px',
    fontWeight: '500'
  },
  addressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  explorerButton: {
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    color: '#555',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.2s ease'
  },
  networkBadge: {
    backgroundColor: '#e6f7ff',
    color: '#0070f3',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  balanceValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  balanceAmount: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333'
  },
  balanceSymbol: {
    fontSize: '14px',
    color: '#666',
    fontWeight: 'normal'
  },
  loadingIndicator: {
    color: '#999',
    fontStyle: 'italic'
  },
  errorMessage: {
    backgroundColor: '#fff1f0',
    color: '#ff4d4f',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  actionButton: {
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    transition: 'all 0.2s ease'
  },
  memecoinCard: {
    backgroundColor: '#fffbe6',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    border: '1px solid #ffe58f'
  },
  memecoinHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  memecoinTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#d48806'
  },
  memecoinLogo: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  memecoinDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  memecoinRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px'
  },
  memecoinLabel: {
    color: '#8c8c8c'
  },
  memecoinValue: {
    fontWeight: '500',
    color: '#262626'
  },
  priceChange: {
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px'
  },
  priceUp: {
    backgroundColor: '#f6ffed',
    color: '#52c41a'
  },
  priceDown: {
    backgroundColor: '#fff1f0',
    color: '#ff4d4f'
  },
  buyButton: {
    backgroundColor: '#fa8c16',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    marginTop: '16px',
    transition: 'all 0.2s ease'
  }
};

// Interfaces and types
interface SpendingLimitSwapProps {
  jwtToken: string;
  walletAddress: string;
  spendingLimitContractAddress: string;
}

const SpendingLimitSwap: React.FC<SpendingLimitSwapProps> = ({
  jwtToken,
  walletAddress,
  spendingLimitContractAddress
}) => {
  const [pkpBalance, setPkpBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Chain configuration
  const selectedChain = {
    id: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorerUrl: 'https://sepolia.basescan.org'
  };

  // Fetch PKP balance and top memecoin when component mounts
  useEffect(() => {
    fetchPkpBalance();
    console.log("Component mounted with wallet address:", walletAddress);
  }, [walletAddress]);
  
  // Function to fetch PKP balance directly using ethers.js
  const fetchPkpBalance = async () => {
    try {
      setIsLoadingBalance(true);
      setError(null);
      
      console.log(`Fetching balance for wallet: ${walletAddress} on chain: ${selectedChain.id}`);
      
      // Create provider directly using ethers
      const provider = new ethers.providers.JsonRpcProvider(selectedChain.rpcUrl);
      
      // Get balance
      const balanceWei = await provider.getBalance(walletAddress);
      const balanceEth = ethers.utils.formatEther(balanceWei);
      
      console.log(`Balance for ${walletAddress}: ${balanceEth} ETH`);
      
      setPkpBalance(balanceEth);
      setIsLoadingBalance(false);
    } catch (err: any) {
      console.error('Error fetching PKP balance:', err);
      setError(`Failed to fetch wallet balance: ${err.message}`);
      setIsLoadingBalance(false);
    }
  };
  
  // Function to truncate address for display
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Function to open block explorer for wallet
  const openBlockExplorer = () => {
    const url = `${selectedChain.blockExplorerUrl}/address/${walletAddress}`;
    window.open(url, '_blank');
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>PKP Wallet Balance</h2>
        
        <div style={styles.infoBox}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Wallet Address:</span>
            <div style={styles.addressContainer}>
              <span style={styles.infoValue}>{truncateAddress(walletAddress)}</span>
              <button 
                style={{
                  backgroundColor: '#f0f0f0',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#555',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s ease'
                }}
                onClick={openBlockExplorer}
                title="View on Block Explorer"
              >
                <span role="img" aria-label="External Link">🔗</span> View on Explorer
              </button>
            </div>
          </div>
          
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Network:</span>
            <span style={styles.infoValue}>
              <span style={{
                backgroundColor: '#e6f7ff',
                color: '#0070f3',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>{selectedChain.name}</span>
            </span>
          </div>
          
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Balance:</span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              {isLoadingBalance ? (
                <span style={{
                  color: '#999',
                  fontStyle: 'italic'
                }}>Loading...</span>
              ) : (
                <>
                  <span style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#333'
                  }}>{parseFloat(pkpBalance).toFixed(4)}</span>
                  <span style={{
                    fontSize: '14px',
                    color: '#666',
                    fontWeight: 'normal'
                  }}>ETH</span>
                </>
              )}
            </span>
          </div>
        </div>
        
        {error && (
          <div style={{
            backgroundColor: '#fff1f0',
            color: '#ff4d4f',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span role="img" aria-label="Error">⚠️</span> {error}
          </div>
        )}
        
        <button 
          style={{
            backgroundColor: isLoadingBalance ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isLoadingBalance ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            transition: 'all 0.2s ease'
          }}
          onClick={fetchPkpBalance}
          disabled={isLoadingBalance}
        >
          {isLoadingBalance ? (
            <>
              <span style={{
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }}>⟳</span> Refreshing...
            </>
          ) : (
            <>
              <span role="img" aria-label="Refresh">🔄</span> Refresh Balance
            </>
          )}
        </button>
      </div>
      
      {/* Swap Form */}
      <div style={{
        backgroundColor: '#fffbe6',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        border: '1px solid #ffe58f'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#d48806'
          }}>Swap Form</h3>
        </div>
      </div>
    </div>
  );
};

export default SpendingLimitSwap;
