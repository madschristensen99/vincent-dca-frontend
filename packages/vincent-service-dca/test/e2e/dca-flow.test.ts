import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'node-fetch';
import mongoose from 'mongoose';

import '../setup';
import { TestServer } from '../helpers/test-server';
import { PurchasedCoin } from '../../src/lib/models/purchased-coin.model';
import { User } from '../../src/lib/models/user.model';

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
    // Stop server first to prevent new operations
    await server.stop();

    // Clear all timeouts
    timeouts.forEach(clearTimeout);
    timeouts = [];

    // Clean up database while connection is still open
    await User.deleteMany({});
    await PurchasedCoin.deleteMany({});

    // Add a small delay to ensure all DB operations complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Close MongoDB connection last
    if (mongoConnection) {
      await mongoConnection.disconnect();
    }
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
    retries = 30,
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

  it('should handle multiple DCA schedules for a wallet', async () => {
    const walletAddress = '0xE42534Ce546f54234d9DA51F6CA3c2eD1D682990';
    const scheduleAmount1 = '0.0001';
    const scheduleAmount2 = '0.0002';

    // Create first schedule
    const schedule1Response = await fetch(`${server.baseUrl}/dca/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        purchaseIntervalSeconds: 10,
        purchaseAmount: scheduleAmount1,
      }),
    });
    expect(schedule1Response.status).toBe(201);
    const schedule1 = await schedule1Response.json();
    expect(schedule1.scheduleId).toBeDefined();
    expect(schedule1.active).toBe(true);

    // Create second schedule
    const schedule2Response = await fetch(`${server.baseUrl}/dca/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        purchaseIntervalSeconds: 20,
        purchaseAmount: scheduleAmount2,
      }),
    });
    expect(schedule2Response.status).toBe(201);
    const schedule2 = await schedule2Response.json();
    expect(schedule2.scheduleId).toBeDefined();
    expect(schedule2.active).toBe(true);

    // Get all schedules for wallet
    const getSchedulesResponse = await fetch(
      `${server.baseUrl}/dca/schedules/${walletAddress}`
    );
    expect(getSchedulesResponse.status).toBe(200);
    const schedules = await getSchedulesResponse.json();
    expect(schedules.length).toBe(2);
    expect(schedules.map((s: any) => s.purchaseAmount)).toContain(
      scheduleAmount1
    );
    expect(schedules.map((s: any) => s.purchaseAmount)).toContain(
      scheduleAmount2
    );

    // Get schedule by ID
    const getScheduleByIdResponse = await fetch(
      `${server.baseUrl}/dca/schedules/id/${schedule1.scheduleId}`
    );
    expect(getScheduleByIdResponse.status).toBe(200);
    const scheduleById = await getScheduleByIdResponse.json();
    expect(scheduleById.scheduleId).toBe(schedule1.scheduleId);

    // Wait for first purchase from both schedules
    await wait(25000); // Increased wait time to ensure both schedules have time to execute
    const transactions = await waitForTransactions(walletAddress);
    expect(transactions.length).toBeGreaterThanOrEqual(2);

    // Deactivate first schedule
    const deactivateResponse = await fetch(
      `${server.baseUrl}/dca/schedules/${schedule1.scheduleId}/deactivate`,
      { method: 'PATCH' }
    );
    expect(deactivateResponse.status).toBe(200);
    const deactivatedSchedule = await deactivateResponse.json();
    expect(deactivatedSchedule.active).toBe(false);

    // Verify first schedule is inactive but second is still active
    const getSchedulesAfterDeactivateResponse = await fetch(
      `${server.baseUrl}/dca/schedules/${walletAddress}`
    );
    const schedulesAfterDeactivate =
      await getSchedulesAfterDeactivateResponse.json();
    const schedule1After = schedulesAfterDeactivate.find(
      (s: any) => s.scheduleId === schedule1.scheduleId
    );
    const schedule2After = schedulesAfterDeactivate.find(
      (s: any) => s.scheduleId === schedule2.scheduleId
    );
    expect(schedule1After.active).toBe(false);
    expect(schedule2After.active).toBe(true);

    // Wait for another purchase (should only come from second schedule)
    await wait(22000);
    const laterTransactions = await waitForTransactions(walletAddress);
    const newTransactionsCount = laterTransactions.length - transactions.length;
    expect(newTransactionsCount).toBe(1); // Only one new transaction from the active schedule

    // Reactivate first schedule
    const activateResponse = await fetch(
      `${server.baseUrl}/dca/schedules/${schedule1.scheduleId}/activate`,
      { method: 'PATCH' }
    );
    expect(activateResponse.status).toBe(200);
    const reactivatedSchedule = await activateResponse.json();
    expect(reactivatedSchedule.active).toBe(true);

    // Wait for purchases from both schedules again
    await wait(12000);
    const finalTransactions = await waitForTransactions(walletAddress);
    const finalNewTransactionsCount =
      finalTransactions.length - laterTransactions.length;
    expect(finalNewTransactionsCount).toBeGreaterThanOrEqual(2);
  }, 120000); // 2 minute timeout for the entire test
});
