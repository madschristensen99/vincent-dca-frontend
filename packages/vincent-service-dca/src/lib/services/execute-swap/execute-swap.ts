import { config } from '@dotenvx/dotenvx';
config();

import { Types } from 'mongoose';
import { ethers } from 'ethers';
import { LIT_ABILITY, LIT_NETWORK, LIT_RPC } from '@lit-protocol/constants';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import axios from 'axios';
import {
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitActionResource,
} from '@lit-protocol/auth-helpers';

import { PurchasedCoin } from '../../models/purchased-coin.model';
import { fetchTopBaseMemeCoins } from '../fetch-base-meme-coins';
import { logger } from '../../logger';
import {
  type CapacityCreditInfo,
  isCapacityCreditExpired,
  mintCapacityCredit,
} from './capacity-credit';

interface ExecuteSwapParams {
  scheduleId: Types.ObjectId;
  walletAddress: string;
  purchaseAmount: string;
  purchasedAt: Date;
}

const getEnv = (envName: string) => {
  const env = process.env[envName];
  if (env === '' || env === undefined) {
    throw new Error(`${envName} is not set in .env`);
  }

  return env;
};

const VINCENT_DELEGATEE_PRIVATE_KEY = getEnv('VINCENT_DELEGATEE_PRIVATE_KEY');
const VINCENT_TOOL_UNISWAP_SWAP_IPFS_ID = getEnv(
  'VINCENT_TOOL_UNISWAP_SWAP_IPFS_ID'
);
const BASE_RPC_URL = getEnv('BASE_RPC_URL');

let CAPACITY_CREDIT_INFO: CapacityCreditInfo | null = null;

/**
 * Fetches token price in USD from DEX Screener API
 * @param tokenAddress The address of the token to get price for
 * @param chainId The chain ID (e.g., 'base' for Base network)
 * @returns The token price in USD or null if not found
 */
