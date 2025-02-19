import Fastify from 'fastify';
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from '@jest/globals';

import '../setup.mjs';
import { purchaseRoutes } from '../../src/lib/routes/purchase.routes.mjs';
import { userRoutes } from '../../src/lib/routes/user.routes.mjs';
import { User } from '../../src/lib/models/user.model.mjs';
import { PurchasedCoin } from '../../src/lib/models/purchased-coin.model.mjs';

describe('Purchase Routes', () => {
  const fastify = Fastify();
  let testUser: any;

  beforeAll(async () => {
    await fastify.register(purchaseRoutes);
    await fastify.register(userRoutes);
    await fastify.ready();
  });

  beforeEach(async () => {
    // Create a test user
    const user = new User({
      walletAddress: '0xTestWallet',
      purchaseIntervalMinutes: 60,
    });
    testUser = await user.save();

    // Create some test purchases
    const purchases = [
      {
        userId: testUser._id,
        coinAddress: '0xCoin1',
        symbol: 'MEME1',
        amount: 100,
        priceAtPurchase: 1.5,
        txHash: '0xTx1',
        purchasedAt: new Date('2024-02-19T10:00:00Z'),
      },
      {
        userId: testUser._id,
        coinAddress: '0xCoin2',
        symbol: 'MEME2',
        amount: 200,
        priceAtPurchase: 2.5,
        txHash: '0xTx2',
        purchasedAt: new Date('2024-02-19T11:00:00Z'),
      },
    ];

    await PurchasedCoin.insertMany(purchases);
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('GET /purchases/:walletAddress', () => {
    it('should get all purchases for a wallet address', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/purchases/${testUser.walletAddress}`,
      });

      expect(response.statusCode).toBe(200);
      const purchases = JSON.parse(response.payload);
      console.log(purchases);
      expect(Array.isArray(purchases)).toBe(true);
      expect(purchases.length).toBe(2);
      expect(purchases[0].symbol).toBe('MEME2'); // Most recent first
      expect(purchases[1].symbol).toBe('MEME1');
    });

    it('should return 404 for non-existent wallet', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/purchases/0xNonExistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /purchases/:walletAddress/latest', () => {
    it('should get latest purchase for a wallet address', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/purchases/${testUser.walletAddress}/latest`,
      });

      expect(response.statusCode).toBe(200);
      const purchase = JSON.parse(response.payload);
      expect(purchase.symbol).toBe('MEME2');
      expect(purchase.amount).toBe(200);
    });

    it('should return 404 for wallet with no purchases', async () => {
      // Create a new user with no purchases
      const newUser = await new User({
        walletAddress: '0xEmptyWallet',
        purchaseIntervalMinutes: 60,
      }).save();

      const response = await fastify.inject({
        method: 'GET',
        url: `/purchases/${newUser.walletAddress}/latest`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent wallet', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/purchases/0xNonExistent/latest',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
