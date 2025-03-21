import React, { useState, useEffect } from 'react';
import styles from '../styles/ActiveDCAs.module.css';
import { TOKEN_INFO } from '../constants/tokenInfo';

// Backend API URL
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';

interface ActiveDCAsProps {
  walletAddress: string;
  jwtToken: string;
  onRefresh?: () => void;
}

interface Schedule {
  _id: string;
  walletAddress: string;
  tokenAddress: string;
  tokenName?: string;
  tokenSymbol?: string;
  amount?: number | string;
  purchaseAmount?: number | string;
  frequency: string;
  active: boolean;
  lastExecuted?: string;
  nextExecution?: string;
  createdAt: string;
}

interface TokenInfo {
  name: string;
  symbol: string;
  logoURI: string;
  decimals?: number;
}

interface SimulationResult {
  tokenAmount: string;
  tokenSymbol: string;
  ethAmount: string;
  priceImpact: string;
  timestamp: string;
}

// Function to fetch token info
async function fetchTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
  try {
    // First check if we have the token info in our constants
    if (TOKEN_INFO[tokenAddress]) {
      return TOKEN_INFO[tokenAddress];
    }
    
    // Otherwise fetch from an API
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch token info: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      name: data.name,
      symbol: data.symbol.toUpperCase(),
      logoURI: data.image?.small || ''
    };
  } catch (error) {
    console.error(`Error fetching token info for ${tokenAddress}:`, error);
    return null;
  }
}

