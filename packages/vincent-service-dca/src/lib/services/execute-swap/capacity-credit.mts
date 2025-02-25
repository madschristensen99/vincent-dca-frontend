import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LIT_NETWORK } from '@lit-protocol/constants';
import { ethers } from 'ethers';

/**
 * Represents information about a Capacity Credit.
 * Includes the capacity token ID, requests per kilosecond, expiration details, and minting timestamp.
 */
export interface CapacityCreditInfo {
  /** The capacity token ID as a string. */
  capacityTokenIdStr: string;

  /** The capacity token ID as a number. */
  capacityTokenId: string;

  /** The number of requests allowed per kilosecond. */
  requestsPerKilosecond: number;

  /** The number of days until the capacity credit expires at UTC midnight. */
  daysUntilUTCMidnightExpiration: number;

  /** The timestamp when the capacity credit was minted (in UTC). */
  mintedAtUtc: string;
}

/**
 * Options for minting a Capacity Credit.
 * Includes requests per kilosecond and expiration details.
 */
interface CapacityCreditMintOptions {
  /** The number of requests allowed per kilosecond (optional). */
  requestsPerKilosecond?: number;

  /** The number of days until the capacity credit expires at UTC midnight (optional). */
  daysUntilUTCMidnightExpiration?: number;
}

/**
 * Check if the current network requires capacity credits
 */
export function requiresCapacityCredit(litContracts: LitContracts): boolean {
  return (
    litContracts.network === LIT_NETWORK.DatilTest ||
    litContracts.network === LIT_NETWORK.Datil
  );
}

export function isCapacityCreditExpired(
  mintedAtUtc: string,
  daysUntilUTCMidnightExpiration: number
): boolean {
  // Create dates from UTC timestamps
  const now = new Date();
  const mintedDate = new Date(mintedAtUtc);

  // Calculate the expiration date at UTC midnight
  const expirationDate = new Date(mintedDate);
  expirationDate.setUTCDate(
    mintedDate.getUTCDate() + daysUntilUTCMidnightExpiration
  );
  expirationDate.setUTCHours(0, 0, 0, 0); // Set to UTC midnight

  // Expire 10 minutes before UTC midnight
  const earlyExpirationMinutes = 10;
  const earlyExpirationMilliseconds = earlyExpirationMinutes * 60 * 1000;

  // Compare timestamps in UTC
  return now.getTime() > expirationDate.getTime() - earlyExpirationMilliseconds;
}

/**
 * Mint a new capacity credit NFT
 */
export async function mintCapacityCredit(
  litContracts: LitContracts,
  {
    requestsPerKilosecond = 10,
    daysUntilUTCMidnightExpiration = 1,
  }: CapacityCreditMintOptions = {}
): Promise<CapacityCreditInfo> {
  // Calculate expiration timestamp at UTC midnight
  const now = new Date();
  const expirationDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilUTCMidnightExpiration,
      0,
      0,
      0,
      0 // Set to midnight UTC
    )
  );
  const expiresAt = Math.floor(expirationDate.getTime() / 1000); // Convert to Unix timestamp

  const mintCost = await litContracts.rateLimitNftContract.read.calculateCost(
    requestsPerKilosecond,
    expiresAt
  );

  if (mintCost.gt(await litContracts.signer.getBalance())) {
    throw new Error(
      `${await litContracts.signer.getAddress()} has insufficient balance to mint capacity credit: ${ethers.utils.formatEther(
        await litContracts.signer.getBalance()
      )} < ${ethers.utils.formatEther(mintCost)}`
    );
  }

  const capacityCreditInfo = await litContracts.mintCapacityCreditsNFT({
    requestsPerKilosecond,
    daysUntilUTCMidnightExpiration,
  });

  return {
    capacityTokenIdStr: capacityCreditInfo.capacityTokenIdStr,
    capacityTokenId: capacityCreditInfo.capacityTokenId,
    requestsPerKilosecond,
    daysUntilUTCMidnightExpiration,
    mintedAtUtc: new Date().toISOString(),
  };
}
