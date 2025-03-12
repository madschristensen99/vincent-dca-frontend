import { ethers } from 'ethers';

// ABI for a standard ERC20 token
const ERC20_ABI = [
  // Read-only functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  // Authenticated functions
  'function transfer(address to, uint amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

// ABI for a standard DEX router (like Uniswap)
const DEX_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)'
];

// Interface for token purchase options
export interface TokenPurchaseOptions {
  walletAddress: string;
  privateKey: string; // This would come from PKP in production
  amount: string; // Amount in ETH or token
  tokenAddress: string; // Address of token to purchase
  dexRouterAddress: string; // Address of DEX router
  slippageTolerance: number; // Percentage (e.g., 0.5 for 0.5%)
  deadline: number; // Seconds from now
}

/**
 * Service for interacting with DEXes to purchase tokens
 */
export class DexService {
  private provider: ethers.providers.JsonRpcProvider;
  
  constructor(providerUrl: string = 'https://mainnet.base.org') {
    this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
  }
  
  /**
   * Purchase tokens using ETH
   * @param options Token purchase options
   * @returns Transaction hash
   */
  async purchaseTokensWithETH(options: TokenPurchaseOptions): Promise<string> {
    try {
      // Create wallet from private key
      // In production, this would be a PKP wallet
      const wallet = new ethers.Wallet(options.privateKey, this.provider);
      
      // Create contract instances
      const dexRouter = new ethers.Contract(
        options.dexRouterAddress,
        DEX_ROUTER_ABI,
        wallet
      );
      
      const tokenContract = new ethers.Contract(
        options.tokenAddress,
        ERC20_ABI,
        wallet
      );
      
      // Get token symbol and decimals for logging
      const tokenSymbol = await tokenContract.symbol();
      // We'll use the decimals for formatting the output amount in the logs
      const tokenDecimals = await tokenContract.decimals();
      
      // Convert amount to Wei
      const amountInWei = ethers.utils.parseEther(options.amount);
      
      // Get expected output amount
      const wethAddress = '0x4200000000000000000000000000000000000006'; // WETH on Base
      const path = [wethAddress, options.tokenAddress];
      const amountsOut = await dexRouter.getAmountsOut(amountInWei, path);
      
      // Calculate minimum amount out with slippage
      const amountOutMin = amountsOut[1].mul(
        ethers.BigNumber.from(Math.floor((100 - options.slippageTolerance) * 100))
      ).div(ethers.BigNumber.from(10000));
      
      // Calculate deadline
      const deadline = Math.floor(Date.now() / 1000) + options.deadline;
      
      // Execute swap
      const tx = await dexRouter.swapExactETHForTokens(
        amountOutMin,
        path,
        options.walletAddress,
        deadline,
        { value: amountInWei }
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Log the purchase details including the formatted amount using tokenDecimals
      const formattedOutputAmount = ethers.utils.formatUnits(amountsOut[1], tokenDecimals);
      console.log(`Successfully purchased ${formattedOutputAmount} ${tokenSymbol} with ${options.amount} ETH`);
      console.log(`Transaction hash: ${receipt.transactionHash}`);
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      throw error;
    }
  }
  
  /**
   * Purchase tokens using another token
   * @param options Token purchase options
   * @returns Transaction hash
   */
  async purchaseTokensWithToken(
    options: TokenPurchaseOptions & { sourceTokenAddress: string }
  ): Promise<string> {
    try {
      // Create wallet from private key
      // In production, this would be a PKP wallet
      const wallet = new ethers.Wallet(options.privateKey, this.provider);
      
      // Create contract instances
      const dexRouter = new ethers.Contract(
        options.dexRouterAddress,
        DEX_ROUTER_ABI,
        wallet
      );
      
      const sourceTokenContract = new ethers.Contract(
        options.sourceTokenAddress,
        ERC20_ABI,
        wallet
      );
      
      const targetTokenContract = new ethers.Contract(
        options.tokenAddress,
        ERC20_ABI,
        wallet
      );
      
      // Get token symbols and decimals for logging
      const sourceTokenSymbol = await sourceTokenContract.symbol();
      const sourceTokenDecimals = await sourceTokenContract.decimals();
      const targetTokenSymbol = await targetTokenContract.symbol();
      
      // Convert amount to token units
      const amountIn = ethers.utils.parseUnits(options.amount, sourceTokenDecimals);
      
      // Approve DEX router to spend tokens
      const approveTx = await sourceTokenContract.approve(options.dexRouterAddress, amountIn);
      await approveTx.wait();
      
      // Get expected output amount
      const path = [options.sourceTokenAddress, options.tokenAddress];
      const amountsOut = await dexRouter.getAmountsOut(amountIn, path);
      
      // Calculate minimum amount out with slippage
      const amountOutMin = amountsOut[1].mul(
        ethers.BigNumber.from(Math.floor((100 - options.slippageTolerance) * 100))
      ).div(ethers.BigNumber.from(10000));
      
      // Calculate deadline
      const deadline = Math.floor(Date.now() / 1000) + options.deadline;
      
      // Execute swap
      const tx = await dexRouter.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        options.walletAddress,
        deadline
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      console.log(`Successfully purchased ${targetTokenSymbol} with ${options.amount} ${sourceTokenSymbol}`);
      console.log(`Transaction hash: ${receipt.transactionHash}`);
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      throw error;
    }
  }
  
  /**
   * Get token balance for a wallet
   * @param walletAddress Wallet address
   * @param tokenAddress Token address
   * @returns Token balance as a formatted string
   */
  async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<string> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider
      );
      
