export function ApproveView() {
  const handleApprove = () => {
    // Use the exact redirect URI that's mentioned in the error message
    // This ensures we're using the format that's already authorized
    const redirectUri = encodeURIComponent("https://localhost:3001");
    
    // Redirect to Vincent Auth consent page with appId=7, version=1, and redirect_uri
    window.location.href = `https://dashboard.heyvincent.ai/consent/?appId=7&redirectUri=vincent-dca-hl6j.vercel.app`;
  };

  return (
    <div className="welcome-card">
      <div className="welcome-header">
        <h1>Memecoin DCA</h1>
        <p>Automated Dollar-Cost Averaging for Cryptocurrency</p>
      </div>
      <div className="welcome-content">
        <p>
          Welcome to the Vincent DCA service. This application allows you to set up 
          automated dollar-cost averaging for your cryptocurrency investments.
        </p>
        <p>
          To get started, please authenticate with Vincent to manage your DCA schedules.
        </p>
      </div>
      <button className="approve-btn" onClick={handleApprove}>
        Authenticate with Vincent
      </button>
      <div className="footer-text">
        Powered by <a href="https://lit.protocol" target="_blank" rel="noopener noreferrer">LIT Protocol</a>
      </div>
      
      <style jsx>{`
        .welcome-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          padding: 24px;
          max-width: 500px;
          margin: 0 auto;
          text-align: center;
        }
        
        .welcome-header h1 {
          color: #333;
          margin-bottom: 8px;
        }
        
        .welcome-header p {
          color: #666;
          margin-bottom: 24px;
        }
        
        .welcome-content {
          margin-bottom: 24px;
          text-align: left;
        }
        
        .approve-btn {
          background-color: #3f51b5;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 12px 24px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
          width: 100%;
          margin-bottom: 12px;
        }
        
        .approve-btn:hover {
          background-color: #303f9f;
        }
        
        .footer-text {
          margin-top: 24px;
          font-size: 14px;
          color: #666;
        }
        
        .footer-text a {
          color: #3f51b5;
          text-decoration: none;
        }
        
        .footer-text a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}