import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BACKEND_API_URL, createAuthHeaders, MOCK_JWT } from '../config';

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

export default function Dashboard() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // JWT token for authentication
  const [jwtToken] = useState<string | null>(MOCK_JWT);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch server status
      const statusResponse = await fetch(`${BACKEND_API_URL}/health`, {
        headers: createAuthHeaders(jwtToken || undefined)
      });
      
      if (!statusResponse.ok) {
        throw new Error(`Error fetching server status: ${statusResponse.statusText}`);
      }
      
      const statusData = await statusResponse.json();
      setStatus(statusData);
      
      // Fetch logs
      const logsResponse = await fetch(`${BACKEND_API_URL}/admin/logs`, {
        headers: createAuthHeaders(jwtToken || undefined)
      });
      
      if (!logsResponse.ok) {
        throw new Error(`Error fetching logs: ${logsResponse.statusText}`);
      }
      
      const logsData = await logsResponse.json();
      setLogs(logsData.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Set up polling
    let interval: NodeJS.Timeout;
    if (!error) {
      interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [error]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="dashboard-container">
      <h1>Vincent DCA Service Dashboard</h1>
      
      <div className="status-section">
        <h2>Server Status</h2>
        <div className="actions">
          <button onClick={fetchLogs} className="refresh-btn" disabled={loading}>
            Refresh
          </button>
          <Link href="/" className="back-btn">
            Back to App
          </Link>
        </div>
        
        {loading && <div className="loading">Loading...</div>}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {status && (
          <div className="status-card">
            <div className="status-header">
              <h3>{status.service || 'Service'}</h3>
              <span className={`status-badge ${status.status || 'unknown'}`}>
                {status.status || 'Unknown'}
              </span>
            </div>
            <div className="status-details">
              <p>Last updated: {status.timestamp ? formatTimestamp(status.timestamp) : 'N/A'}</p>
            </div>
            
            <div className="endpoints-section">
              <h4>Available Endpoints</h4>
              <ul className="endpoints-list">
                {status && status.endpoints && status.endpoints.map((endpoint, index) => (
                  <li key={index} className="endpoint-item">
                    <span className={`method ${endpoint.method ? endpoint.method.toLowerCase() : 'unknown'}`}>
                      {endpoint.method || 'UNKNOWN'}
                    </span>
                    <span className="path">{endpoint.path || 'N/A'}</span>
                    <span className="description">{endpoint.description || 'No description available'}</span>
                  </li>
                ))}
                {(!status.endpoints || status.endpoints.length === 0) && (
                  <li className="endpoint-item">No endpoints available</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
      
      <div className="logs-section">
        <h2>Server Logs</h2>
        {logs && logs.length > 0 ? (
          <div className="logs-container">
            {logs.map((log, index) => (
              <div key={index} className={`log-entry ${log.type || 'info'}`}>
                <div className="log-header">
                  <span className="timestamp">{log.timestamp ? formatTimestamp(log.timestamp) : 'N/A'}</span>
                  <span className={`type ${log.type || 'info'}`}>{log.type || 'INFO'}</span>
                </div>
                <div className="log-message">{log.message || 'No message'}</div>
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
        
        .status-section, .logs-section {
          margin-bottom: 40px;
        }
        
        .actions {
          display: flex;
          margin-bottom: 20px;
        }
        
        .refresh-btn, .back-btn {
          padding: 8px 16px;
          margin-right: 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .refresh-btn {
          background-color: #4caf50;
          color: white;
          border: none;
        }
        
        .refresh-btn:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .back-btn {
          background-color: #f5f5f5;
          color: #333;
          text-decoration: none;
          display: inline-block;
        }
        
        .loading {
          padding: 20px;
          text-align: center;
          color: #666;
        }
        
        .error-message {
          padding: 15px;
          background-color: #ffebee;
          color: #c62828;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .status-card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 20px;
        }
        
        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .status-header h3 {
          margin: 0;
          color: #333;
        }
        
        .status-badge {
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }
        
        .status-badge.running {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .status-badge.stopped {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .endpoints-section {
          margin-top: 20px;
        }
        
        .endpoints-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .endpoint-item {
          display: flex;
          padding: 10px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .endpoint-item:last-child {
          border-bottom: none;
        }
        
        .method {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          margin-right: 10px;
          min-width: 60px;
          text-align: center;
        }
        
        .method.get {
          background-color: #e3f2fd;
          color: #1565c0;
        }
        
        .method.post {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .method.patch {
          background-color: #fff8e1;
          color: #f57f17;
        }
        
        .path {
          font-family: monospace;
          margin-right: 15px;
          color: #333;
        }
        
        .description {
          color: #666;
          font-size: 14px;
        }
        
        .logs-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 10px;
          max-height: 600px;
          overflow-y: auto;
        }
        
        .log-entry {
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 4px;
        }
        
        .log-entry.info {
          background-color: #f5f5f5;
        }
        
        .log-entry.error {
          background-color: #ffebee;
        }
        
        .log-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .timestamp {
          color: #666;
          font-size: 12px;
        }
        
        .type {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .type.info {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .type.error {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .log-message {
          margin-bottom: 10px;
          font-family: monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }
        
        .log-data {
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
          margin: 0;
        }
        
        .no-logs {
          padding: 20px;
          text-align: center;
          color: #666;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
