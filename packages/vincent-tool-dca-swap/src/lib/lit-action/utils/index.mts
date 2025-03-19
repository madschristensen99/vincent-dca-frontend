import { ethers } from 'ethers';

// Get the Vincent Agent Registry contract
export async function getVincentAgentRegistryContract(rpcUrl: string) {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const vincentAgentRegistryAddress = '0xaE7C442E8d8A6dc07C02A6f41333C2480F28b430';
  
  const vincentAgentRegistryAbi = [
    'function getAgentPkpInfo(address pkpAddress) view returns (tuple(address pkpAddress, string publicKey, address owner, bool isRevoked, bool isServiceProvider))',
    'function isServiceProvider(address pkpAddress) view returns (bool)'
  ];
  
  return new ethers.Contract(
    vincentAgentRegistryAddress,
    vincentAgentRegistryAbi,
    provider
  );
}

// Get PKP info from the PKP address
export async function getPkpInfo(pkpAddress: string) {
  // In a real implementation, this would query the PKP registry
  // For now, we'll return a mock PKP info object
  return {
    pkpAddress,
    publicKey: '0x04' + pkpAddress.substring(2), // Mock public key
    owner: '0x0000000000000000000000000000000000000000',
    isRevoked: false,
    isServiceProvider: true
  };
}

// Get token info (symbol, decimals, etc.)
export async function getTokenInfo(provider: any, tokenAddress: string) {
  // Handle ETH as a special case
  if (tokenAddress.toLowerCase() === 'eth') {
    return {
      address: 'eth',
      symbol: 'ETH',
      decimals: 18
    };
  }
  
  // For other tokens, query the contract
  const tokenContract = new ethers.Contract(
    tokenAddress,
    [
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function balanceOf(address) view returns (uint256)'
    ],
    provider
  );
  
  const [symbol, decimals] = await Promise.all([
    tokenContract.symbol(),
    tokenContract.decimals()
  ]);
  
  return {
    address: tokenAddress,
    symbol,
    decimals
  };
}

// Get Uniswap router and quoter addresses for the given chain
export function getUniswapQuoterRouter(chainId: string) {
  // Default to Base Sepolia addresses
  let UNISWAP_V3_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
  let UNISWAP_V3_ROUTER = '0x4752ba5DBc23F44D41AAe9AE3EE0Bf8A5791F83c';
  
  // You can add more chain-specific addresses here
  if (chainId === '84532') { // Base Sepolia
    UNISWAP_V3_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
    UNISWAP_V3_ROUTER = '0x4752ba5DBc23F44D41AAe9AE3EE0Bf8A5791F83c';
  } else if (chainId === '8453') { // Base Mainnet
    UNISWAP_V3_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
    UNISWAP_V3_ROUTER = '0x4752ba5DBc23F44D41AAe9AE3EE0Bf8A5791F83c';
  }
  
  return { UNISWAP_V3_QUOTER, UNISWAP_V3_ROUTER };
}

// Get the best quote for a swap
export async function getBestQuote(provider: any, quoterAddress: string, amountIn: any, outputDecimals: number) {
  // In a real implementation, this would query the Uniswap quoter contract
  // For now, we'll return a mock quote
  
  // Mock quote calculation (1 ETH = 420 BDOGE)
  const mockQuote = amountIn.mul(420);
  
  return {
    bestQuote: mockQuote,
    bestPool: '0x0000000000000000000000000000000000000000',
    bestFee: 3000
  };
}

// Get gas data for the transaction
export async function getGasData(provider: any, address: string) {
  const feeData = await provider.getFeeData();
  
  return {
    gasPrice: feeData.gasPrice,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
  };
}

// Estimate gas limit for a transaction
export async function estimateGasLimit(provider: any, tx: any) {
  // In a real implementation, this would estimate the gas limit
  // For now, we'll return a default gas limit
  return ethers.BigNumber.from(300000);
}

// Create a transaction
export async function createTransaction(provider: any, from: string, to: string, data: string, value: any, gasLimit: any) {
  // In a real implementation, this would create a transaction
  // For now, we'll return a mock transaction
  return {
    from,
    to,
    data,
    value,
    gasLimit,
    nonce: await provider.getTransactionCount(from)
  };
}

// Sign a transaction
export async function signTx(wallet: any, tx: any) {
  // In a real implementation, this would sign the transaction
  // For now, we'll return a mock signed transaction
  return await wallet.signTransaction(tx);
}

// Broadcast a transaction
export async function broadcastTransaction(provider: any, signedTx: string) {
  // In a real implementation, this would broadcast the transaction
  // For now, we'll return a mock transaction hash
  return await provider.sendTransaction(signedTx);
}

// Get token price from an oracle
export async function getTokenPrice(tokenAddress: string, chainId: string) {
  // In a real implementation, this would query a price oracle
  // For now, we'll return mock prices
  if (tokenAddress.toLowerCase() === 'eth') {
    return '1800'; // $1800 per ETH
  }
  
  return '0.00428'; // $0.00428 per BDOGE
}

// Calculate USD value of a token amount
export async function calculateUsdValue(amountWei: string, tokenPrice: string, decimals: number) {
  const amount = ethers.utils.formatUnits(amountWei, decimals);
  const usdValue = parseFloat(amount) * parseFloat(tokenPrice);
  
  // Convert to wei for consistent handling
  return ethers.utils.parseEther(usdValue.toString());
}

// Get the spending limits contract
export function getSpendingLimitsContract(provider: any, contractAddress: string) {
  const spendingLimitsAbi = [
    'function checkSpendingLimit(address pkpAddress, uint256 usdValue) view returns (bool)',
    'function recordSpend(address pkpAddress, uint256 usdValue)'
  ];
  
  return new ethers.Contract(
    contractAddress,
    spendingLimitsAbi,
    provider
  );
}

// Check if a transaction is within spending limits
export async function checkSpendingLimit(contract: any, pkpAddress: string, usdValue: any) {
  try {
    // In a real implementation, this would check the spending limit
    // For now, we'll always return true
    return true;
  } catch (error) {
    console.error('Error checking spending limit:', error);
    return false;
  }
}

// Record a spend in the spending limits contract
export async function recordSpend(contract: any, usdValue: any, wallet: any) {
  try {
    // In a real implementation, this would record the spend
    // For now, we'll just log it
    console.log(`Recording spend of $${ethers.utils.formatEther(usdValue)} for ${wallet.address}`);
    return true;
  } catch (error) {
    console.error('Error recording spend:', error);
    return false;
  }
}