async function getTokenPriceFromDexScreener(tokenAddress: string, chainId: string = 'base'): Promise<number | null> {
  try {
    // DEX Screener API endpoint for pair data
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    const response = await axios.get(url);
    
    if (response.data && response.data.pairs && response.data.pairs.length > 0) {
      // Filter for pairs on the specified chain
      const pairsOnChain = response.data.pairs.filter((pair: any) => pair.chainId === chainId);
      
      if (pairsOnChain.length > 0) {
        // Sort by volume to get the most liquid pair
        const sortedPairs = pairsOnChain.sort((a: any, b: any) => 
          (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
        );
        
        // Get price from the most liquid pair
        const priceUsd = parseFloat(sortedPairs[0].priceUsd);
        return priceUsd;
      }
    }
    
    logger.error(`No price data found for token ${tokenAddress} on chain ${chainId}`);
    return null;
  } catch (error) {
    logger.error('Error fetching token price from DEX Screener:', error);
    return null;
  }
}

export async function executeSwap({
  scheduleId,
  walletAddress,
  purchaseAmount,
  purchasedAt,
}: ExecuteSwapParams): Promise<InstanceType<typeof PurchasedCoin> | null> {
  try {
    // Fetch top coin first to get the target token
    logger.debug('Fetching top coin...');
    const topCoin = await fetchTopBaseMemeCoins();
    logger.debug('Got top coin:', topCoin);
    
    // Get current ETH price in USD
    const ethPriceUsd = await getTokenPriceFromDexScreener('0x4200000000000000000000000000000000000006', 'base');
    if (!ethPriceUsd) {
      logger.error('Failed to fetch ETH price, cannot validate transaction value');
      return null;
    }
    
    // Calculate dollar value of the transaction
    const purchaseAmountWei = ethers.utils.parseEther(purchaseAmount);
    const purchaseAmountEth = parseFloat(ethers.utils.formatEther(purchaseAmountWei));
    const purchaseAmountUsd = purchaseAmountEth * ethPriceUsd;
    
    logger.debug(`Transaction value: $${purchaseAmountUsd.toFixed(2)} USD (${purchaseAmountEth} ETH at $${ethPriceUsd.toFixed(2)}/ETH)`);
    
    // Check user's wallet balance
    const provider = new ethers.providers.JsonRpcProvider(BASE_RPC_URL);
    const userWalletBalance = await provider.getBalance(walletAddress);
    const userBalanceEth = parseFloat(ethers.utils.formatEther(userWalletBalance));
    const userBalanceUsd = userBalanceEth * ethPriceUsd;
    
    // Add some buffer for gas fees (approximately 10%)
    const estimatedGasFee = purchaseAmountWei.mul(10).div(100);
    const estimatedGasFeeEth = parseFloat(ethers.utils.formatEther(estimatedGasFee));
    const estimatedGasFeeUsd = estimatedGasFeeEth * ethPriceUsd;
    
    const totalRequiredWei = purchaseAmountWei.add(estimatedGasFee);
    const totalRequiredUsd = purchaseAmountUsd + estimatedGasFeeUsd;
    
    if (userWalletBalance.lt(totalRequiredWei)) {
      logger.error(
        `Insufficient balance in user wallet ${walletAddress}: ` +
        `${userBalanceEth.toFixed(6)} ETH ($${userBalanceUsd.toFixed(2)} USD). ` +
        `Required for purchase: ${purchaseAmountEth.toFixed(6)} ETH ($${purchaseAmountUsd.toFixed(2)} USD) ` +
        `plus estimated gas: ${estimatedGasFeeEth.toFixed(6)} ETH ($${estimatedGasFeeUsd.toFixed(2)} USD). ` +
        `Total required: $${totalRequiredUsd.toFixed(2)} USD.`
      );
      return null;
    }

    const ethersSigner = new ethers.Wallet(
      VINCENT_DELEGATEE_PRIVATE_KEY as string,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    );

    const litContractClient = new LitContracts({
      signer: ethersSigner,
      network: LIT_NETWORK.Datil,
    });
    await litContractClient.connect();
    
    // Check if the service wallet has sufficient balance before proceeding
    const walletBalance = await ethersSigner.getBalance();
    const minRequiredBalance = ethers.utils.parseEther("0.01"); // Set a minimum required balance threshold
    
    if (walletBalance.lt(minRequiredBalance)) {
      logger.error(
        `Insufficient balance to execute swap: ${ethers.utils.formatEther(walletBalance)} ETH. ` +
        `Minimum required: ${ethers.utils.formatEther(minRequiredBalance)} ETH.`
      );
      return null; // Exit early to prevent DDOSing our service
    }

    if (
      CAPACITY_CREDIT_INFO === null ||
      isCapacityCreditExpired(
        CAPACITY_CREDIT_INFO.mintedAtUtc,
        CAPACITY_CREDIT_INFO.daysUntilUTCMidnightExpiration
      )
    ) {
      CAPACITY_CREDIT_INFO = await mintCapacityCredit(litContractClient);
    }

    const litNodeClient = new LitNodeClient({
      litNetwork: LIT_NETWORK.Datil,
      debug: false,
    });
    await litNodeClient.connect();

    const { capacityDelegationAuthSig } =
      await litNodeClient.createCapacityDelegationAuthSig({
        dAppOwnerWallet: ethersSigner,
        capacityTokenId: CAPACITY_CREDIT_INFO.capacityTokenId,
        uses: '1',
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
      });

    const sessionSigs = await litNodeClient.getSessionSigs({
      chain: 'ethereum',
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
      capabilityAuthSigs: [capacityDelegationAuthSig],
      resourceAbilityRequests: [
        {
          resource: new LitActionResource('*'),
          ability: LIT_ABILITY.LitActionExecution,
        },
      ],
      authNeededCallback: async ({
        resourceAbilityRequests,
        expiration,
        uri,
      }) => {
        const toSign = await createSiweMessageWithRecaps({
          uri: uri!,
          expiration: expiration!,
          resources: resourceAbilityRequests!,
          walletAddress: ethersSigner.address,
          nonce: await litNodeClient.getLatestBlockhash(),
          litNodeClient,
        });

        return await generateAuthSig({
          signer: ethersSigner,
          toSign,
        });
      },
    });

    const litActionResponse = await litNodeClient.executeJs({
      sessionSigs,
      ipfsId: VINCENT_TOOL_UNISWAP_SWAP_IPFS_ID,
      jsParams: {
        litActionParams: {
          pkpEthAddress: walletAddress,
          rpcUrl: BASE_RPC_URL,
          chainId: '8453',
          tokenIn: '0x4200000000000000000000000000000000000006', // Wrapped ETH
          tokenOut: topCoin.coinAddress,
          amountIn: purchaseAmount,
        },
      },
    });

    logger.debug('Lit Action Response:', litActionResponse);

    const swapResult = JSON.parse(litActionResponse.response as string);
    const success = swapResult.status === 'success';

    // Create a purchase record with all required fields
    const purchase = new PurchasedCoin({
      scheduleId,
      walletAddress,
      name: topCoin.name,
      symbol: topCoin.symbol,
      coinAddress: topCoin.coinAddress,
      price: topCoin.price,
      purchaseAmount,
      txHash: swapResult.swapHash,
      success,
      purchasedAt,
    });
    await purchase.save();

    logger.debug(
      `Successfully created purchase record for ${topCoin.symbol} with tx hash ${swapResult.swapHash}`
    );
    return purchase;
  } catch (error) {
    logger.error('Purchase failed:', error);
    return null;
  }
}
