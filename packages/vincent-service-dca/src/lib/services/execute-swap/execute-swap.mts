import { config } from '@dotenvx/dotenvx';
config();

import { Types } from 'mongoose';
import { ethers } from 'ethers';
import { LIT_ABILITY, LIT_NETWORK, LIT_RPC } from '@lit-protocol/constants';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import {
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitActionResource,
} from '@lit-protocol/auth-helpers';

import { PurchasedCoin } from '../../models/purchased-coin.model.mjs';
import { fetchTopBaseMemeCoins } from '../fetch-base-meme-coins.mjs';
import { logger } from '../../logger.mjs';
import {
  type CapacityCreditInfo,
  isCapacityCreditExpired,
  mintCapacityCredit,
} from './capacity-credit.mjs';

interface ExecuteSwapParams {
  userId: Types.ObjectId;
  userWalletAddress: string;
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

export async function executeSwap({
  userId,
  userWalletAddress,
  purchaseAmount,
  purchasedAt,
}: ExecuteSwapParams): Promise<InstanceType<typeof PurchasedCoin> | null> {
  try {
    logger.debug('Fetching top coin...');
    const topCoin = await fetchTopBaseMemeCoins();
    logger.debug('Got top coin:', topCoin);

    const ethersSigner = new ethers.Wallet(
      VINCENT_DELEGATEE_PRIVATE_KEY as string,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    );

    const litContractClient = new LitContracts({
      signer: ethersSigner,
      network: LIT_NETWORK.Datil,
    });
    await litContractClient.connect();

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
          pkpEthAddress: userWalletAddress,
          rpcUrl: BASE_RPC_URL,
          chainId: '8453',
          tokenIn: '0x4200000000000000000000000000000000000006', // Wrapped ETH
          tokenOut: topCoin.coinAddress,
          amountIn: purchaseAmount,
        },
      },
    });

    console.log('litActionResponse', litActionResponse);

    // Create a purchase record
    const purchase = new PurchasedCoin({
      userId,
      coinAddress: topCoin.coinAddress,
      symbol: topCoin.symbol,
      amount: purchaseAmount,
      priceAtPurchase: parseFloat(topCoin.price),
      txHash: `0x${Math.random().toString(16).slice(2)}`, // Mock transaction hash
      purchasedAt,
    });
    await purchase.save();

    logger.debug(`Successfully created purchase record for ${topCoin.symbol}`);
    return purchase;
  } catch (error) {
    logger.error('Purchase failed:', error);
    return null;
  }
}
