import { useRouter } from 'next/router';

export function ApproveView() {
  const router = useRouter();

  const handleApprove = () => {
    router.push({
      pathname: '/',
      query: {
        managementWallet: '0xD4383c15158B11a4Fa51F489ABCB3D4E43511b0a',
        roleId: 'a5b83467-4ac9-49b6-b45c-28552f51b026'
      }
    });
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
          To get started, please approve the agent to manage your DCA schedules.
        </p>
      </div>
      <button className="approve-btn" onClick={handleApprove}>
        Approve Agent
      </button>
      <div className="footer-text">
        Powered by <a href="https://lit.protocol" target="_blank" rel="noopener noreferrer">LIT Protocol</a>
      </div>
    </div>
  );
}