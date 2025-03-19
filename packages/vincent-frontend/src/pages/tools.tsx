import React from 'react';
import { ERC20TransferTool } from '../components/ERC20TransferTool';
import Link from 'next/link';

export const ToolsPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Vincent Tools</h1>
      
      <div className="mb-6">
        <div className="flex flex-wrap gap-4">
          <Link href="/spending-limit-swap">
            <a className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded">
              Spending Limit Swap
            </a>
          </Link>
          <Link href="/spending-limits-test">
            <a className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded">
              Spending Limits Test
            </a>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ERC20TransferTool />
        {/* Add other tools here as needed */}
      </div>
    </div>
  );
};

export default ToolsPage;
