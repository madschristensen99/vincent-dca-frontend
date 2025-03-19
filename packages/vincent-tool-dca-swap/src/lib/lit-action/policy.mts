import { ethers } from 'ethers';
import { checkLitAuthAddressIsDelegatee, getPkpToolRegistryContract } from '@lit-protocol/aw-tool';

// Define global variables that will be injected by Lit
declare global {
  // @ts-ignore
  const privateKey: string;
  // @ts-ignore
  const rpcUrl: string;
  // @ts-ignore
  const chainId: string;
  // @ts-ignore
  const tokenIn: string;
  // @ts-ignore
  const tokenOut: string;
  // @ts-ignore
  const amountIn: string;
  // @ts-ignore
  const spendingLimitContractAddress: string;
  // @ts-ignore
  const allowedTokens: string[] | undefined;
  
  const pkpToolRegistryContractAddress: string;
  interface LitActionParamsExtended {
    privateKey: string;
    rpcUrl: string;
    chainId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    spendingLimitContractAddress?: string;
    allowedTokens?: string[];
  }
}

// @ts-ignore
const Lit = globalThis.LitActions;

// Access parameters directly as global variables with optional chaining for safety
// @ts-ignore
const litActionParams: LitActionParamsExtended = {
  privateKey: privateKey || '',
  rpcUrl: rpcUrl || '',
  chainId: chainId || '',
  tokenIn: tokenIn || '',
  tokenOut: tokenOut || '',
  amountIn: amountIn || '',
  spendingLimitContractAddress: spendingLimitContractAddress || '',
  allowedTokens: allowedTokens || []
};

console.log(`DCA Policy - parameters received: ${JSON.stringify({
  rpcUrl: litActionParams.rpcUrl,
  chainId: litActionParams.chainId,
  tokenIn: litActionParams.tokenIn,
  tokenOut: litActionParams.tokenOut,
  amountIn: litActionParams.amountIn,
  spendingLimitContractAddress: litActionParams.spendingLimitContractAddress,
  allowedTokens: litActionParams.allowedTokens,
  privateKeyAvailable: !!litActionParams.privateKey
}, null, 2)}`);

// Define the Tool and Policy structures according to the schema
interface Policy {
  policyIpfsCid: string;
  policySchemaIpfsCid: string;
  parameterNames: string[];
}

interface Tool {
  toolIpfsCid: string;
  policies: Policy[];
}

// Utility functions
function getSpendingLimitsContract(provider: any, contractAddress: string) {
  const spendingLimitsAbi = [
    'function checkSpendingLimit(address userAddress, uint256 usdValue) view returns (bool)',
    'function recordSpend(address userAddress, uint256 usdValue)',
    'function get24HourSpend(address userAddress) view returns (uint256)',
    'function getTool(string toolIpfsCid) view returns (tuple(string toolIpfsCid, tuple(string policyIpfsCid, string policySchemaIpfsCid, string[] parameterNames)[] policies))',
    'function addTool(tuple(string toolIpfsCid, tuple(string policyIpfsCid, string policySchemaIpfsCid, string[] parameterNames)[] policies) tool)',
    'function updateTool(tuple(string toolIpfsCid, tuple(string policyIpfsCid, string policySchemaIpfsCid, string[] parameterNames)[] policies) tool)'
  ];
  
  return new ethers.Contract(
    contractAddress,
    spendingLimitsAbi,
    provider
  );
}

async function getTokenPrice(tokenAddress: string, chainId: string) {
  if (tokenAddress.toLowerCase() === 'eth') {
    return '1800'; 
  }
  return '0.00428'; 
}

async function calculateUsdValue(amountWei: string, tokenPrice: string, decimals: number) {
  const amount = ethers.utils.formatUnits(amountWei, decimals);
  const usdValue = parseFloat(amount) * parseFloat(tokenPrice);
  return ethers.utils.parseEther(usdValue.toString());
}

// Main policy execution function
(async () => {
  try {
    console.log(`DCA Policy - litActionParams: ${JSON.stringify(litActionParams, null, 2)}`);

    const DEFAULT_SPENDING_LIMIT_CONTRACT = '0xC95a138aC46765780746a2C18CBc32502fC5064D'; 
    const spendingLimitContractAddress = litActionParams.spendingLimitContractAddress || DEFAULT_SPENDING_LIMIT_CONTRACT;
    
    const provider = new ethers.providers.JsonRpcProvider(litActionParams.rpcUrl);
    
    const wallet = new ethers.Wallet(
      litActionParams.privateKey,
      provider
    );
    console.log(`Wallet Address: ${wallet.address}`);

    if (litActionParams.allowedTokens && litActionParams.allowedTokens.length > 0) {
      const tokenInAddr = ethers.utils.getAddress(litActionParams.tokenIn);
      if (!litActionParams.allowedTokens.includes(tokenInAddr)) {
        throw new Error(`Input token ${tokenInAddr} not in allowed tokens list: ${litActionParams.allowedTokens.join(', ')}`);
      }
    }

    const spendingLimitsContract = getSpendingLimitsContract(provider, spendingLimitContractAddress);
    
    const tokenInAddress = litActionParams.tokenIn;
    const tokenInDecimals = tokenInAddress.toLowerCase() === 'eth' ? 18 : 18;
    const tokenInPrice = await getTokenPrice(tokenInAddress, litActionParams.chainId);
    console.log(`Token price: $${tokenInPrice}`);
    
    const amountInWei = ethers.utils.parseUnits(litActionParams.amountIn, tokenInDecimals);
    const usdValue = await calculateUsdValue(amountInWei.toString(), tokenInPrice, tokenInDecimals);
    console.log(`USD Value: $${ethers.utils.formatEther(usdValue)}`);
    
    const spentLast24Hours = await spendingLimitsContract.get24HourSpend(wallet.address);
    const newTotal24HourSpend = spentLast24Hours.add(usdValue);
    const MAX_24_HOUR_USD_LIMIT = ethers.utils.parseEther("1000"); 
    
    if (newTotal24HourSpend.gt(MAX_24_HOUR_USD_LIMIT)) {
      throw new Error(
        `24-hour spending limit exceeded. Current 24-hour spend: $${ethers.utils.formatEther(spentLast24Hours)}, ` +
        `New transaction: $${ethers.utils.formatEther(usdValue)}, ` +
        `Total would be: $${ethers.utils.formatEther(newTotal24HourSpend)}, ` +
        `Limit: $${ethers.utils.formatEther(MAX_24_HOUR_USD_LIMIT)}`
      );
    }

    const isWithinLimit = await spendingLimitsContract.checkSpendingLimit(
      wallet.address,
      usdValue
    );
    
    if (!isWithinLimit) {
      throw new Error(`Transaction exceeds overall spending limit. USD Value: $${ethers.utils.formatEther(usdValue)}`);
    }
    
    console.log(`DCA transaction is within all spending limits. Proceeding with swap...`);
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'success',
        message: 'DCA transaction approved - all policy checks passed',
        usdValue: ethers.utils.formatEther(usdValue),
        spentLast24Hours: ethers.utils.formatEther(spentLast24Hours),
        walletAddress: wallet.address
      })
    });
  } catch (err: any) {
    console.error('DCA Policy Error:', err);
    
    const errorDetails = {
      message: err.message || 'Unknown error occurred during policy execution',
      code: err.code,
      reason: err.reason
    };
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'error',
        error: errorDetails
      })
    });
  }
})();
