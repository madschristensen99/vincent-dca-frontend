import { useEffect, useState } from 'react';
import api from '../utils/api';
import Link from 'next/link';

// Define the backend API URL
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vincent-dca-service.herokuapp.com';

interface Log {
  timestamp: string;
  type: string;
  message: string;
  data?: string;
}

interface ServerStatus {
  status: string;
  timestamp: string;
}

export default function Dashboard() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch server status
      const status = await api.get('/health');
      setServerStatus(status);
      
      // Fetch logs
      const logs = await api.get('/admin/logs');
      setLogs(logs.logs || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLogs();
    
    // Set up polling interval
    const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);
  
  const getLogTypeClass = (type: string) => {
    switch (type.toUpperCase()) {
      case 'ERROR':
        return 'log-error';
      case 'WARNING':
        return 'log-warning';
      case 'INFO':
        return 'log-info';
      default:
        return '';
    }
  };
  
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Vincent DCA Service Dashboard</h1>
        <div className="actions">
          <Link href="/" className="back-link">
            Back to DCA Management
          </Link>
          <button onClick={fetchLogs} className="refresh-btn" disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <label className="auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={() => setAutoRefresh(!autoRefresh)}
            />
            Auto-refresh
          </label>
        </div>
      </header>
      
      <div className="dashboard-content">
        <div className="server-status card">
          <h2>Server Status</h2>
          {serverStatus ? (
            <div className="status-info">
              <div className={`status-indicator ${serverStatus.status === 'ok' ? 'online' : 'offline'}`}>
                {serverStatus.status === 'ok' ? 'Online' : 'Offline'}
              </div>
              <div className="status-timestamp">
                Last updated: {new Date(serverStatus.timestamp).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="status-loading">Checking server status...</div>
          )}
        </div>
        
        <div className="server-logs card">
          <h2>Server Logs</h2>
          {error && <div className="error">{error}</div>}
          
          {loading && logs.length === 0 ? (
            <div className="loading">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="no-logs">No logs available</div>
          ) : (
            <div className="logs-container">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Message</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={index} className={getLogTypeClass(log.type)}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>{log.type}</td>
                      <td>{log.message}</td>
                      <td>{log.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
