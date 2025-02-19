import { Agenda, Job } from 'agenda';

import { User } from '../models/user.model.mjs';
import { PurchasedCoin } from '../models/purchased-coin.model.mjs';
import { fetchBaseMemeCoins } from '../services/fetch-base-meme-coins.mjs';

// Initialize Agenda
export const agenda = new Agenda({
  db: {
    address:
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/vincent-service-dca',
    collection: 'agendaJobs',
  },
  processEvery: '1 second', // Process as frequently as possible
});

// Define the job
const JOB_NAME = 'check user purchases';

agenda.define(JOB_NAME, async (job: Job) => {
  console.log('\n--- Starting purchase check job ---');
  const users = await User.find();
  console.log(`Found ${users.length} users to check`);

  for (const user of users) {
    console.log(`\nProcessing user: ${user.walletAddress}`);
    console.log(`Purchase interval: ${user.purchaseIntervalSeconds}s`);

    const lastPurchase = await PurchasedCoin.findOne({
      userId: user._id,
    }).sort({ purchasedAt: -1 });

    const now = new Date();
    let timeSinceLastPurchase: number;
    const secondsSinceRegistration =
      (now.getTime() - user.registeredAt.getTime()) / 1000;

    if (lastPurchase) {
      timeSinceLastPurchase =
        (now.getTime() - lastPurchase.purchasedAt.getTime()) / 1000;
      console.log(`Last purchase was ${timeSinceLastPurchase.toFixed(1)}s ago`);
    } else {
      timeSinceLastPurchase = secondsSinceRegistration;
      console.log('No previous purchases found');
    }

    // Calculate how many intervals have passed since registration
    const intervalsPassed = Math.floor(
      secondsSinceRegistration / user.purchaseIntervalSeconds
    );
    const nextIntervalDue =
      (intervalsPassed + 1) * user.purchaseIntervalSeconds;
    const secondsUntilNextInterval = nextIntervalDue - secondsSinceRegistration;

    console.log(
      `Time since registration: ${secondsSinceRegistration.toFixed(1)}s`
    );
    console.log(
      `Next interval due in: ${secondsUntilNextInterval.toFixed(1)}s`
    );

    const shouldPurchase =
      !lastPurchase ||
      (lastPurchase &&
        timeSinceLastPurchase >= user.purchaseIntervalSeconds &&
        secondsUntilNextInterval < 1);

    console.log(`Should purchase? ${shouldPurchase}`);

    if (shouldPurchase) {
      try {
        console.log('Fetching top coin...');
        const topCoin = await fetchBaseMemeCoins();
        console.log('Got top coin:', topCoin);

        // Create a purchase record
        const purchase = new PurchasedCoin({
          userId: user._id,
          coinAddress: topCoin.coinAddress,
          symbol: topCoin.symbol,
          amount: 100, // Mock amount for testing
          priceAtPurchase: parseFloat(topCoin.price),
          txHash: `0x${Math.random().toString(16).slice(2)}`, // Mock transaction hash
          purchasedAt: now,
        });
        await purchase.save();

        console.log(
          `Successfully created purchase record for ${topCoin.symbol}`
        );
      } catch (error) {
        console.error('Purchase failed:', error);
      }
    } else {
      console.log('Skipping purchase - not time yet');
    }
  }
  console.log('\n--- Finished purchase check job ---\n');
});

// Start function
export async function startScheduler() {
  console.log('Starting scheduler with database:', process.env.MONGODB_URI);
  await agenda.start();

  // Schedule the job to run every second
  console.log('Scheduling job to run every second...');
  await agenda.every('1 second', JOB_NAME);

  // Also run it immediately
  console.log('Running job immediately...');
  await agenda.now(JOB_NAME, {});

  // List all jobs
  const jobs = await agenda.jobs({});
  console.log(`Scheduled jobs: ${jobs.length}`);

  console.log('Scheduler started');
}
