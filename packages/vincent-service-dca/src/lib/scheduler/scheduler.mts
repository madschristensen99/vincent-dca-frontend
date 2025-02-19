import Agenda from 'agenda';
import { User, PurchasedCoin } from '../db/db-schemas.mjs';
import { fetchBaseMemeCoins } from './fetch-base-meme-coins.mjs';

// Initialize Agenda
export const agenda = new Agenda({
  db: {
    address: 'mongodb://localhost:27017/vincent-service-dca',
    collection: 'agendaJobs',
  },
});

// Define the job
agenda.define('buy meme coins on base', async (job) => {
  const users = await User.find();

  for (const user of users) {
    console.log(`Checking for user: ${user.walletAddress}`);

    const lastPurchase = await PurchasedCoin.findOne({
      userId: user._id,
    }).sort({ purchasedAt: -1 });

    const now = new Date();
    const timeSinceLastPurchase = lastPurchase
      ? (now.getTime() - lastPurchase.purchasedAt.getTime()) / 60000
      : Infinity;

    if (
      !lastPurchase ||
      timeSinceLastPurchase >= user.purchaseIntervalMinutes
    ) {
      try {
        // These functions would need to be implemented elsewhere
        const topCoin = await fetchBaseMemeCoins();
        // await executeSwap(user, topCoin);
        console.log(`Purchased ${topCoin.symbol} for ${user.walletAddress}`);
      } catch (error) {
        console.error(`Failed purchase for ${user.walletAddress}:`, error);
      }
    } else {
      console.log(`Skipping user ${user.walletAddress}, not time yet`);
    }
  }
});

// Start function
export async function startScheduler() {
  await agenda.start();
  await agenda.every('5 minutes', 'buy meme coins on base');
  console.log('Scheduler started');
}
