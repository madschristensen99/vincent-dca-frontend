const express = require('express');
const { ethers } = require('ethers');
const { verifyJWT } = require('../lib/auth');

const router = express.Router();

// Middleware to verify JWT token
router.use(verifyJWT);

/**
 * Get wallet balance
 * @route POST /wallet/balance
 * @param {string} walletAddress - The wallet address to check balance for
 * @param {number} chainId - The chain ID (e.g., 84532 for Base Sepolia)
 * @returns {object} Balance information
 */
router.post('/balance', async (req, res) => {
  try {
    const { walletAddress, chainId } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }

    // Determine RPC URL based on chain ID
    let rpcUrl;
    if (chainId === 84532) {
      // Base Sepolia
      rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Unsupported chain ID' 
      });
    }

    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Get balance
    const balanceWei = await provider.getBalance(walletAddress);
    const balanceEth = ethers.utils.formatEther(balanceWei);

    return res.json({
      success: true,
      balance: balanceEth,
      address: walletAddress,
      chainId
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch wallet balance',
      error: error.message
    });
  }
});

module.exports = router;