// Function to execute a schedule
async function executeSchedule(
  scheduleId: string, 
  schedules: Schedule[], 
  setExecutingSchedule: React.Dispatch<React.SetStateAction<string | null>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  fetchSchedules: () => Promise<void>,
  jwtToken: string
) {
  setExecutingSchedule(scheduleId);
  setError(null);
  
  try {
    const schedule = schedules.find(s => s._id === scheduleId);
    
    if (!schedule) {
      throw new Error(`Schedule with ID ${scheduleId} not found`);
    }
    
    const response = await fetch(`${BACKEND_API_URL}/dca/execute/${scheduleId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to execute schedule: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // If successful, refresh schedules to get updated lastExecuted timestamp
    if (result.success) {
      fetchSchedules();
    } else {
      throw new Error(result.error || 'Failed to execute schedule');
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to execute schedule');
  } finally {
    setExecutingSchedule(null);
  }
}

// Function to simulate a transaction
async function simulateTransaction(
  scheduleId: string,
  setSimulatingTransaction: React.Dispatch<React.SetStateAction<string | null>>,
  setSimulationResult: React.Dispatch<React.SetStateAction<SimulationResult | null>>,
  setShowSimulationModal: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  jwtToken: string
) {
  setSimulatingTransaction(scheduleId);
  setError(null);
  
  try {
    const response = await fetch(`${BACKEND_API_URL}/dca/simulate/${scheduleId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to simulate transaction: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    setSimulationResult({
      tokenAmount: result.tokenAmount || '0',
      tokenSymbol: result.tokenSymbol,
      ethAmount: result.ethAmount,
      priceImpact: result.priceImpact || '0.5',
      timestamp: result.timestamp
    });
    
    setShowSimulationModal(true);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to simulate transaction');
  } finally {
    setSimulatingTransaction(null);
  }
}

// Function to toggle schedule active status
async function toggleScheduleActive(
  scheduleId: string,
  active: boolean,
  setCancelingSchedule: React.Dispatch<React.SetStateAction<string | null>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  fetchSchedules: () => Promise<void>,
  jwtToken: string
) {
  setCancelingSchedule(scheduleId);
  setError(null);
  
  try {
    const response = await fetch(`${BACKEND_API_URL}/dca/schedules/${scheduleId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ active })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to ${active ? 'activate' : 'deactivate'} schedule: ${response.statusText}`);
    }
    
    // Refresh schedules to get updated status
    fetchSchedules();
  } catch (err) {
    setError(err instanceof Error ? err.message : `Failed to ${active ? 'activate' : 'deactivate'} schedule`);
  } finally {
    setCancelingSchedule(null);
  }
}

export function ActiveDCAs({ walletAddress, jwtToken, onRefresh }: ActiveDCAsProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingSchedule, setExecutingSchedule] = useState<string | null>(null);
  const [cancelingSchedule, setCancelingSchedule] = useState<string | null>(null);
  const [simulatingTransaction, setSimulatingTransaction] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<Record<string, TokenInfo>>({});
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Fetch active schedules
  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!walletAddress) {
        setSchedules([]);
        return;
      }
      
      const response = await fetch(`${BACKEND_API_URL}/dca/schedules/${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch schedules: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetched schedules:', data);
      
      if (Array.isArray(data)) {
        setSchedules(data);
        // Fetch token data for each schedule
        const tokenAddresses = data
          .map(schedule => schedule.tokenAddress)
          .filter((address, index, self) => address && self.indexOf(address) === index);
        
        const promises = tokenAddresses.map(async (address) => {
          const tokenInfo = await fetchTokenInfo(address);
          if (tokenInfo) {
            return { [address]: tokenInfo };
          } else {
            return {};
          }
        });
        
        const results = await Promise.all(promises);
        const newTokenData = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setTokenData(newTokenData);
      } else {
        console.error('Unexpected schedule data format:', data);
        setSchedules([]);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch schedules');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Format frequency for display
  const formatFrequency = (frequency: string | undefined) => {
    if (!frequency) return 'Unknown';
    
    switch (frequency.toLowerCase()) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'hourly':
        return 'Hourly';
      default:
        return frequency;
    }
  };

  // Format eth amount for display
  const formatEthAmount = (amount: number | string | undefined) => {
    if (amount === undefined || amount === null) {
      return '0.0000';
    }
    
    try {
      // Convert to number if it's a string
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      // Check if it's a valid number
      if (isNaN(numAmount)) {
        return '0.0000';
      }
      
      return numAmount.toFixed(4);
    } catch (error) {
      console.error('Error formatting ETH amount:', error);
      return '0.0000';
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [walletAddress, jwtToken]);

  return (
    <div className={styles.dca_schedules_container}>
      <h2 className={styles.dca_schedules_title}>Active DCA Schedules</h2>
      
      {error && (
        <div className={styles.error_message}>
          <p>{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className={styles.loading_indicator}>
          <p>Loading your DCA schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className={styles.no_schedules_message}>
          <p>No active DCA schedules found</p>
          <p>Create a new DCA schedule to start dollar-cost averaging into your favorite tokens.</p>
        </div>
      ) : (
        <div className={styles.schedules_list}>
          {schedules.map((schedule) => {
            // Debug log for each schedule
            console.log('Processing schedule:', schedule);
            
            const tokenInfo = tokenData[schedule.tokenAddress] || {
              name: schedule.tokenName || 'Unknown Token',
              symbol: schedule.tokenSymbol || 'UNKNOWN',
              logoURI: ''
            };
            
            // Use purchaseAmount as fallback for amount, ensure it's a valid value
            let displayAmount = schedule.amount || schedule.purchaseAmount;
            if (displayAmount === undefined || displayAmount === null) {
              console.warn(`Schedule ${schedule._id} has no amount or purchaseAmount`);
              displayAmount = 0;
            }
            
            return (
              <div key={schedule._id} className={styles.schedule_card}>
                <div className={styles.schedule_header}>
                  <div className={styles.token_info}>
                    <img 
                      src={tokenInfo.logoURI || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM3MTgwOTYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWRvbGxhci1zaWduIj48bGluZSB4MT0iMTIiIHkxPSIxIiB4Mj0iMTIiIHkyPSIyMyI+PC9saW5lPjxwYXRoIGQ9Ik0xNyA1SDkuNUMxMC41IDUgMTEgNS41IDExIDYuNVMxMC41IDggOS41IDhINy41QzYuNSA4IDYgOC41IDYgOS41UzYuNSAxMSA3LjUgMTFIMTQuNUMxNS41IDExIDE2IDExLjUgMTYgMTIuNVMxNS41IDE0IDE0LjUgMTRINiI+PC9wYXRoPjwvc3ZnPg=='} 
                      alt={`${tokenInfo.symbol} logo`} 
                      className={styles.token_logo}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM3MTgwOTYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWRvbGxhci1zaWduIj48bGluZSB4MT0iMTIiIHkxPSIxIiB4Mj0iMTIiIHkyPSIyMyI+PC9saW5lPjxwYXRoIGQ9Ik0xNyA1SDkuNUMxMC41IDUgMTEgNS41IDExIDYuNVMxMC41IDggOS41IDhINy41QzYuNSA4IDYgOC41IDYgOS41UzYuNSAxMSA3LjUgMTFIMTQuNUMxNS41IDExIDE2IDExLjUgMTYgMTIuNVMxNS41IDE0IDE0LjUgMTRINiI+PC9wYXRoPjwvc3ZnPg==';
                      }}
                    />
                    <div className={styles.token_details}>
                      <h3>{tokenInfo.name}</h3>
                      <p className={styles.schedule_subtitle}>
                        Buying {tokenInfo.symbol} with ETH
                      </p>
                    </div>
                  </div>
                  <div className={styles.schedule_status}>
                    <span className={`${styles.status_indicator} ${schedule.active ? styles.active : styles.inactive}`}>
                      {schedule.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className={styles.schedule_details}>
                  <div className={styles.detail_row}>
                    <span className={styles.detail_label}>Amount</span>
                    <span className={styles.detail_value}>{formatEthAmount(displayAmount)} ETH</span>
                  </div>
                  <div className={styles.detail_row}>
                    <span className={styles.detail_label}>Frequency</span>
                    <span className={styles.detail_value}>{formatFrequency(schedule.frequency)}</span>
                  </div>
                  <div className={styles.detail_row}>
                    <span className={styles.detail_label}>Last Executed</span>
                    <span className={styles.detail_value}>
                      {schedule.lastExecuted ? formatDate(schedule.lastExecuted) : 'Never'}
                    </span>
                  </div>
                  <div className={styles.detail_row}>
                    <span className={styles.detail_label}>Next Execution</span>
                    <span className={styles.detail_value}>
                      {schedule.nextExecution ? formatDate(schedule.nextExecution) : 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className={styles.schedule_actions}>
                  <button 
                    className={`${styles.action_button} ${styles.execute_button}`}
                    onClick={() => executeSchedule(
                      schedule._id, 
                      schedules, 
                      setExecutingSchedule, 
                      setError, 
                      fetchSchedules,
                      jwtToken
                    )}
                    disabled={!!executingSchedule || !schedule.active}
                  >
                    {executingSchedule === schedule._id ? 'Executing...' : 'Execute Now'}
                  </button>
                  
                  <button 
                    className={`${styles.action_button} ${styles.simulate_button}`}
                    onClick={() => simulateTransaction(
                      schedule._id,
                      setSimulatingTransaction,
                      setSimulationResult,
                      setShowSimulationModal,
                      setError,
                      jwtToken
                    )}
                    disabled={!!simulatingTransaction}
                  >
                    {simulatingTransaction === schedule._id ? 'Simulating...' : 'Simulate'}
                  </button>
                  
                  <button 
                    className={`${styles.action_button} ${styles.cancel_button}`}
                    onClick={() => toggleScheduleActive(
                      schedule._id, 
                      !schedule.active,
                      setCancelingSchedule,
                      setError,
                      fetchSchedules,
                      jwtToken
                    )}
                    disabled={!!cancelingSchedule}
                  >
                    {cancelingSchedule === schedule._id 
                      ? (schedule.active ? 'Deactivating...' : 'Activating...') 
                      : (schedule.active ? 'Deactivate' : 'Activate')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {showSimulationModal && simulationResult && (
        <div className={styles.simulation_modal}>
          <div className={styles.simulation_content}>
            <div className={styles.simulation_header}>
              <h3>Transaction Simulation</h3>
              <button className={styles.close_button} onClick={() => setShowSimulationModal(false)}>×</button>
            </div>
            
            <div className={styles.simulation_details}>
              <div className={styles.simulation_row}>
                <span className={styles.simulation_label}>You will receive</span>
                <span className={styles.simulation_value}>
                  {simulationResult.tokenAmount} {simulationResult.tokenSymbol}
                </span>
              </div>
              <div className={styles.simulation_row}>
                <span className={styles.simulation_label}>You will spend</span>
                <span className={styles.simulation_value}>{simulationResult.ethAmount} ETH</span>
              </div>
              <div className={styles.simulation_row}>
                <span className={styles.simulation_label}>Price impact</span>
                <span className={styles.simulation_value}>{simulationResult.priceImpact}%</span>
              </div>
              <div className={styles.simulation_row}>
                <span className={styles.simulation_label}>Execution time</span>
                <span className={styles.simulation_value}>{formatDate(simulationResult.timestamp)}</span>
              </div>
            </div>
            
            <button className={styles.confirm_button} onClick={() => setShowSimulationModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}