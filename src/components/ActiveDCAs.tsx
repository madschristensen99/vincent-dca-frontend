import { useEffect, useState } from 'react';
import api from '../utils/api';

// Define the backend API URL
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vincent-dca-service.herokuapp.com';

interface Schedule {
  _id: string;
  scheduleId: string; // Virtual property that maps to _id
  walletAddress: string;
  purchaseIntervalSeconds: number;
  purchaseAmount: string;
  active: boolean;
  registeredAt: string;
}

interface ActiveDCAsProps {
  address: string;
}

export function ActiveDCAs({ address }: ActiveDCAsProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulationLoading, setSimulationLoading] = useState<string | null>(null);
  const [simulationSuccess, setSimulationSuccess] = useState<string | null>(null);

  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const schedules = await api.get(`/dca/schedules/${address}`);
      setSchedules(schedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError('Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [address]);

  const toggleScheduleStatus = async (scheduleId: string, currentStatus: boolean) => {
    try {
      const endpoint = currentStatus 
        ? `/dca/schedules/${scheduleId}/deactivate` 
        : `/dca/schedules/${scheduleId}/activate`;
        
      await api.patch(endpoint, {});
      
      // Update the local state to reflect the change
      setSchedules(prevSchedules => 
        prevSchedules.map(schedule => 
          (schedule._id === scheduleId || schedule.scheduleId === scheduleId)
            ? { ...schedule, active: !currentStatus } 
            : schedule
        )
      );
    } catch (err) {
      setError('Failed to update schedule status');
      console.error('Error:', err);
    }
  };

  const simulateTransaction = async (scheduleId: string, amount: string) => {
    setSimulationLoading(scheduleId);
    setSimulationSuccess(null);
    setError(null);
    
    try {
      const data = {
        scheduleId,
        walletAddress: address,
        amount,
        symbol: 'ETH',
        name: 'Ethereum'
      };
      
      const result = await api.post('/dca/simulate/transaction', data);
      setSimulationSuccess(`Successfully simulated transaction for schedule ${scheduleId}`);
      console.log('Simulated transaction:', result);
    } catch (error) {
      console.error('Error simulating transaction:', error);
      setError(`Failed to simulate transaction`);
    } finally {
      setSimulationLoading(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading your DCA schedules...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (schedules.length === 0) {
    return (
      <div className="no-dcas">
        No active DCAs found for address: {address.slice(0, 6)}...{address.slice(-4)}
      </div>
    );
  }

  // Helper function to format the interval in a human-readable way
  const formatInterval = (seconds: number) => {
    if (seconds === 10) return `10 seconds (Test)`;
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  return (
    <div className="schedules-list">
      {simulationSuccess && (
        <div className="success-message">{simulationSuccess}</div>
      )}
      
      {schedules.map((schedule) => {
        // Ensure we have a unique key by using _id if available, falling back to scheduleId
        const uniqueKey = schedule._id || schedule.scheduleId;
        return (
          <div key={uniqueKey} className="schedule-item">
            <div className="schedule-header">
              <span className={`status-badge ${schedule.active ? 'active' : 'inactive'}`}>
                {schedule.active ? 'Active' : 'Inactive'}
              </span>
              <span className="schedule-date">
                Created: {new Date(schedule.registeredAt).toLocaleDateString()}
              </span>
            </div>
            <div className="schedule-details">
              <div>Schedule ID: {schedule.scheduleId || schedule._id}</div>
              <div>Amount: ${schedule.purchaseAmount} USDC</div>
              <div>Frequency: Every {formatInterval(schedule.purchaseIntervalSeconds)}</div>
            </div>
            <div className="schedule-actions">
              <button 
                onClick={() => toggleScheduleStatus(schedule._id || schedule.scheduleId, schedule.active)}
                className={`toggle-btn ${schedule.active ? 'deactivate' : 'activate'}`}
              >
                {schedule.active ? 'Deactivate' : 'Activate'}
              </button>
              
              <button 
                onClick={() => simulateTransaction(schedule._id || schedule.scheduleId, schedule.purchaseAmount)}
                className="simulate-btn"
                disabled={simulationLoading === (schedule._id || schedule.scheduleId)}
              >
                {simulationLoading === (schedule._id || schedule.scheduleId) ? 'Simulating...' : 'Simulate Transaction'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}