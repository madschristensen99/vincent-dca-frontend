import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ApproveView } from '../components/ApproveView';
import { DCAManagement } from '../components/DCAManagement';

export default function Home() {
  const router = useRouter();
  const [pkpAddress, setPkpAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    
    const address = router.query.managementWallet as string;
    if (address) {
      setPkpAddress(address);
    }
  }, [router.isReady, router.query]);

  return (
    <div className="container">
      {pkpAddress ? <DCAManagement walletAddress={pkpAddress} /> : <ApproveView />}
    </div>
  );
} 