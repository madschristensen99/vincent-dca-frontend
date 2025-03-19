/**
 * Utility functions for interacting with the SpendingLimits contract.
 */

/**
 * Creates a SpendingLimits contract instance.
 * @param {any} provider - The Ethereum provider.
 * @param {string} contractAddress - The SpendingLimits contract address.
 * @returns {any} The contract instance.
 */
export function getSpendingLimitsContract(provider: any, contractAddress: string): any {
  console.log(`Creating SpendingLimits contract instance at ${contractAddress}...`);
  
  const spendingLimitsAbi = [
    "function spend(uint256 amount) public",
    "function checkLimit(address user, uint256 amount) public view returns (bool)",
    "function pruneOldSpends(address user) public",
    "function limit() public view returns (uint256)",
    "function period() public view returns (uint256)",
    "function spends(address, uint256) public view returns (uint256 amount, uint256 timestamp)"
  ];
  
  return new ethers.Contract(contractAddress, spendingLimitsAbi, provider);
}

/**
 * Checks if a spending amount is within the user's limit.
 * @param {any} contract - The SpendingLimits contract instance.
 * @param {string} userAddress - The user's address.
 * @param {string} amount - The amount to spend in USD (with 18 decimals).
 * @returns {Promise<boolean>} Whether the spending is within limits.
 */
export async function checkSpendingLimit(
  contract: any, 
  userAddress: string, 
  amount: string
): Promise<boolean> {
  console.log(`Checking spending limit for ${userAddress} with amount ${amount}...`);
  
  try {
    const isWithinLimit = await contract.checkLimit(userAddress, amount);
    console.log(`Is within limit: ${isWithinLimit}`);
    return isWithinLimit;
  } catch (error) {
    console.error('Error checking spending limit:', error);
    throw new Error(`Failed to check spending limit: ${error}`);
  }
}

/**
 * Records a spend in the SpendingLimits contract.
 * @param {any} contract - The SpendingLimits contract instance.
 * @param {string} amount - The amount to spend in USD (with 18 decimals).
 * @param {any} wallet - The wallet to use for the transaction.
 * @returns {Promise<any>} The transaction receipt.
 */
export async function recordSpend(
  contract: any,
  amount: string,
  wallet: any
): Promise<any> {
  console.log(`Recording spend of ${amount}...`);
  
  try {
    // Create a contract instance connected to the wallet
    const connectedContract = contract.connect(wallet);
    
    // Send the transaction
    const tx = await connectedContract.spend(amount);
    console.log(`Spend transaction hash: ${tx.hash}`);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log(`Spend transaction confirmed in block ${receipt.blockNumber}`);
    
    return receipt;
  } catch (error) {
    console.error('Error recording spend:', error);
    throw new Error(`Failed to record spend: ${error}`);
  }
}

/**
 * Gets the current limit and period from the SpendingLimits contract.
 * @param {any} contract - The SpendingLimits contract instance.
 * @returns {Promise<{limit: string, period: string}>} The limit and period.
 */
export async function getLimitAndPeriod(contract: any): Promise<{limit: string, period: string}> {
  console.log('Getting limit and period from contract...');
  
  try {
    const [limit, period] = await Promise.all([
      contract.limit(),
      contract.period()
    ]);
    
    console.log(`Limit: ${ethers.utils.formatEther(limit)} USD, Period: ${period / (60 * 60 * 24)} days`);
    
    return {
      limit: limit.toString(),
      period: period.toString()
    };
  } catch (error) {
    console.error('Error getting limit and period:', error);
    throw new Error(`Failed to get limit and period: ${error}`);
  }
}
