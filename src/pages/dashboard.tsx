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
  const [autoRefresh, setAutoRefresh] = useState(true);

  // JWT token for authentication
  const [jwtToken] = useState<string | null>(MOCK_JWT);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
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
    
    // Set up auto-refresh if enabled
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);
  
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
              <div key={index} className={`log-entry ${getLogTypeClass(log.type)}`}>
                <div className="log-header">
                  <span className="timestamp">{log.timestamp ? formatTimestamp(log.timestamp) : 'N/A'}</span>
                  <span className={`type ${getLogTypeClass(log.type)}`}>{log.type || 'INFO'}</span>
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
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          color: #333;
          background-color: #f9f9f9;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        h1 {
          color: #2e7d6e;
          margin-bottom: 30px;
          font-weight: 600;
          text-align: center;
          padding-bottom: 15px;
          border-bottom: 1px solid #eaeaea;
        }
        
        h2 {
          color: #333;
          margin-bottom: 20px;
          font-weight: 500;
          border-left: 4px solid #2e7d6e;
          padding-left: 10px;
        }
        
        .status-section, .logs-section {
          margin-bottom: 40px;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .actions {
          display: flex;
          margin-bottom: 20px;
          justify-content: flex-end;
        }
        
        .refresh-btn, .back-btn {
          padding: 10px 16px;
          margin-right: 10px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .refresh-btn {
          background-color: #4caf50;
          color: white;
          border: none;
        }
        
        .refresh-btn:hover {
          background-color: #45a049;
        }
        
        .refresh-btn:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .back-btn {
          background-color: #f5f5f5;
          color: #333;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #ddd;
        }
        
        .back-btn:hover {
          background-color: #e8e8e8;
        }
        
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          color: #666;
          font-style: italic;
        }
        
        .error-message {
          background-color: #ffebee;
          color: #c62828;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
          border-left: 4px solid #c62828;
        }
        
        .status-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background-color: #e0f2f1;
          border-bottom: 1px solid #b2dfdb;
        }
        
        .status-header h3 {
          margin: 0;
          color: #2e7d6e;
          font-weight: 500;
        }
        
        .status-badge {
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .status-badge.running {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .status-badge.stopped {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .status-badge.unknown {
          background-color: #f5f5f5;
          color: #757575;
        }
        
        .status-details {
          padding: 15px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .status-details p {
          margin: 0;
          color: #666;
        }
        
        .endpoints-section {
          padding: 15px;
        }
        
        .endpoints-section h4 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #2e7d6e;
          font-weight: 500;
        }
        
        .endpoints-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .endpoint-item {
          padding: 10px;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .endpoint-item:last-child {
          border-bottom: none;
        }
        
        .method {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-right: 10px;
          min-width: 60px;
          text-align: center;
          text-transform: uppercase;
        }
        
        .method.get {
          background-color: #e0f2f1;
          color: #00796b;
        }
        
        .method.post {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .method.put, .method.patch {
          background-color: #fff8e1;
          color: #f57f17;
        }
        
        .method.delete {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .method.unknown {
          background-color: #f5f5f5;
          color: #757575;
        }
        
        .path {
          font-family: monospace;
          color: #333;
          margin-right: 10px;
          font-size: 14px;
          font-weight: 500;
        }
        
        .description {
          color: #666;
          font-size: 14px;
          flex: 1;
          margin-top: 5px;
          width: 100%;
        }
        
        .logs-container {
          max-height: 600px;
          overflow-y: auto;
          border: 1px solid #b2dfdb;
          border-radius: 8px;
          background-color: #e0f2f1;
        }
        
        .log-entry {
          padding: 15px;
          border-bottom: 1px solid #b2dfdb;
          background-color: #f5f5f5;
        }
        
        .log-entry:last-child {
          border-bottom: none;
        }
        
        .log-entry.error {
          background-color: #ffebee;
          border-left: 4px solid #c62828;
        }
        
        .log-entry.warn {
          background-color: #fff8e1;
          border-left: 4px solid #f57f17;
        }
        
        .log-entry.info {
          background-color: #e0f2f1;
          border-left: 4px solid #00796b;
        }
        
        .log-entry.debug {
          background-color: #e8f5e9;
          border-left: 4px solid #2e7d32;
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
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .type.error {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .type.warn {
          background-color: #fff8e1;
          color: #f57f17;
        }
        
        .type.info {
          background-color: #e0f2f1;
          color: #00796b;
        }
        
        .type.debug {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .log-message {
          margin-bottom: 10px;
          word-break: break-word;
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
          font-style: italic;
          background-color: #e0f2f1;
        }
        
        @media (max-width: 768px) {
          .status-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .status-badge {
            margin-top: 10px;
          }
          
          .endpoint-item {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .method, .path {
            margin-bottom: 5px;
          }
        }
      `}</style>
    </div>
  );
}
