import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { ethers } from 'ethers';
import { LitContracts } from '@lit-protocol/contracts-sdk';

import '../setup';
import { TestServer } from '../helpers/test-server';
import { executeSwap } from '../../src/lib/services/execute-swap/execute-swap';
import { PurchasedCoin } from '../../src/lib/models/purchased-coin.model';
import { Types } from 'mongoose';

// Mock the ethers wallet
jest.mock('ethers', () => {
  const originalModule = jest.requireActual('ethers');
  
  return {
    ...originalModule,
    Wallet: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn(),
      connect: jest.fn(),
      // Add other methods that might be called
      getAddress: jest.fn().mockResolvedValue('0xMockedAddress'),
    })),
    utils: {
      ...originalModule.utils,
      parseEther: originalModule.utils.parseEther,
      formatEther: originalModule.utils.formatEther,
    },
    providers: {
      ...originalModule.providers,
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        // Mock provider methods if needed
      })),
    },
  };
});

// Mock LitContracts
jest.mock('@lit-protocol/contracts-sdk', () => {
  return {
    LitContracts: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      signer: {
        getBalance: jest.fn(),
        getAddress: jest.fn().mockResolvedValue('0xMockedAddress'),
      },
      network: 'datil',
    })),
  };
});

// Mock other dependencies
jest.mock('../../src/lib/services/fetch-base-meme-coins', () => ({
  fetchTopBaseMemeCoins: jest.fn().mockResolvedValue({
    name: 'MockCoin',
    symbol: 'MOCK',
    coinAddress: '0xMockCoinAddress',
    price: '0.001',
  }),
}));

jest.mock('@lit-protocol/lit-node-client', () => ({
  LitNodeClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    createCapacityDelegationAuthSig: jest.fn().mockResolvedValue({
      capacityDelegationAuthSig: 'mockAuthSig',
    }),
    getSessionSigs: jest.fn().mockResolvedValue('mockSessionSigs'),
    executeJs: jest.fn().mockResolvedValue({
      response: JSON.stringify({
        status: 'success',
        swapHash: '0xMockSwapHash',
      }),
    }),
    getLatestBlockhash: jest.fn().mockResolvedValue('mockBlockhash'),
  })),
}));

jest.mock('@lit-protocol/auth-helpers', () => ({
  createSiweMessageWithRecaps: jest.fn().mockResolvedValue('mockSiweMessage'),
  generateAuthSig: jest.fn().mockResolvedValue('mockAuthSig'),
  LitActionResource: jest.fn().mockImplementation(() => ({})),
}));

// Mock capacity-credit functions
jest.mock('../../src/lib/services/execute-swap/capacity-credit', () => ({
  isCapacityCreditExpired: jest.fn().mockReturnValue(true),
  mintCapacityCredit: jest.fn().mockResolvedValue({
    capacityTokenIdStr: 'mockTokenIdStr',
    capacityTokenId: 'mockTokenId',
    requestsPerKilosecond: 10,
    daysUntilUTCMidnightExpiration: 1,
    mintedAtUtc: new Date().toISOString(),
  }),
}));

describe('Balance Check in Execute Swap', () => {
  let mongoConnection: typeof mongoose;
  let mockWalletBalance: jest.Mock;

  beforeEach(async () => {
    // Connect to MongoDB
    mongoConnection = await mongoose.connect(process.env.MONGODB_URI as string);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup the mock for wallet balance
    mockWalletBalance = jest.fn();
    (ethers.Wallet as jest.Mock).mockImplementation(() => ({
      getBalance: mockWalletBalance,
      getAddress: jest.fn().mockResolvedValue('0xMockedAddress'),
    }));
    
    // Also set it on the LitContracts signer
    (LitContracts as jest.Mock).mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      signer: {
        getBalance: mockWalletBalance,
        getAddress: jest.fn().mockResolvedValue('0xMockedAddress'),
      },
      network: 'datil',
    }));
  }, 10000);

  afterEach(async () => {
    // Clean up database
    await PurchasedCoin.deleteMany({});
    
    // Close MongoDB connection
    if (mongoConnection) {
      await mongoConnection.disconnect();
    }
  }, 10000);

  it('should fail when balance is below minimum threshold', async () => {
    // Mock a low balance (less than 0.01 ETH)
    mockWalletBalance.mockResolvedValue(ethers.utils.parseEther('0.005'));
    
    const result = await executeSwap({
      scheduleId: new Types.ObjectId(),
      walletAddress: '0xTestWallet',
      purchaseAmount: '0.001',
      purchasedAt: new Date(),
    });
    
    // Expect the function to return null due to insufficient balance
    expect(result).toBeNull();
    
    // Verify no purchase record was created
    const purchases = await PurchasedCoin.find({ walletAddress: '0xTestWallet' });
    expect(purchases.length).toBe(0);
  });

  it('should proceed when balance is above minimum threshold', async () => {
    // Mock a sufficient balance (more than 0.01 ETH)
    mockWalletBalance.mockResolvedValue(ethers.utils.parseEther('0.05'));
    
    const scheduleId = new Types.ObjectId();
    const result = await executeSwap({
      scheduleId,
      walletAddress: '0xTestWallet',
      purchaseAmount: '0.001',
      purchasedAt: new Date(),
    });
    
    // Expect the function to return a purchase record
    expect(result).not.toBeNull();
    
    // Verify a purchase record was created
    const purchases = await PurchasedCoin.find({ walletAddress: '0xTestWallet' });
    expect(purchases.length).toBe(1);
    expect(purchases[0].scheduleId.toString()).toBe(scheduleId.toString());
  });
});
