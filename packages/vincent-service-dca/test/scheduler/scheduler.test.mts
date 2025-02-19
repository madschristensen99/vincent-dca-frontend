import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'node-fetch';

import '../setup.mts';
import { TestServer } from '../helpers/test-server.mjs';

describe('Scheduler', () => {
  let server: TestServer;
  let timeouts: NodeJS.Timeout[] = [];

  beforeEach(async () => {
    // Create and start test server
    server = new TestServer();
    await server.start();
  }, 10000); // 10 second timeout for setup

  afterEach(async () => {
    // Clean up after each test
    await server.stop();

    // Clear all timeouts
    timeouts.forEach(clearTimeout);
    timeouts = [];
  }, 10000); // 10 second timeout for cleanup

  const wait = (ms: number) => {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, ms);
      timeouts.push(timeout);
    });
  };

  it(
    'should respect different user purchase intervals',
    async () => {
      console.log('\n--- Starting scheduler test ---');

      // Create two test users with different intervals
      console.log('Creating test user 1...');
      const user1Response = await fetch(`${server.baseUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: '0xTestWallet1',
          purchaseIntervalSeconds: 3, // 3 seconds interval
        }),
      });
      expect(user1Response.status).toBe(201);
      const user1Data = await user1Response.json();
      console.log('User 1 created:', user1Data);

      console.log('Creating test user 2...');
      const user2Response = await fetch(`${server.baseUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: '0xTestWallet2',
          purchaseIntervalSeconds: 8, // 8 seconds interval
        }),
      });
      expect(user2Response.status).toBe(201);
      const user2Data = await user2Response.json();
      console.log('User 2 created:', user2Data);

      // Wait 5 seconds - user1 should have a purchase, user2 should not
      console.log('Waiting 5 seconds for first check...');
      await wait(5 * 1000);

      // Add a small delay to ensure all purchases are processed
      await wait(1000);

      console.log('Checking user 1 purchases...');
      const user1PurchasesResponse = await fetch(
        `${server.baseUrl}/purchases/${user1Data.walletAddress}`
      );
      const user1Purchases = await user1PurchasesResponse.json();
      console.log('User 1 purchases:', user1Purchases);
      expect(user1Purchases.length).toBeGreaterThan(0);

      console.log('Checking user 2 purchases...');
      const user2PurchasesResponse = await fetch(
        `${server.baseUrl}/purchases/${user2Data.walletAddress}`
      );
      const user2Purchases = await user2PurchasesResponse.json();
      console.log('User 2 purchases:', user2Purchases);
      expect(user2Purchases.length).toBe(0);

      // Wait another 5 seconds - both users should have purchases
      console.log('Waiting another 5 seconds for second check...');
      await wait(5 * 1000);

      // Add a small delay to ensure all purchases are processed
      await wait(1000);

      console.log('Checking final user 1 purchases...');
      const user1FinalPurchasesResponse = await fetch(
        `${server.baseUrl}/purchases/${user1Data.walletAddress}`
      );
      const user1FinalPurchases = await user1FinalPurchasesResponse.json();
      console.log('User 1 final purchases:', user1FinalPurchases);
      expect(user1FinalPurchases.length).toBeGreaterThan(1); // Should have multiple purchases

      console.log('Checking final user 2 purchases...');
      const user2FinalPurchasesResponse = await fetch(
        `${server.baseUrl}/purchases/${user2Data.walletAddress}`
      );
      const user2FinalPurchases = await user2FinalPurchasesResponse.json();
      console.log('User 2 final purchases:', user2FinalPurchases);
      expect(user2FinalPurchases.length).toBeGreaterThan(0); // Should have at least one purchase

      console.log('--- Test completed ---\n');
    },
    15 * 1000
  ); // 15 seconds timeout
});
