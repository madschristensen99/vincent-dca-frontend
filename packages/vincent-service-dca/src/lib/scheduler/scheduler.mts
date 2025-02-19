import { Agenda, Job } from 'agenda';

import { User } from '../models/user.model.mjs';
import { PurchasedCoin } from '../models/purchased-coin.model.mjs';
import { fetchBaseMemeCoins } from '../services/fetch-base-meme-coins.mjs';

// Export a singleton agenda instance that will be configured by the server
export let agenda: Agenda | null = null;

// Function to create and configure a new agenda instance
export function createAgenda(dbUri: string): Agenda {
  agenda = new Agenda({
    db: {
      address: dbUri,
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
        console.log(
          `Last purchase was ${timeSinceLastPurchase.toFixed(1)}s ago`
        );
      } else {
        timeSinceLastPurchase = secondsSinceRegistration;
        console.log('No previous purchases found');
      }

      // Calculate how many intervals have passed since registration
      const intervalsPassed = Math.floor(
        secondsSinceRegistration / user.purchaseIntervalSeconds
      );

      console.log(
        `Time since registration: ${secondsSinceRegistration.toFixed(1)}s`
      );
      console.log(`Intervals passed: ${intervalsPassed}`);

      // We should purchase when:
      // 1. At least one interval has passed
      // 2. Either:
      //    a. This is our first purchase (!lastPurchase), or
      //    b. Enough time has passed since last purchase
      const shouldPurchase =
        intervalsPassed > 0 &&
        (!lastPurchase ||
          timeSinceLastPurchase >= user.purchaseIntervalSeconds);

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

  return agenda;
}

// Start function
export async function startScheduler() {
  if (!agenda) {
    throw new Error('Agenda not initialized. Call createAgenda first.');
  }

  console.log('Starting scheduler...');
  await agenda.start();

  // Schedule the job to run every second
  console.log('Scheduling job to run every second...');
  await agenda.every('1 second', 'check user purchases');

  // Also run it immediately
  console.log('Running job immediately...');
  await agenda.now('check user purchases', {});

  // List all jobs
  const jobs = await agenda.jobs({});
  console.log(`Scheduled jobs: ${jobs.length}`);

  console.log('Scheduler started');
}

// Stop function to gracefully shutdown the scheduler
export async function stopScheduler() {
  if (!agenda) {
    return;
  }

  try {
    // Cancel all jobs
    await agenda.cancel({});

    // Wait for running jobs to complete with a timeout
    const timeoutPromise = new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 3000);
      timer.unref(); // Allow the process to exit even if this timer is still running
    });

    await Promise.race([
      new Promise<void>((resolve) => {
        if (!agenda) {
          resolve();
          return;
        }

        // Listen for both success and failure events
        agenda.once('success', () => {
          resolve();
        });
        agenda.once('fail', () => {
          resolve();
        });

        // If no jobs are running, resolve immediately
        agenda.jobs({}).then((jobs) => {
          if (!jobs || jobs.length === 0) {
            resolve();
          }
        });
      }),
      timeoutPromise,
    ]);

    // Stop the scheduler
    if (agenda) {
      await agenda.stop();

      // Close MongoDB connection if it exists
      const mongoClient = (agenda as any)._mdb?.client;
      if (mongoClient) {
        await mongoClient.close();
      }
    }
  } catch (error) {
    console.error('Error stopping scheduler:', error);
  } finally {
    // Clear the agenda instance to allow garbage collection
    agenda = null;
  }
}
