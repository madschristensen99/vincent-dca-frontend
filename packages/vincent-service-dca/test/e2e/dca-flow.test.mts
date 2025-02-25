import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'node-fetch';
import mongoose from 'mongoose';

import '../setup.mts';
import { TestServer } from '../helpers/test-server.mjs';
import { PurchasedCoin } from '../../src/lib/models/purchased-coin.model.mjs';
import { User } from '../../src/lib/models/user.model.mjs';

describe('DCA Flow', () => {
  let server: TestServer;
  let timeouts: NodeJS.Timeout[] = [];
  let mongoConnection: typeof mongoose;

  beforeEach(async () => {
    // Create and start test server
    server = new TestServer();
    await server.start();

    // Ensure MongoDB is connected
    mongoConnection = await mongoose.connect(process.env.MONGODB_URI as string);
  }, 10000); // 10 second timeout for setup

  afterEach(async () => {
    // Clean up database first while connection is still open
    await User.deleteMany({});
    await PurchasedCoin.deleteMany({});

    // Stop server
    await server.stop();

    // Clear all timeouts
    timeouts.forEach(clearTimeout);
    timeouts = [];

    // Close MongoDB connection last
    if (mongoConnection) {
      await mongoConnection.disconnect();
    }

    // Add a small delay to ensure all operations complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }, 10000); // 10 second timeout for cleanup

  const wait = (ms: number) => {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, ms);
      timeouts.push(timeout);
    });
  };

  // Helper function to retry fetching transactions until they appear
  const waitForTransactions = async (
    walletAddress: string,
    retries = 30, // Increased retries
    interval = 2000
  ) => {
    for (let i = 0; i < retries; i++) {
      console.log(`Checking for transactions (attempt ${i + 1}/${retries})...`);

      // Check MongoDB directly first
      const user = await User.findOne({
        walletAddress: walletAddress.toLowerCase(),
      });
      if (user) {
        const dbTransactions = await PurchasedCoin.find({
          userId: user._id,
        }).sort({ purchasedAt: -1 });
        if (dbTransactions.length > 0) {
          console.log('Found transactions in database');
          return dbTransactions;
        }
      }

      // Then check via API
      const response = await fetch(
        `${server.baseUrl}/dca/transactions/${walletAddress}`
      );

      if (response.status === 200) {
        const transactions = await response.json();
        if (transactions.length > 0) {
          console.log('Found transactions via API');
          return transactions;
        }
      }

      if (i < retries - 1) {
        console.log('No transactions found yet, waiting...');
        await wait(interval);
      }
    }
    throw new Error('Timed out waiting for transactions');
  };

  it('should complete a full DCA flow', async () => {
    console.log('\n--- Starting DCA flow test ---');

    // 1. Get all schedules (should be empty)
    console.log('Checking initial schedules...');
    const initialSchedulesResponse = await fetch(
      `${server.baseUrl}/dca/schedules`
    );
    expect(initialSchedulesResponse.status).toBe(200);
    const initialSchedules = await initialSchedulesResponse.json();
    expect(initialSchedules).toHaveLength(0);

    // 2. Create a new DCA schedule
    console.log('Creating new DCA schedule...');
    const scheduleData = {
      walletAddress: '0xE42534Ce546f54234d9DA51F6CA3c2eD1D682990',
      purchaseIntervalSeconds: 10, // 10 seconds for testing
      purchaseAmount: '0.0005',
    };

    const createResponse = await fetch(`${server.baseUrl}/dca/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleData),
    });

    if (createResponse.status !== 201) {
      const errorData = await createResponse.json();
      console.log('Error creating schedule:', errorData);
    }

    expect(createResponse.status).toBe(201);
    const createdSchedule = await createResponse.json();
    expect(createdSchedule.walletAddress).toBe(
      scheduleData.walletAddress.toLowerCase()
    );
    expect(createdSchedule.purchaseIntervalSeconds).toBe(
      scheduleData.purchaseIntervalSeconds
    );
    expect(createdSchedule.active).toBe(true);

    // 3. Get specific schedule
    console.log('Fetching created schedule...');
    const scheduleResponse = await fetch(
      `${server.baseUrl}/dca/schedules/${scheduleData.walletAddress}`
    );
    expect(scheduleResponse.status).toBe(200);
    const schedule = await scheduleResponse.json();
    expect(schedule.walletAddress).toBe(
      scheduleData.walletAddress.toLowerCase()
    );

    // 4. Wait for first purchase with retries
    console.log('Waiting for first purchase...');
    const transactions = await waitForTransactions(scheduleData.walletAddress);
    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions[0].success).toBe(true);
    expect(transactions[0].amount).toBe(scheduleData.purchaseAmount);

    // 5. Check latest transaction
    console.log('Checking latest transaction...');
    const latestTransactionResponse = await fetch(
      `${server.baseUrl}/dca/transactions/${scheduleData.walletAddress}/latest`
    );
    expect(latestTransactionResponse.status).toBe(200);
    const latestTransaction = await latestTransactionResponse.json();
    expect(latestTransaction.txHash).toBe(transactions[0].txHash);

    // 6. Deactivate schedule
    console.log('Deactivating schedule...');
    const deactivateResponse = await fetch(
      `${server.baseUrl}/dca/schedules/${scheduleData.walletAddress}/deactivate`,
      { method: 'PATCH' }
    );
    expect(deactivateResponse.status).toBe(200);
    const deactivatedSchedule = await deactivateResponse.json();
    expect(deactivatedSchedule.active).toBe(false);

    // Verify deactivation took effect
    console.log('Verifying deactivation...');
    const verifyDeactivationResponse = await fetch(
      `${server.baseUrl}/dca/schedules/${scheduleData.walletAddress}`
    );
    expect(verifyDeactivationResponse.status).toBe(200);
    const verifiedSchedule = await verifyDeactivationResponse.json();
    expect(verifiedSchedule.active).toBe(false);

    // Add a small delay to ensure deactivation is processed by scheduler
    await wait(2000);

    // 7. Wait another interval and verify no new purchases
    console.log('Waiting another interval to verify no new purchases...');
    await wait(15 * 1000);

    const finalTransactionsResponse = await fetch(
      `${server.baseUrl}/dca/transactions/${scheduleData.walletAddress}`
    );
    const finalTransactions = await finalTransactionsResponse.json();
    expect(finalTransactions.length).toBe(transactions.length); // Should not have increased

    // 8. Get all transactions
    console.log('Checking all DCA transactions...');
    const allTransactionsResponse = await fetch(
      `${server.baseUrl}/dca/transactions`
    );
    expect(allTransactionsResponse.status).toBe(200);
    const allTransactions = await allTransactionsResponse.json();
    expect(allTransactions.length).toBeGreaterThan(0);

    console.log('--- Test completed ---\n');
  }, 180000); // 3 minute timeout
});
