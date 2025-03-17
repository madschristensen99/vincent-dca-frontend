import {
  getVincentAgentRegistryContract,
  getPkpInfo,
  getBestQuote,
  getUniswapQuoterRouter,
  getTokenInfo,
  getGasData,
  estimateGasLimit,
  createTransaction,
  signTx,
  broadcastTransaction,
} from './utils/index.mts';

declare global {
  // Injected By Lit
  const Lit: any;
  const LitAuth: any;
  const ethers: any;
  const litActionParams: {
    pkpEthAddress: string;
    rpcUrl: string;
    chainId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
  };
}

// ABI for SpendingLimits contract
const SPENDING_LIMITS_ABI = [
    {
      "type": "function",
      "name": "checkLimit",
      "inputs": [
        {"name": "user", "type": "address", "internalType": "address"},
        {"name": "amount", "type": "uint256", "internalType": "uint256"}
      ],
      "outputs": [
        {"name": "", "type": "bool", "internalType": "bool"}
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "limit",
      "inputs": [],
      "outputs": [
        {"name": "", "type": "uint256", "internalType": "uint256"}
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "period",
      "inputs": [],
      "outputs": [
        {"name": "", "type": "uint256", "internalType": "uint256"}
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "pruneOldSpends",
      "inputs": [
        {"name": "user", "type": "address", "internalType": "address"}
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "spend",
      "inputs": [
        {"name": "amount", "type": "uint256", "internalType": "uint256"}
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "spends",
      "inputs": [
        {"name": "", "type": "address", "internalType": "address"},
        {"name": "", "type": "uint256", "internalType": "uint256"}
      ],
      "outputs": [
        {"name": "amount", "type": "uint256", "internalType": "uint256"},
        {"name": "timestamp", "type": "uint256", "internalType": "uint256"}
      ],
      "stateMutability": "view"
    },
    {
      "type": "error",
      "name": "SpendLimitExceeded",
      "inputs": [
        {"name": "user", "type": "address", "internalType": "address"},
        {"name": "amount", "type": "uint256", "internalType": "uint256"}
      ]
    }
  ];

// Function to fetch token price in USD from DexScreener
async function getTokenPriceInUSD(tokenAddress: string): Promise<number> {
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
  const data = await response.json();
  if (data.pairs && data.pairs.length > 0) {
    return parseFloat(data.pairs[0].priceUsd);
  }
  throw new Error('Token price not found');
}

(async () => {
  try {
    console.log(`litActionParams: ${JSON.stringify(litActionParams, null, 2)}`);

    const LIT_NETWORK = 'datil';
    const VINCENT_AGENT_REGISTRY_ADDRESS = '0xaE7C442E8d8A6dc07C02A6f41333C2480F28b430';
    const SPENDING_LIMITS_ADDRESS = '0xdAAe7CE713313b2C62eC5284DD3f3F7f4bA95332';

    console.log(`Using Lit Network: ${LIT_NETWORK}`);
    console.log(`Using Vincent Agent Registry Address: ${VINCENT_AGENT_REGISTRY_ADDRESS}`);
    console.log(`Using Spending Limits Address: ${SPENDING_LIMITS_ADDRESS}`);

    const delegateeAddress = ethers.utils.getAddress(LitAuth.authSigAddress);
    const vincentAgentRegistryContract = await getVincentAgentRegistryContract(
      VINCENT_AGENT_REGISTRY_ADDRESS
    );

    const pkp = await getPkpInfo(litActionParams.pkpEthAddress);

    console.log(
      `Getting App for delegatee ${delegateeAddress} and PKP ${pkp.tokenId}...`
    );
    const app = await vincentAgentRegistryContract.getAppByDelegateeForAgentPkp(
      delegateeAddress,
      pkp.tokenId
    );
    console.log(`Got the App: ${JSON.stringify(app, null, 2)}`);

    if (!app.isEnabled) {
      throw new Error('App is not enabled');
    }

    const toolIpfsCid = LitAuth.actionIpfsIds[0];
    console.log(
      `Checking if tool ${toolIpfsCid} is permitted for PKP. Permitted tools: ${app.toolIpfsCids}`
    );
    const toolIndex = app.toolIpfsCids.indexOf(toolIpfsCid);
    if (toolIndex === -1) {
      throw new Error('Tool is not permitted for this PKP');
    }
    if (!app.toolEnabled[toolIndex]) {
      throw new Error('Tool is not enabled');
    }

    console.log('Starting tool policy check...');

    const policyParameterNames = app.policyParamNames[toolIndex];
    console.log(`Policy parameter names: ${policyParameterNames}`);

    const policyParameterValues = app.policyValues[toolIndex];
    console.log(`Policy parameter values: ${policyParameterValues}`);

    let maxAmountUSD: any;

    for (const [i, parameterName] of policyParameterNames.entries()) {
      switch (parameterName) {
        case 'maxAmountUSD':
          maxAmountUSD = ethers.BigNumber.from(policyParameterValues[i]);
          console.log(`Formatted maxAmountUSD: ${maxAmountUSD.toString()}`);
          break;
        default:
          throw new Error(
            `Unsupported policy parameter name: ${parameterName}`
          );
      }
    }

    const amountInBigNumber = ethers.BigNumber.from(
      ethers.utils.parseEther(litActionParams.amountIn)
    );

    // Fetch token prices in USD
    const tokenInPriceUSD = await getTokenPriceInUSD(litActionParams.tokenIn);
    const tokenOutPriceUSD = await getTokenPriceInUSD(litActionParams.tokenOut);

    // Convert amountIn to USD
    const amountInUSD = amountInBigNumber.mul(ethers.utils.parseUnits(tokenInPriceUSD.toString(), 18)).div(ethers.constants.WeiPerEther);
    console.log(
      `Checking if amount in USD ${amountInUSD.toString()} exceeds maxAmountUSD ${maxAmountUSD.toString()}...`
    );

    if (amountInUSD.gt(maxAmountUSD)) {
      throw new Error(
        `Amount in USD ${ethers.utils.formatUnits(
          amountInUSD
        )} exceeds the maximum amount in USD ${ethers.utils.formatUnits(maxAmountUSD)}`
      );
    }

    console.log('Tool policy check passed');

    console.log('Starting tool execution...');

    const provider = new ethers.providers.JsonRpcProvider(
      litActionParams.rpcUrl
    );

    // Initialize SpendingLimits contract
    const spendingLimitsContract = new ethers.Contract(
      SPENDING_LIMITS_ADDRESS,
      SPENDING_LIMITS_ABI,
      provider
    );

    // Check daily spending limit in USD
    console.log(
      `Checking daily spending limit for ${pkp.ethAddress} with amount in USD ${amountInUSD.toString()}...`
    );
    const canSpend = await spendingLimitsContract.checkLimit(
      pkp.ethAddress,
      amountInUSD
    );
    if (!canSpend) {
      throw new Error('Daily spending limit exceeded');
    }

    const { UNISWAP_V3_QUOTER, UNISWAP_V3_ROUTER } = getUniswapQuoterRouter(
      litActionParams.chainId
    );

    const tokenInfo = await getTokenInfo(
      provider,
      litActionParams.tokenIn,
      litActionParams.amountIn,
      litActionParams.tokenOut,
      pkp
    );

    // Get best quote and calculate minimum output
    const { bestFee, amountOutMin } = await getBestQuote(
      provider,
      UNISWAP_V3_QUOTER,
      tokenInfo.tokenIn.amount,
      tokenInfo.tokenOut.decimals
    );

    // Get gas data for transactions
    const gasData = await getGasData(provider, pkp.ethAddress);

    // Approval Transaction
    const approvalGasLimit = await estimateGasLimit(
      provider,
      pkp.ethAddress,
      UNISWAP_V3_ROUTER,
      tokenInfo.tokenIn.contract,
      tokenInfo.tokenIn.amount,
      true
    );

    const approvalTx = await createTransaction(
      UNISWAP_V3_ROUTER,
      pkp.ethAddress,
      approvalGasLimit,
      tokenInfo.tokenIn.amount,
      gasData,
      true
    );

    const signedApprovalTx = await signTx(
      pkp.publicKey,
      approvalTx,
      'erc20ApprovalSig'
    );
    const approvalHash = await broadcastTransaction(provider, signedApprovalTx);
    console.log('Approval transaction hash:', approvalHash);

    // Wait for approval confirmation
    console.log('Waiting for approval confirmation...');
    const approvalConfirmation = await provider.waitForTransaction(
      approvalHash,
      1
    );
    if (approvalConfirmation.status === 0) {
      throw new Error('Approval transaction failed');
    }

    // Swap Transaction
    const swapGasLimit = await estimateGasLimit(
      provider,
      pkp.ethAddress,
      UNISWAP_V3_ROUTER,
      tokenInfo.tokenIn.contract,
      tokenInfo.tokenIn.amount,
      false,
      { fee: bestFee, amountOutMin }
    );

    const swapTx = await createTransaction(
      UNISWAP_V3_ROUTER,
      pkp.ethAddress,
      swapGasLimit,
      tokenInfo.tokenIn.amount,
      { ...gasData, nonce: gasData.nonce + 1 },
      false,
      { fee: bestFee, amountOutMin }
    );

    const signedSwapTx = await signTx(pkp.publicKey, swapTx, 'erc20SwapSig');
    const swapHash = await broadcastTransaction(provider, signedSwapTx);
    console.log('Swap transaction hash:', swapHash);

    // Update spending record after successful swap
    console.log('Updating spending record...');
    const spendTx = await spendingLimitsContract.spend(amountInUSD);
    const spendTxHash = await broadcastTransaction(provider, spendTx);
    console.log('Spend transaction hash:', spendTxHash);

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'success',
        approvalHash,
        swapHash,
        spendTxHash,
      }),
    });
  } catch (err: any) {
    console.error('Error:', err);

    // Extract detailed error information
    const errorDetails = {
      message: err.message,
      code: err.code,
      reason: err.reason,
      error: err.error,
      ...(err.transaction && { transaction: err.transaction }),
      ...(err.receipt && { receipt: err.receipt }),
    };

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'error',
        error: err.message || String(err),
        details: errorDetails,
      }),
    });
  }
})();