      const balance = await tokenContract.balanceOf(walletAddress);
      const decimals = await tokenContract.decimals();
      const symbol = await tokenContract.symbol();
      
      const formattedBalance = ethers.utils.formatUnits(balance, decimals);
      
      return `${formattedBalance} ${symbol}`;
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw error;
    }
  }
  
  /**
   * Get ETH balance for a wallet
   * @param walletAddress Wallet address
   * @returns ETH balance as a formatted string
   */
  async getETHBalance(walletAddress: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(walletAddress);
      const formattedBalance = ethers.utils.formatEther(balance);
      
      return `${formattedBalance} ETH`;
    } catch (error) {
      console.error('Error getting ETH balance:', error);
      throw error;
    }
  }

  /**
   * Simulate a token purchase to estimate output amount without executing the transaction
   * @param tokenAddress Token address to purchase
   * @param amountInUSD Amount in USD to spend
   * @returns Estimated token amount to receive and USD value
   */
  async simulateTokenPurchase(tokenAddress: string, amountInUSD: string): Promise<{
    estimatedTokenAmount: string;
    tokenSymbol: string;
    usdValue: string;
    priceImpact: string;
  }> {
    try {
      // For simulation, we'll use USDC as the source token
      const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
      const wethAddress = '0x4200000000000000000000000000000000000006'; // WETH on Base
      
      // Create contract instances
      const dexRouter = new ethers.Contract(
        '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86', // Base Uniswap V3 Router
        DEX_ROUTER_ABI,
        this.provider
      );
      
      const usdcContract = new ethers.Contract(
        usdcAddress,
        ERC20_ABI,
        this.provider
      );
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider
      );
      
      // Get token details
      let tokenSymbol, tokenDecimals;
      try {
        tokenSymbol = await tokenContract.symbol();
        tokenDecimals = await tokenContract.decimals();
      } catch (error) {
        console.error('Error fetching token details:', error);
        tokenSymbol = 'Unknown';
        tokenDecimals = 18; // Default to 18 decimals
      }
      
      const usdcDecimals = await usdcContract.decimals();
      
      // Convert USD amount to USDC units
      const amountIn = ethers.utils.parseUnits(amountInUSD, usdcDecimals);
      
      // Determine the path based on token
      let path;
      if (tokenAddress === wethAddress) {
        // Direct USDC -> WETH
        path = [usdcAddress, wethAddress];
      } else {
        // USDC -> WETH -> Token
        path = [usdcAddress, wethAddress, tokenAddress];
      }
      
      // Get expected output amount
      const amountsOut = await dexRouter.getAmountsOut(amountIn, path);
      const estimatedAmount = amountsOut[amountsOut.length - 1];
      
      // Calculate price impact (more accurate calculation)
      let priceImpact = "0.5"; // Default value
      
      try {
        // For a more accurate price impact, we would:
        // 1. Get the current reserves of the token pair
        // 2. Calculate the expected price without our trade
        // 3. Calculate the price after our trade
        // 4. Calculate the percentage difference
        
        // For now, we'll simulate based on trade size
        const usdValue = parseFloat(amountInUSD);
        if (usdValue < 100) {
          priceImpact = "0.1";
        } else if (usdValue < 1000) {
          priceImpact = "0.5";
        } else if (usdValue < 10000) {
          priceImpact = "1.0";
        } else {
          priceImpact = "2.0";
        }
      } catch (error) {
        console.error('Error calculating price impact:', error);
        // Use default value
      }
      
      // Format the estimated amount
      const formattedAmount = ethers.utils.formatUnits(estimatedAmount, tokenDecimals);
      
      return {
        estimatedTokenAmount: formattedAmount,
        tokenSymbol,
        usdValue: amountInUSD,
        priceImpact: `${priceImpact}%`
      };
    } catch (error) {
      console.error('Error simulating token purchase:', error);
      // Return fallback values in case of error
      return {
        estimatedTokenAmount: "0",
        tokenSymbol: "Unknown",
        usdValue: amountInUSD,
        priceImpact: "N/A"
      };
    }
  }
}

// Export singleton instance
export const dexService = new DexService();
